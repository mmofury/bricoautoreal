const fs = require('fs');
const readline = require('readline');

/**
 * Script d'importation JSONL vers base de données
 * 
 * Ce script lit le fichier JSONL et génère des requêtes SQL pour l'importation
 * ou peut être adapté pour utiliser un ORM (Prisma, Drizzle, etc.)
 * 
 * Usage:
 *   node import-jsonl-to-db.js <fichier.jsonl> [batch_size]
 */

class DatabaseImporter {
  constructor(batchSize = 1000) {
    this.batchSize = batchSize;
    this.manufacturers = new Map(); // name -> id
    this.vehicleModels = new Map(); // model_id -> id
    this.vehicles = new Map(); // vehicle_id -> id
    this.products = new Map(); // article_no -> id
    this.stats = {
      products: 0,
      manufacturers: 0,
      vehicleModels: 0,
      vehicles: 0,
      compatibilities: 0,
      specifications: 0,
      oemNumbers: 0,
      images: 0,
      errors: 0
    };
  }

  parseJsonString(str) {
    if (!str || str === "null" || str === "''" || str === "[]") {
      return null;
    }
    try {
      let cleaned = str.trim();
      if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        cleaned = cleaned.slice(1, -1);
      }
      cleaned = cleaned.replace(/''/g, "'");
      return JSON.parse(cleaned);
    } catch (e) {
      return null;
    }
  }

  async processProduct(product) {
    try {
      // 1. Créer ou récupérer le produit
      const productData = {
        article_no: product.articleNo,
        csv_id: product.csvId,
        supplier_name: product.supplierName?.replace(/'/g, '') || null,
        product_name: product.articleProductName?.replace(/'/g, '') || null,
        ean_number: product.eanNumber || null,
        description: product.csv?.description || null,
        package_weight: product.csv?.package_weight ? parseFloat(product.csv.package_weight) : null,
        package_height: product.csv?.package_height ? parseFloat(product.csv.package_height) : null,
        package_width: product.csv?.package_width ? parseFloat(product.csv.package_width) : null,
        package_length: product.csv?.package_length ? parseFloat(product.csv.package_length) : null,
        bigcommerce_product_id: null // À remplir lors de la synchronisation avec BigCommerce
      };

      // 2. Parser les données Supabase
      const compatibleCars = this.parseJsonString(product.supabase?.compatible_cars) || [];
      const specifications = this.parseJsonString(product.supabase?.all_specifications) || [];
      const oemNumbers = this.parseJsonString(product.supabase?.oem_numbers) || [];
      const images = this.parseJsonString(product.supabase?.images) || [];

      // 3. Traiter les constructeurs et modèles
      const processedCars = [];
      for (const car of compatibleCars) {
        if (!car.manufacturerName || !car.modelId || !car.vehicleId) continue;

        // Créer/récupérer constructeur
        if (!this.manufacturers.has(car.manufacturerName)) {
          this.manufacturers.set(car.manufacturerName, this.manufacturers.size + 1);
          this.stats.manufacturers++;
        }
        const manufacturerId = this.manufacturers.get(car.manufacturerName);

        // Créer/récupérer modèle
        const modelKey = `${car.modelId}`;
        if (!this.vehicleModels.has(modelKey)) {
          this.vehicleModels.set(modelKey, {
            model_id: car.modelId,
            model_name: car.modelName,
            manufacturer_id: manufacturerId
          });
          this.stats.vehicleModels++;
        }

        // Créer/récupérer véhicule
        const vehicleKey = `${car.vehicleId}`;
        if (!this.vehicles.has(vehicleKey)) {
          this.vehicles.set(vehicleKey, {
            vehicle_id: car.vehicleId,
            model_id: car.modelId,
            type_engine_name: car.typeEngineName || null,
            construction_interval_start: car.constructionIntervalStart || null,
            construction_interval_end: car.constructionIntervalEnd || null
          });
          this.stats.vehicles++;
        }

        processedCars.push(car.vehicleId);
      }

      // 4. Stocker les données du produit
      this.products.set(product.articleNo, {
        product: productData,
        compatibilities: processedCars,
        specifications: specifications,
        oemNumbers: oemNumbers,
        images: images
      });

      this.stats.products++;
      this.stats.compatibilities += processedCars.length;
      this.stats.specifications += specifications.length;
      this.stats.oemNumbers += oemNumbers.length;
      this.stats.images += images.length;

      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`Erreur traitement produit ${product.articleNo}:`, error.message);
      return false;
    }
  }

  generateSQL() {
    const sql = [];
    
    // 1. Manufacturers
    sql.push('-- Manufacturers');
    for (const [name, id] of this.manufacturers.entries()) {
      sql.push(`INSERT INTO manufacturers (id, name) VALUES (${id}, '${name.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING;`);
    }

    // 2. Vehicle Models
    sql.push('\n-- Vehicle Models');
    for (const [key, model] of this.vehicleModels.entries()) {
      const manufacturerId = model.manufacturer_id;
      sql.push(`INSERT INTO vehicle_models (model_id, model_name, manufacturer_id) VALUES (${model.model_id}, '${model.model_name.replace(/'/g, "''")}', ${manufacturerId}) ON CONFLICT (model_id) DO NOTHING;`);
    }

    // 3. Vehicles
    sql.push('\n-- Vehicles');
    for (const [key, vehicle] of this.vehicles.entries()) {
      const modelId = vehicle.model_id;
      const startDate = vehicle.construction_interval_start ? `'${vehicle.construction_interval_start}'` : 'NULL';
      const endDate = vehicle.construction_interval_end ? `'${vehicle.construction_interval_end}'` : 'NULL';
      const engineName = vehicle.type_engine_name ? `'${vehicle.type_engine_name.replace(/'/g, "''")}'` : 'NULL';
      sql.push(`INSERT INTO vehicles (vehicle_id, model_id, type_engine_name, construction_interval_start, construction_interval_end) VALUES (${vehicle.vehicle_id}, ${modelId}, ${engineName}, ${startDate}, ${endDate}) ON CONFLICT (vehicle_id) DO NOTHING;`);
    }

    // 4. Products (nécessite des IDs séquentiels)
    sql.push('\n-- Products');
    let productId = 1;
    const productIdMap = new Map();
    for (const [articleNo, data] of this.products.entries()) {
      productIdMap.set(articleNo, productId);
      const p = data.product;
      const values = [
        productId,
        `'${p.article_no.replace(/'/g, "''")}'`,
        p.csv_id ? `'${p.csv_id.replace(/'/g, "''")}'` : 'NULL',
        p.supplier_name ? `'${p.supplier_name.replace(/'/g, "''")}'` : 'NULL',
        p.product_name ? `'${p.product_name.replace(/'/g, "''")}'` : 'NULL',
        p.ean_number ? `'${p.ean_number}'` : 'NULL',
        p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL',
        p.package_weight || 'NULL',
        p.package_height || 'NULL',
        p.package_width || 'NULL',
        p.package_length || 'NULL',
        p.bigcommerce_product_id || 'NULL'
      ];
      sql.push(`INSERT INTO products (id, article_no, csv_id, supplier_name, product_name, ean_number, description, package_weight, package_height, package_width, package_length, bigcommerce_product_id) VALUES (${values.join(', ')}) ON CONFLICT (article_no) DO NOTHING;`);
      productId++;
    }

    // 5. Product Specifications
    sql.push('\n-- Product Specifications');
    for (const [articleNo, data] of this.products.entries()) {
      const productId = productIdMap.get(articleNo);
      for (const spec of data.specifications) {
        if (spec.criteriaName && spec.criteriaValue !== undefined) {
          sql.push(`INSERT INTO product_specifications (product_id, criteria_name, criteria_value) VALUES (${productId}, '${spec.criteriaName.replace(/'/g, "''")}', '${String(spec.criteriaValue).replace(/'/g, "''")}');`);
        }
      }
    }

    // 6. Product OEM Numbers
    sql.push('\n-- Product OEM Numbers');
    for (const [articleNo, data] of this.products.entries()) {
      const productId = productIdMap.get(articleNo);
      for (const oem of data.oemNumbers) {
        if (oem.oemBrand && oem.oemDisplayNo) {
          sql.push(`INSERT INTO product_oem_numbers (product_id, oem_brand, oem_display_no) VALUES (${productId}, '${oem.oemBrand.replace(/'/g, "''")}', '${oem.oemDisplayNo.replace(/'/g, "''")}');`);
        }
      }
    }

    // 7. Product Vehicle Compatibility
    sql.push('\n-- Product Vehicle Compatibility');
    for (const [articleNo, data] of this.products.entries()) {
      const productId = productIdMap.get(articleNo);
      for (const vehicleId of data.compatibilities) {
        sql.push(`INSERT INTO product_vehicle_compatibility (product_id, vehicle_id) VALUES (${productId}, ${vehicleId}) ON CONFLICT (product_id, vehicle_id) DO NOTHING;`);
      }
    }

    // 8. Product Images
    sql.push('\n-- Product Images');
    for (const [articleNo, data] of this.products.entries()) {
      const productId = productIdMap.get(articleNo);
      for (const image of data.images) {
        if (image.url || image.filename) {
          const url = image.url ? `'${image.url.replace(/'/g, "''")}'` : 'NULL';
          const filename = image.filename ? `'${image.filename.replace(/'/g, "''")}'` : 'NULL';
          sql.push(`INSERT INTO product_images (product_id, image_url, image_filename) VALUES (${productId}, ${url}, ${filename});`);
        }
      }
    }

    return sql.join('\n');
  }

  printStats() {
    console.log('\n=== STATISTIQUES D\'IMPORTATION ===');
    console.log(`Produits traités: ${this.stats.products}`);
    console.log(`Constructeurs: ${this.stats.manufacturers}`);
    console.log(`Modèles de véhicules: ${this.stats.vehicleModels}`);
    console.log(`Véhicules: ${this.stats.vehicles}`);
    console.log(`Compatibilités: ${this.stats.compatibilities}`);
    console.log(`Spécifications: ${this.stats.specifications}`);
    console.log(`Numéros OEM: ${this.stats.oemNumbers}`);
    console.log(`Images: ${this.stats.images}`);
    console.log(`Erreurs: ${this.stats.errors}`);
  }
}

