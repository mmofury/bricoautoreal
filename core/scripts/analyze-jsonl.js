const fs = require('fs');
const readline = require('readline');

async function analyzeJSONL(filePath) {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  const sampleProducts = [];
  const manufacturers = new Set();
  const modelNames = new Set();
  const specificationKeys = new Set();
  const oemBrands = new Set();
  let totalCompatibleCars = 0;
  let maxCompatibleCars = 0;
  let minCompatibleCars = Infinity;

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const product = JSON.parse(line);
        lineCount++;

        if (sampleProducts.length < 3) {
          sampleProducts.push(product);
        }

        // Parse compatible cars
        try {
          if (product.supabase.compatible_cars && product.supabase.compatible_cars !== "null" && product.supabase.compatible_cars !== "''") {
            // Remove outer quotes and fix escaped quotes
            let compatibleCarsStr = product.supabase.compatible_cars.trim();
            // Remove leading and trailing single quotes
            if (compatibleCarsStr.startsWith("'") && compatibleCarsStr.endsWith("'")) {
              compatibleCarsStr = compatibleCarsStr.slice(1, -1);
            }
            // Replace escaped single quotes with regular quotes for JSON keys/values
            compatibleCarsStr = compatibleCarsStr.replace(/''/g, "'");
            const compatibleCars = JSON.parse(compatibleCarsStr);
            if (Array.isArray(compatibleCars)) {
              const carCount = compatibleCars.length;
              totalCompatibleCars += carCount;
              maxCompatibleCars = Math.max(maxCompatibleCars, carCount);
              minCompatibleCars = Math.min(minCompatibleCars, carCount);

              compatibleCars.forEach((car) => {
                if (car && car.manufacturerName) manufacturers.add(car.manufacturerName);
                if (car && car.modelName) modelNames.add(car.modelName);
              });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }

        // Parse specifications
        try {
          if (product.supabase.all_specifications && product.supabase.all_specifications !== "null" && product.supabase.all_specifications !== "''") {
            let specsStr = product.supabase.all_specifications.trim();
            if (specsStr.startsWith("'") && specsStr.endsWith("'")) {
              specsStr = specsStr.slice(1, -1);
            }
            specsStr = specsStr.replace(/''/g, "'");
            const specs = JSON.parse(specsStr);
            if (Array.isArray(specs)) {
              specs.forEach((spec) => {
                if (spec && spec.criteriaName) specificationKeys.add(spec.criteriaName);
              });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }

        // Parse OEM numbers
        try {
          if (product.supabase.oem_numbers && product.supabase.oem_numbers !== "null" && product.supabase.oem_numbers !== "''") {
            let oemsStr = product.supabase.oem_numbers.trim();
            if (oemsStr.startsWith("'") && oemsStr.endsWith("'")) {
              oemsStr = oemsStr.slice(1, -1);
            }
            oemsStr = oemsStr.replace(/''/g, "'");
            const oems = JSON.parse(oemsStr);
            if (Array.isArray(oems)) {
              oems.forEach((oem) => {
                if (oem && oem.oemBrand) oemBrands.add(oem.oemBrand);
              });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      } catch (error) {
        console.error(`Erreur ligne ${lineCount + 1}:`, error.message);
      }
    }
  }

  console.log('=== ANALYSE DU FICHIER JSONL ===\n');
  console.log(`Nombre total de produits: ${lineCount}\n`);

  console.log('=== STRUCTURE DES DONNÉES ===');
  if (sampleProducts.length > 0) {
    const sample = sampleProducts[0];
    console.log('\nExemple de produit (tronqué):');
    const sampleStr = JSON.stringify(sample, null, 2);
    console.log(sampleStr.substring(0, 2000));
    console.log('...\n');
  }

  console.log('=== STATISTIQUES COMPATIBILITÉ VÉHICULES ===');
  console.log(`Nombre total de compatibilités: ${totalCompatibleCars}`);
  console.log(`Moyenne par produit: ${(totalCompatibleCars / lineCount).toFixed(2)}`);
  console.log(`Maximum: ${maxCompatibleCars}`);
  console.log(`Minimum: ${minCompatibleCars}`);
  console.log(`\nNombre de constructeurs uniques: ${manufacturers.size}`);
  console.log(`Nombre de modèles uniques: ${modelNames.size}`);

  console.log('\n=== CONSTRUCTEURS (échantillon - 20 premiers) ===');
  Array.from(manufacturers).slice(0, 20).forEach((m) => console.log(`  - ${m}`));

  console.log('\n=== CLÉS DE SPÉCIFICATIONS ===');
  Array.from(specificationKeys).forEach((key) => console.log(`  - ${key}`));

  console.log('\n=== MARQUES OEM (échantillon - 20 premières) ===');
  Array.from(oemBrands).slice(0, 20).forEach((brand) => console.log(`  - ${brand}`));

  console.log('\n=== PROPOSITION DE SCHÉMA BASE DE DONNÉES ===\n');
  console.log(`
Tables proposées:

1. products
   - id (PK, auto)
   - article_no (unique, index)
   - csv_id
   - supplier_name
   - product_name
   - ean_number
   - description
   - package_weight
   - package_height
   - package_width
   - package_length
   - bigcommerce_product_id (FK vers BigCommerce, nullable)
   - created_at
   - updated_at

2. product_specifications
   - id (PK, auto)
   - product_id (FK)
   - criteria_name
   - criteria_value
   - created_at

3. product_oem_numbers
   - id (PK, auto)
   - product_id (FK)
   - oem_brand
   - oem_display_no
   - created_at

4. manufacturers
   - id (PK, auto)
   - name (unique)
   - created_at

5. vehicle_models
   - id (PK, auto)
   - model_id (index, unique)
   - model_name
   - manufacturer_id (FK)
   - created_at

6. vehicles
   - id (PK, auto)
   - vehicle_id (index, unique)
   - model_id (FK)
   - type_engine_name
   - construction_interval_start (date, nullable)
   - construction_interval_end (date, nullable)
   - created_at

7. product_vehicle_compatibility
   - id (PK, auto)
   - product_id (FK, index)
   - vehicle_id (FK, index)
   - created_at
   - UNIQUE(product_id, vehicle_id)

8. product_images
   - id (PK, auto)
   - product_id (FK)
   - image_url
   - image_filename
   - created_at
  `);
}

const filePath = process.argv[2] || 'C:\\Users\\yohan\\bricoauto\\merged_products.jsonl';
analyzeJSONL(filePath).catch(console.error);

