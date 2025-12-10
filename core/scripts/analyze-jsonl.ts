import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

interface CompatibleCar {
  modelId: number;
  modelName: string;
  vehicleId: number;
  typeEngineName: string;
  manufacturerName: string;
  constructionIntervalStart: string | null;
  constructionIntervalEnd: string | null;
}

interface Specification {
  criteriaName: string;
  criteriaValue: string;
}

interface OEMNumber {
  oemBrand: string;
  oemDisplayNo: string;
}

interface ProductData {
  articleNo: string;
  csvId: string;
  supplierName: string;
  articleProductName: string;
  eanNumber: string | null;
  csv: {
    barcode: string;
    description: string;
    package_weight: string;
    package_height: string;
    package_width: string;
    package_length: string;
    lang: string;
  };
  supabase: {
    all_specifications: string; // JSON string
    oem_numbers: string; // JSON string
    compatible_cars: string; // JSON string
    images: string; // JSON string
    full_data: string; // JSON string
  };
}

async function analyzeJSONL(filePath: string) {
  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  const sampleProducts: ProductData[] = [];
  const manufacturers = new Set<string>();
  const modelNames = new Set<string>();
  const specificationKeys = new Set<string>();
  const oemBrands = new Set<string>();
  let totalCompatibleCars = 0;
  let maxCompatibleCars = 0;
  let minCompatibleCars = Infinity;

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const product: ProductData = JSON.parse(line);
        lineCount++;

        if (sampleProducts.length < 3) {
          sampleProducts.push(product);
        }

        // Parse compatible cars
        try {
          const compatibleCarsStr = product.supabase.compatible_cars
            .replace(/'/g, '"')
            .replace(/None/g, 'null');
          const compatibleCars: CompatibleCar[] = JSON.parse(compatibleCarsStr);
          const carCount = compatibleCars.length;
          totalCompatibleCars += carCount;
          maxCompatibleCars = Math.max(maxCompatibleCars, carCount);
          minCompatibleCars = Math.min(minCompatibleCars, carCount);

          compatibleCars.forEach((car) => {
            if (car.manufacturerName) manufacturers.add(car.manufacturerName);
            if (car.modelName) modelNames.add(car.modelName);
          });
        } catch (e) {
          // Ignore parsing errors for compatible cars
        }

        // Parse specifications
        try {
          const specsStr = product.supabase.all_specifications
            .replace(/'/g, '"')
            .replace(/None/g, 'null');
          const specs: Specification[] = JSON.parse(specsStr);
          specs.forEach((spec) => {
            if (spec.criteriaName) specificationKeys.add(spec.criteriaName);
          });
        } catch (e) {
          // Ignore parsing errors for specifications
        }

        // Parse OEM numbers
        try {
          const oemsStr = product.supabase.oem_numbers
            .replace(/'/g, '"')
            .replace(/None/g, 'null');
          const oems: OEMNumber[] = JSON.parse(oemsStr);
          oems.forEach((oem) => {
            if (oem.oemBrand) oemBrands.add(oem.oemBrand);
          });
        } catch (e) {
          // Ignore parsing errors for OEM numbers
        }
      } catch (error) {
        console.error(`Erreur ligne ${lineCount + 1}:`, error);
      }
    }
  }

  console.log('=== ANALYSE DU FICHIER JSONL ===\n');
  console.log(`Nombre total de produits: ${lineCount}\n`);

  console.log('=== STRUCTURE DES DONNÉES ===');
  if (sampleProducts.length > 0) {
    const sample = sampleProducts[0];
    console.log('\nExemple de produit:');
    console.log(JSON.stringify(sample, null, 2).substring(0, 2000));
  }

  console.log('\n=== STATISTIQUES COMPATIBILITÉ VÉHICULES ===');
  console.log(`Nombre total de compatibilités: ${totalCompatibleCars}`);
  console.log(`Moyenne par produit: ${(totalCompatibleCars / lineCount).toFixed(2)}`);
  console.log(`Maximum: ${maxCompatibleCars}`);
  console.log(`Minimum: ${minCompatibleCars}`);
  console.log(`\nNombre de constructeurs uniques: ${manufacturers.size}`);
  console.log(`Nombre de modèles uniques: ${modelNames.size}`);

  console.log('\n=== CONSTRUCTEURS (échantillon) ===');
  Array.from(manufacturers).slice(0, 20).forEach((m) => console.log(`  - ${m}`));

  console.log('\n=== CLÉS DE SPÉCIFICATIONS ===');
  Array.from(specificationKeys).forEach((key) => console.log(`  - ${key}`));

  console.log('\n=== MARQUES OEM ===');
  Array.from(oemBrands).forEach((brand) => console.log(`  - ${brand}`));

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
   - bigcommerce_product_id (FK vers BigCommerce)
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
   - model_id (index)
   - model_name
   - manufacturer_id (FK)
   - created_at

6. vehicles
   - id (PK, auto)
   - vehicle_id (index)
   - model_id (FK)
   - type_engine_name
   - construction_interval_start
   - construction_interval_end
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

