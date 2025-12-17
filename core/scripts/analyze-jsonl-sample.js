const fs = require('fs');
const readline = require('readline');

async function analyzeJSONLSample(filePath, sampleSize = 1000) {
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
  let parseErrors = 0;

  console.log(`Analyse d'un échantillon de ${sampleSize} produits...\n`);

  for await (const line of rl) {
    if (line.trim() && lineCount < sampleSize) {
      try {
        const product = JSON.parse(line);
        lineCount++;

        if (sampleProducts.length < 3) {
          sampleProducts.push(product);
        }

        // Parse compatible cars
        try {
          if (product.supabase && product.supabase.compatible_cars && 
              product.supabase.compatible_cars !== "null" && 
              product.supabase.compatible_cars !== "''" &&
              product.supabase.compatible_cars !== "[]") {
            let compatibleCarsStr = product.supabase.compatible_cars.trim();
            if (compatibleCarsStr.startsWith("'") && compatibleCarsStr.endsWith("'")) {
              compatibleCarsStr = compatibleCarsStr.slice(1, -1);
            }
            compatibleCarsStr = compatibleCarsStr.replace(/''/g, "'");
            const compatibleCars = JSON.parse(compatibleCarsStr);
            if (Array.isArray(compatibleCars) && compatibleCars.length > 0) {
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
          parseErrors++;
        }

        // Parse specifications
        try {
          if (product.supabase && product.supabase.all_specifications && 
              product.supabase.all_specifications !== "null" && 
              product.supabase.all_specifications !== "''") {
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
          // Ignore
        }

        // Parse OEM numbers
        try {
          if (product.supabase && product.supabase.oem_numbers && 
              product.supabase.oem_numbers !== "null" && 
              product.supabase.oem_numbers !== "''" &&
              product.supabase.oem_numbers !== "[]") {
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
          // Ignore
        }
      } catch (error) {
        parseErrors++;
      }
    }
    if (lineCount >= sampleSize) break;
  }

  console.log('=== ANALYSE D\'ÉCHANTILLON ===\n');
  console.log(`Produits analysés: ${lineCount}`);
  console.log(`Erreurs de parsing: ${parseErrors}\n`);

  if (sampleProducts.length > 0) {
    console.log('=== EXEMPLE DE PRODUIT ===');
    const sample = sampleProducts[0];
    console.log(`Article No: ${sample.articleNo}`);
    console.log(`Fournisseur: ${sample.supplierName}`);
    console.log(`Produit: ${sample.articleProductName}`);
    console.log(`EAN: ${sample.eanNumber || 'N/A'}`);
  }

  console.log('\n=== STATISTIQUES COMPATIBILITÉ VÉHICULES ===');
  console.log(`Nombre total de compatibilités: ${totalCompatibleCars}`);
  if (lineCount > 0) {
    console.log(`Moyenne par produit: ${(totalCompatibleCars / lineCount).toFixed(2)}`);
  }
  console.log(`Maximum: ${maxCompatibleCars}`);
  console.log(`Minimum: ${minCompatibleCars === Infinity ? 0 : minCompatibleCars}`);
  console.log(`\nNombre de constructeurs uniques: ${manufacturers.size}`);
  console.log(`Nombre de modèles uniques: ${modelNames.size}`);

  if (manufacturers.size > 0) {
    console.log('\n=== CONSTRUCTEURS (échantillon - 20 premiers) ===');
    Array.from(manufacturers).slice(0, 20).forEach((m) => console.log(`  - ${m}`));
  }

  if (specificationKeys.size > 0) {
    console.log('\n=== CLÉS DE SPÉCIFICATIONS ===');
    Array.from(specificationKeys).forEach((key) => console.log(`  - ${key}`));
  }

  if (oemBrands.size > 0) {
    console.log('\n=== MARQUES OEM (échantillon - 20 premières) ===');
    Array.from(oemBrands).slice(0, 20).forEach((brand) => console.log(`  - ${brand}`));
  }
}

const filePath = process.argv[2] || 'C:\\Users\\yohan\\bricoauto\\merged_products.jsonl';
const sampleSize = parseInt(process.argv[3]) || 1000;
analyzeJSONLSample(filePath, sampleSize).catch(console.error);


































