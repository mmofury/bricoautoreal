import * as fs from 'fs';
import * as path from 'path';

interface ProductName {
  productId: number;
  productName: string;
}

interface TecDocCategory {
  categoryId: number | null;
  categoryName: string;
  level: number;
  children: Record<string, TecDocCategory>;
  productId?: number;
}

interface TecDocResponse {
  [key: string]: TecDocCategory;
}

interface ArborescencePath {
  path: string[];
  categoryIds: (number | null)[];
  finalCategoryId: number | null;
  productId?: number;
}

interface ProductResult {
  productName: string;
  productId?: number;
  searchText: string;
  found: boolean;
  hasMatch: boolean;
  arborescence?: TecDocResponse;
  arborescenceText?: string;
  arborescencePaths?: ArborescencePath[];
  productIdsInArbo?: number[];
  matchedProductIds?: number[];
  closestProductIds?: Array<{
    productId: number;
    productName: string;
  }>;
  error?: string;
  timestamp: string;
}

interface ProgressTracker {
  total: number;
  processed: number;
  batchSize: number;
  lastProcessedIndex: number;
  timestamp: string;
}

// Configuration de l'API TecDoc
const TECDOC_API_KEY = '8dfaae4fb2msh88f294b47a23e72p1d63fcjsn02184b022654';
const TECDOC_BASE_URL = 'https://tecdoc-catalog.p.rapidapi.com';
const TYPE_ID = 1;
const LANG_ID = 6;
const REQUEST_DELAY = 500; // 500ms entre les requêtes
const BATCH_SIZE = 100; // Traiter 100 produits par lot

/**
 * Charge le fichier product-names-list.txt et extrait les noms de produits
 */
