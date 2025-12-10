import * as fs from 'fs';
import * as path from 'path';

interface ProductName {
  productId: number;
  productName: string;
}

/**
 * Normalise un nom de produit pour la recherche (enlève apostrophes et accents)
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // Enlever apostrophes
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');
}

/**
 * Crée un index pour accélérer la recherche de produits
 */
function createProductIndex(productNames: ProductName[]): {
  exactMatch: Map<string, ProductName>;
  normalizedMatch: Map<string, ProductName>;
} {
  const exactMatch = new Map<string, ProductName>();
  const normalizedMatch = new Map<string, ProductName>();
  
  for (const product of productNames) {
    // Index par nom exact (lowercase)
    const exactKey = product.productName.toLowerCase();
    if (!exactMatch.has(exactKey)) {
      exactMatch.set(exactKey, product);
    }
    
    // Index par nom normalisé (sans apostrophes/accents)
    const normalizedKey = normalizeProductName(product.productName);
    if (!normalizedMatch.has(normalizedKey)) {
      normalizedMatch.set(normalizedKey, product);
    }
  }
  
  return { exactMatch, normalizedMatch };
}

/**
 * Trouve le nom exact avec apostrophes depuis productnames.json
 */
function findExactName(
  productName: string, 
  index: { exactMatch: Map<string, ProductName>; normalizedMatch: Map<string, ProductName>; }
): string | null {
  // Essayer d'abord un match exact (insensible à la casse)
  const exactKey = productName.toLowerCase();
  const exactMatch = index.exactMatch.get(exactKey);
  
  if (exactMatch) {
    return exactMatch.productName;
  }
  
  // Si pas de match exact, chercher un match normalisé (sans apostrophes/accents)
  const normalizedKey = normalizeProductName(productName);
  const fuzzyMatch = index.normalizedMatch.get(normalizedKey);
  
  if (fuzzyMatch) {
    return fuzzyMatch.productName;
  }
  
  return null;
}

/**
 * Charge le fichier product-names-list.txt
 */
function loadProductNamesList(filePath: string): Array<{ number: number; name: string }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Ignorer la première ligne (Total: ...)
  const productLines = lines.slice(1);
  
  const products: Array<{ number: number; name: string }> = [];
  
  for (const line of productLines) {
    const match = line.match(/^(\d+)\.\s*(.+)$/);
    if (match && match[1] && match[2]) {
      products.push({
        number: parseInt(match[1], 10),
        name: match[2].trim(),
      });
    }
  }

  return products;
}

/**
 * Charge le fichier productnames.json
 */
function loadProductNames(): ProductName[] {
  const possiblePaths = [
    path.join(process.cwd(), 'productnames.json'),
    path.resolve(process.cwd(), '..', 'productnames.json'),
    path.resolve(__dirname, '..', '..', 'productnames.json'),
  ];

  let productNamesPath: string | null = null;
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      productNamesPath = tryPath;
      break;
    }
  }

  if (!productNamesPath) {
    throw new Error(`Fichier productnames.json introuvable`);
  }

  const fileContent = fs.readFileSync(productNamesPath, 'utf-8');
  return JSON.parse(fileContent) as ProductName[];
}

/**
 * Fonction principale
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🔧 CORRECTION DES APOSTROPHES DANS product-names-list.txt');
  console.log('='.repeat(80));
  console.log();

  // Charger les fichiers
  console.log('📂 Chargement des fichiers...');
  const listPath = path.join(process.cwd(), 'product-names-list.txt');
  const productsList = loadProductNamesList(listPath);
  console.log(`✅ ${productsList.length} produits dans la liste`);

  const productNames = loadProductNames();
  console.log(`✅ ${productNames.length} produits dans productnames.json`);

  // Créer l'index
  console.log('🔨 Création de l\'index...');
  const productIndex = createProductIndex(productNames);
  console.log(`✅ Index créé`);
  console.log();

  // Corriger les noms
  console.log('🔍 Correction des apostrophes...');
  let correctedCount = 0;
  let notFoundCount = 0;
  const correctedProducts: Array<{ number: number; original: string; corrected: string }> = [];

  for (const product of productsList) {
    const exactName = findExactName(product.name, productIndex);
    
    if (exactName && exactName !== product.name) {
      correctedCount++;
      correctedProducts.push({
        number: product.number,
        original: product.name,
        corrected: exactName,
      });
      product.name = exactName; // Mettre à jour le nom
    } else if (!exactName) {
      notFoundCount++;
    }
  }

  console.log(`✅ ${correctedCount} noms corrigés`);
  if (notFoundCount > 0) {
    console.log(`⚠️  ${notFoundCount} noms non trouvés dans productnames.json`);
  }
  console.log();

  // Afficher quelques exemples de corrections
  if (correctedProducts.length > 0) {
    console.log('📝 Exemples de corrections:');
    correctedProducts.slice(0, 10).forEach(({ original, corrected }) => {
      console.log(`   "${original}" → "${corrected}"`);
    });
    if (correctedProducts.length > 10) {
      console.log(`   ... et ${correctedProducts.length - 10} autres`);
    }
    console.log();
  }

  // Sauvegarder le fichier corrigé
  const outputPath = path.join(process.cwd(), 'product-names-list-corrected.txt');
  const lines: string[] = [];
  lines.push(`Total: ${productsList.length} noms de produits uniques`);
  lines.push('');
  
  for (const product of productsList) {
    lines.push(`${product.number}. ${product.name}`);
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`💾 Fichier corrigé sauvegardé: ${outputPath}`);

  // Proposer de remplacer l'original
  console.log();
  console.log('='.repeat(80));
  console.log('✅ CORRECTION TERMINÉE');
  console.log('='.repeat(80));
  console.log(`📝 ${correctedCount} noms corrigés sur ${productsList.length}`);
  console.log(`💾 Fichier corrigé: ${outputPath}`);
  console.log();
  console.log('💡 Pour remplacer le fichier original, renommez-le:');
  console.log(`   mv product-names-list.txt product-names-list-backup.txt`);
  console.log(`   mv product-names-list-corrected.txt product-names-list.txt`);
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});


