async function importJSONL(filePath, batchSize = 1000, outputFile = null) {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const importer = new DatabaseImporter(batchSize);
  let lineCount = 0;
  let processedCount = 0;

  console.log(`Démarrage de l'importation depuis: ${filePath}`);
  console.log(`Taille du batch: ${batchSize}\n`);

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const product = JSON.parse(line);
        await importer.processProduct(product);
        processedCount++;

        if (processedCount % 1000 === 0) {
          console.log(`Traités: ${processedCount} produits...`);
        }
      } catch (error) {
        console.error(`Erreur ligne ${lineCount + 1}:`, error.message);
      }
    }
    lineCount++;
  }

  importer.printStats();

  if (outputFile) {
    const sql = importer.generateSQL();
    fs.writeFileSync(outputFile, sql, 'utf-8');
    console.log(`\nFichier SQL généré: ${outputFile}`);
  } else {
    console.log('\n=== PREMIÈRES LIGNES SQL ===');
    const sql = importer.generateSQL();
    console.log(sql.split('\n').slice(0, 50).join('\n'));
    console.log('\n... (tronqué)');
  }
}

const filePath = process.argv[2] || 'C:\\Users\\yohan\\bricoauto\\merged_products.jsonl';
const batchSize = parseInt(process.argv[3]) || 1000;
const outputFile = process.argv[4] || null;

console.log('⚠️  ATTENTION: Ce script charge tout en mémoire.');
console.log('Pour un fichier de 821k produits, utilisez un traitement par batch avec un vrai ORM.\n');

importJSONL(filePath, batchSize, outputFile).catch(console.error);


