function loadProductNamesList(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const productLines = lines.slice(1); // Ignorer la première ligne (Total: ...)
  
  const products: string[] = [];
  for (const line of productLines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match && match[1]) {
      products.push(match[1].trim());
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
 * Effectue une recherche dans l'API TecDoc
 */
async function searchTecDoc(searchText: string): Promise<TecDocResponse | null> {
  try {
    const encodedSearchText = encodeURIComponent(searchText);
    const url = `${TECDOC_BASE_URL}/category/search-for-the-commodity-group-tree-by-description/type-id/${TYPE_ID}/lang-id/${LANG_ID}/search-text/${encodedSearchText}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tecdoc-catalog.p.rapidapi.com',
        'x-rapidapi-key': TECDOC_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as TecDocResponse;
    
    if (Array.isArray(data) && data.length === 0) {
      return null;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Parcourt récursivement l'arborescence pour extraire tous les productId
 */
function extractProductIds(arborescence: TecDocResponse): number[] {
  const productIds = new Set<number>();

  function traverse(category: TecDocCategory) {
    if (category.productId) {
      productIds.add(category.productId);
    }
    for (const child of Object.values(category.children)) {
      traverse(child);
    }
  }

  for (const rootCategory of Object.values(arborescence)) {
    traverse(rootCategory);
  }

  return Array.from(productIds).sort((a, b) => a - b);
}

/**
 * Génère une représentation textuelle de l'arborescence
 */
function formatCategoryTree(category: TecDocCategory, indent: string = '', isLast: boolean = true): string {
  const lines: string[] = [];
  const marker = isLast ? '└── ' : '├── ';
  const categoryIdStr = category.categoryId ? ` [ID: ${category.categoryId}]` : '';
  const productIdStr = category.productId ? ` → ProductId: ${category.productId}` : '';
  
  lines.push(`${indent}${marker}${category.categoryName}${categoryIdStr} (Niveau ${category.level})${productIdStr}`);
  
  if (Object.keys(category.children).length > 0) {
    const newIndent = indent + (isLast ? '    ' : '│   ');
    const childEntries = Object.entries(category.children);
    childEntries.forEach(([childKey, childCategory], childIndex) => {
      const isLastChild = childIndex === childEntries.length - 1;
      lines.push(formatCategoryTree(childCategory, newIndent, isLastChild));
    });
  }
  
  return lines.join('\n');
}

function generateArborescenceText(arborescence: TecDocResponse): string {
  const lines: string[] = [];
  const entries = Object.entries(arborescence);
  
  entries.forEach(([rootKey, rootCategory], index) => {
    const isLastRoot = index === entries.length - 1;
    lines.push(formatCategoryTree(rootCategory, '', isLastRoot));
    if (!isLastRoot) {
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Extrait tous les chemins possibles dans l'arborescence
 */
function extractArborescencePaths(arborescence: TecDocResponse): ArborescencePath[] {
  const paths: ArborescencePath[] = [];
  
  function traverse(
    category: TecDocCategory,
    currentPath: string[],
    currentCategoryIds: (number | null)[]
  ) {
    const newPath = [...currentPath, category.categoryName];
    const newCategoryIds = [...currentCategoryIds, category.categoryId];
    
    if (category.productId !== undefined) {
      paths.push({
        path: newPath,
        categoryIds: newCategoryIds,
        finalCategoryId: category.categoryId,
        productId: category.productId,
      });
      return;
    }
    
    for (const child of Object.values(category.children)) {
      traverse(child, newPath, newCategoryIds);
    }
  }
  
  for (const [rootKey, rootCategory] of Object.entries(arborescence)) {
    traverse(rootCategory, [], []);
  }
  
  return paths;
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
 * Trouve les productId et le nom exact correspondant à un nom de produit (utilise un index)
 */
function findProductInfo(
  productName: string, 
  index: { exactMatch: Map<string, ProductName>; normalizedMatch: Map<string, ProductName>; }
): { productId: number; exactName: string } | null {
  // Essayer d'abord un match exact (insensible à la casse)
  const exactKey = productName.toLowerCase();
  const exactMatch = index.exactMatch.get(exactKey);
  
  if (exactMatch) {
    return {
      productId: exactMatch.productId,
      exactName: exactMatch.productName, // Utiliser le nom exact avec apostrophes
    };
  }
  
  // Si pas de match exact, chercher un match normalisé (sans apostrophes/accents)
  const normalizedKey = normalizeProductName(productName);
  const fuzzyMatch = index.normalizedMatch.get(normalizedKey);
  
  if (fuzzyMatch) {
    return {
      productId: fuzzyMatch.productId,
      exactName: fuzzyMatch.productName, // Utiliser le nom exact avec apostrophes
    };
  }
  
  return null;
}

/**
 * Trouve les produits les plus proches par nom
 */
function findClosestProducts(
  productName: string,
  productIds: number[],
  productNames: ProductName[],
  limit: number = 5
): Array<{ productId: number; productName: string }> {
  const results: Array<{ productId: number; productName: string }> = [];
  
  for (const productId of productIds) {
    const product = productNames.find(p => p.productId === productId);
    if (product) {
      results.push({
        productId: product.productId,
        productName: product.productName,
      });
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

/**
 * Crée un nom de fichier sécurisé à partir d'un nom de produit
 */
function sanitizeFileName(productName: string): string {
  // Remplacer les caractères non valides par des underscores
  return productName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limiter la longueur
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  const outputDirArgIndex = args.indexOf('--output-dir');
  const outputDir = outputDirArgIndex !== -1 && args[outputDirArgIndex + 1]
    ? args[outputDirArgIndex + 1]
    : 'tecdoc-results';
  
  const processAll = args.includes('--all');

  console.log('='.repeat(80));
  console.log('📊 RAPPORT DÉTAILLÉ DES GROUPES DE PRODUITS TECDOC');
  console.log('='.repeat(80));
  console.log();

  // Créer le dossier de sortie
  const resultsDir = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log(`📁 Dossier créé: ${resultsDir}`);
  } else {
    console.log(`📁 Dossier existant: ${resultsDir}`);
  }

  // Charger les listes de produits
  console.log('📂 Chargement des fichiers...');
  const listPath = path.join(process.cwd(), 'product-names-list.txt');
  const productNamesList = loadProductNamesList(listPath);
  console.log(`✅ ${productNamesList.length} produits dans la liste`);

  const productNames = loadProductNames();
  console.log(`✅ ${productNames.length} produits dans productnames.json`);
  
  // Créer un index pour accélérer la recherche (une seule fois au début)
  console.log('🔨 Création de l\'index des produits...');
  const productIndex = createProductIndex(productNames);
  console.log(`✅ Index créé : ${productIndex.exactMatch.size} noms exacts, ${productIndex.normalizedMatch.size} noms normalisés`);
  console.log();

  // Charger ou créer le tracker de progression
  const progressFilePath = path.join(resultsDir, '_progress.json');
  let progress: ProgressTracker;

  if (fs.existsSync(progressFilePath)) {
    console.log('📂 Reprise depuis la progression existante...');
    const existingData = fs.readFileSync(progressFilePath, 'utf-8');
    progress = JSON.parse(existingData) as ProgressTracker;
    console.log(`✅ ${progress.processed} produits déjà traités`);
    console.log(`   Dernier index traité: ${progress.lastProcessedIndex}`);
  } else {
    progress = {
      total: productNamesList.length,
      processed: 0,
      batchSize: BATCH_SIZE,
      lastProcessedIndex: -1,
      timestamp: new Date().toISOString(),
    };
  }

  if (processAll) {
    console.log(`🔄 Mode continu : traitement de tous les produits jusqu'à la fin`);
  } else {
    console.log(`📋 Mode lot : traitement de ${BATCH_SIZE} produits par exécution`);
    console.log(`💡 Astuce : utilisez --all pour traiter tous les produits automatiquement`);
  }
  console.log(`💾 Dossier de sauvegarde: ${resultsDir}`);
  console.log();

  // Boucle principale pour traiter tous les produits
  let batchNumber = 0;
  while (true) {
    // Recharger la progression depuis le fichier pour être sûr qu'elle soit à jour
    if (fs.existsSync(progressFilePath)) {
      const existingData = fs.readFileSync(progressFilePath, 'utf-8');
      progress = JSON.parse(existingData) as ProgressTracker;
    }
    
    // Déterminer quels produits traiter
    const startIndex = progress.lastProcessedIndex + 1;
    
    if (startIndex >= productNamesList.length) {
      console.log('✅ Tous les produits ont été traités !');
      break;
    }

    const endIndex = processAll 
      ? productNamesList.length  // Traiter tous les restants si --all
      : Math.min(startIndex + BATCH_SIZE, productNamesList.length);  // Sinon juste le lot
    
    const productsToProcess = productNamesList.slice(startIndex, endIndex);
    batchNumber++;

    console.log(`📋 Lot ${batchNumber} - Produits ${startIndex + 1} à ${endIndex} sur ${productNamesList.length}`);
    console.log(`   ${productsToProcess.length} produits à traiter dans ce lot`);
    console.log();

    // Traiter chaque produit
    for (let i = 0; i < productsToProcess.length; i++) {
    const productName = productsToProcess[i];
    const globalIndex = startIndex + i;
    const progressText = `[${globalIndex + 1}/${productNamesList.length}]`;
    
    console.log(`${progressText} 🔍 ${productName}`);

    // Créer le résultat pour ce produit
    const result: ProductResult = {
      productName,
      searchText: productName,
      found: false,
      hasMatch: false,
      timestamp: new Date().toISOString(),
    };

    // Base : on utilise toujours le nom depuis product-names-list.txt
    // On essaie de le corriger avec les apostrophes depuis productnames.json
    
    // Chercher la version avec apostrophes dans productnames.json pour corriger le nom
    const productInfo = findProductInfo(productName, productIndex);
    
    let searchTextToUse = productName; // Par défaut, utiliser le nom de la liste tel quel
    
    if (productInfo) {
      result.productId = productInfo.productId;
      // CORRECTION : utiliser la version avec apostrophes depuis productnames.json
      searchTextToUse = productInfo.exactName;
      result.searchText = searchTextToUse;
      
      if (productInfo.exactName !== productName) {
        console.log(`   📝 Apostrophe ajoutée: "${productName}" → "${productInfo.exactName}"`);
      }
    } else {
      // Si pas trouvé dans productnames.json, on cherche quand même avec le nom de la liste
      console.log(`   ⚠️  Nom non trouvé dans productnames.json, recherche avec: "${productName}"`);
    }

    try {
      // UNE SEULE REQUÊTE API avec le nom (corrigé avec apostrophes si possible)
      const arborescence = await searchTecDoc(searchTextToUse);

      if (arborescence) {
        result.found = true;
        result.arborescence = arborescence;
        result.arborescenceText = generateArborescenceText(arborescence);
        result.arborescencePaths = extractArborescencePaths(arborescence);
        result.productIdsInArbo = extractProductIds(arborescence);
        
        // Vérifier si le productId correspond
        if (result.productId && result.productIdsInArbo.includes(result.productId)) {
          result.hasMatch = true;
          result.matchedProductIds = [result.productId];
          console.log(`   ✅ ProductId ${result.productId} trouvé dans l'arborescence`);
        } else if (result.productId) {
          result.hasMatch = false;
          result.closestProductIds = findClosestProducts(productName, result.productIdsInArbo, productNames);
          console.log(`   ❌ ProductId ${result.productId} NON trouvé`);
          console.log(`      ProductIds trouvés: ${result.productIdsInArbo.slice(0, 5).join(', ')}${result.productIdsInArbo.length > 5 ? '...' : ''}`);
        } else {
          console.log(`   ⚠️  Arborescence trouvée mais pas de productId à vérifier`);
        }
      } else {
        console.log(`   ❌ Aucune arborescence trouvée`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      result.found = false;
      console.log(`   ❌ Erreur: ${errorMessage.substring(0, 100)}`);
    }

    // Sauvegarder le résultat dans un fichier JSON dédié
    const sanitizedFileName = sanitizeFileName(productName);
    const filePath = path.join(resultsDir, `${sanitizedFileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`   💾 Sauvegardé: ${sanitizedFileName}.json`);

    // Mettre à jour la progression
    progress.processed++;
    progress.lastProcessedIndex = globalIndex;
    progress.timestamp = new Date().toISOString();
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2), 'utf-8');

    // Délai entre les requêtes
    if (i < productsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }

      console.log();
    }

    // Résumé du lot
    console.log('='.repeat(80));
    console.log(`📊 RÉSUMÉ DU LOT ${batchNumber}`);
    console.log('='.repeat(80));
    console.log(`📝 Total traité: ${progress.processed}/${progress.total}`);
    console.log(`💾 Dossier de résultats: ${resultsDir}`);
    console.log('='.repeat(80));
    console.log();

    // Si on n'est pas en mode --all, on s'arrête après un lot
    if (!processAll) {
      console.log(`🔄 Pour continuer avec le prochain lot, relancez la même commande`);
      console.log(`   Ou utilisez --all pour traiter tous les produits automatiquement`);
      break;
    }

    // En mode --all, continuer avec le prochain lot
    if (progress.lastProcessedIndex < productNamesList.length - 1) {
      console.log(`⏳ Pause de 2 secondes avant le prochain lot...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log();
    }
  }

  // Résumé final
  console.log('='.repeat(80));
  console.log('✅ TRAITEMENT TERMINÉ');
  console.log('='.repeat(80));
  console.log(`📝 Total traité: ${progress.processed}/${progress.total}`);
  console.log(`💾 Dossier de résultats: ${resultsDir}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
