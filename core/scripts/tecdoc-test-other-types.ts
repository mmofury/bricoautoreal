import * as fs from 'fs';
import * as path from 'path';

interface ProductResult {
  productName: string;
  productId?: number;
  searchText: string;
  found: boolean;
  hasMatch: boolean;
  arborescence?: any;
  arborescenceText?: string;
  productIdsInArbo?: number[];
  matchedProductIds?: number[];
  closestProductIds?: Array<{
    productId: number;
    productName: string;
  }>;
  error?: string;
  timestamp: string;
}

interface TestResult {
  productName: string;
  productId?: number;
  searchText: string;
  originalFound: boolean;
  tests: Array<{
    typeId: number;
    found: boolean;
    hasMatch: boolean;
    productIdsInArbo?: number[];
    matchedProductIds?: number[];
    arborescence?: any;
    arborescenceText?: string;
    error?: string;
  }>;
  bestMatch?: {
    typeId: number;
    found: boolean;
    hasMatch: boolean;
  };
  timestamp: string;
}

// Configuration de l'API TecDoc
const TECDOC_API_KEY = '8dfaae4fb2msh88f294b47a23e72p1d63fcjsn02184b022654';
const TECDOC_BASE_URL = 'https://tecdoc-catalog.p.rapidapi.com';
const LANG_ID = 6; // Langue ID (6 = français)
const TYPE_IDS_TO_TEST = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const REQUEST_DELAY = 500; // 500ms entre les requêtes

/**
 * Effectue une recherche dans l'API TecDoc avec un TYPE_ID spécifique
 */
async function searchTecDocWithType(searchText: string, typeId: number): Promise<{ arborescence: any | null; error?: string }> {
  try {
    const encodedSearchText = encodeURIComponent(searchText);
    const url = `${TECDOC_BASE_URL}/category/search-for-the-commodity-group-tree-by-description/type-id/${typeId}/lang-id/${LANG_ID}/search-text/${encodedSearchText}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tecdoc-catalog.p.rapidapi.com',
        'x-rapidapi-key': TECDOC_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        arborescence: null,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length === 0) {
      return { arborescence: null };
    }
    
    return { arborescence: data };
  } catch (error) {
    return {
      arborescence: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parcourt récursivement l'arborescence pour extraire tous les productId
 */
function extractProductIds(arborescence: any): number[] {
  const productIds = new Set<number>();

  function traverse(category: any) {
    if (category.productId) {
      productIds.add(category.productId);
    }
    if (category.children) {
      for (const child of Object.values(category.children)) {
        traverse(child);
      }
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
function formatCategoryTree(category: any, indent: string = '', isLast: boolean = true): string {
  const lines: string[] = [];
  const marker = isLast ? '└── ' : '├── ';
  const categoryIdStr = category.categoryId ? ` [ID: ${category.categoryId}]` : '';
  const productIdStr = category.productId ? ` → ProductId: ${category.productId}` : '';
  
  lines.push(`${indent}${marker}${category.categoryName}${categoryIdStr} (Niveau ${category.level})${productIdStr}`);
  
  if (category.children && Object.keys(category.children).length > 0) {
    const newIndent = indent + (isLast ? '    ' : '│   ');
    const childEntries = Object.entries(category.children);
    childEntries.forEach(([childKey, childCategory]: [string, any], childIndex) => {
      const isLastChild = childIndex === childEntries.length - 1;
      lines.push(formatCategoryTree(childCategory, newIndent, isLastChild));
    });
  }
  
  return lines.join('\n');
}

function generateArborescenceText(arborescence: any): string {
  const lines: string[] = [];
  const entries = Object.entries(arborescence);
  
  entries.forEach(([rootKey, rootCategory]: [string, any], index) => {
    const isLastRoot = index === entries.length - 1;
    lines.push(formatCategoryTree(rootCategory, '', isLastRoot));
    if (!isLastRoot) {
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Crée un nom de fichier sécurisé à partir d'un nom de produit
 */
function sanitizeFileName(productName: string): string {
  return productName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Charge la liste corrigée depuis product-names-list.txt
 */
function loadCorrectedProductNamesList(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  
  if (!fs.existsSync(filePath)) {
    return map;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const productLines = lines.slice(1); // Ignorer la première ligne (Total: ...)
  
  for (const line of productLines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match && match[1]) {
      const productName = match[1].trim();
      // Créer une clé normalisée (sans apostrophes) pour la recherche
      const normalizedKey = productName.toLowerCase().replace(/['']/g, '');
      map.set(normalizedKey, productName);
    }
  }

  return map;
}

/**
 * Charge les résultats existants et filtre ceux sans arborescence
 * Utilise les noms corrigés depuis product-names-list.txt
 */
function loadProductsWithoutArborescence(resultsDir: string, correctedNames: Map<string, string>): Array<ProductResult & { correctedName?: string }> {
  const files = fs.readdirSync(resultsDir);
  const results: Array<ProductResult & { correctedName?: string }> = [];

  for (const file of files) {
    if (file.endsWith('.json') && file !== '_progress.json') {
      const filePath = path.join(resultsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = JSON.parse(content) as ProductResult;
        // Ne garder que ceux sans arborescence (found: false)
        if (!result.found && !result.error) {
          // Chercher le nom corrigé
          const normalizedKey = result.productName.toLowerCase().replace(/['']/g, '');
          const correctedName = correctedNames.get(normalizedKey);
          
          if (correctedName && correctedName !== result.productName) {
            result.correctedName = correctedName;
          }
          
          results.push(result);
        }
      } catch (error) {
        console.error(`Erreur lors de la lecture de ${file}:`, error);
      }
    }
  }

  return results;
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  const inputDirArgIndex = args.indexOf('--input-dir');
  const inputDir = inputDirArgIndex !== -1 && args[inputDirArgIndex + 1]
    ? args[inputDirArgIndex + 1]
    : 'tecdoc-results';
  
  const outputDirArgIndex = args.indexOf('--output-dir');
  const outputDir = outputDirArgIndex !== -1 && args[outputDirArgIndex + 1]
    ? args[outputDirArgIndex + 1]
    : 'tecdoc-results-other-types';

  console.log('='.repeat(80));
  console.log('🔍 TEST DES AUTRES TYPE_ID POUR PRODUITS SANS ARBORESCENCE');
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

  // Charger la liste corrigée avec les apostrophes
  const listPath = path.join(process.cwd(), 'product-names-list.txt');
  console.log(`📂 Chargement de la liste corrigée depuis: ${listPath}`);
  const correctedNames = loadCorrectedProductNamesList(listPath);
  console.log(`✅ ${correctedNames.size} noms corrigés chargés`);

  // Charger les produits sans arborescence
  const inputPath = path.join(process.cwd(), inputDir);
  console.log(`📂 Chargement des produits sans arborescence depuis: ${inputPath}`);
  const productsToTest = loadProductsWithoutArborescence(inputPath, correctedNames);
  console.log(`✅ ${productsToTest.length} produits sans arborescence à tester`);
  console.log(`🔢 TYPE_IDs à tester: ${TYPE_IDS_TO_TEST.join(', ')}`);
  console.log(`💾 Dossier de sauvegarde: ${resultsDir}`);
  console.log();

  // Charger ou créer le tracker de progression
  const progressFilePath = path.join(resultsDir, '_progress.json');
  let processedProducts = new Set<string>();

  if (fs.existsSync(progressFilePath)) {
    const existingData = fs.readFileSync(progressFilePath, 'utf-8');
    const progress = JSON.parse(existingData) as { processed: string[] };
    processedProducts = new Set(progress.processed);
    console.log(`📂 Reprise: ${processedProducts.size} produits déjà traités`);
    console.log();
  }

  // Traiter chaque produit
  let foundCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < productsToTest.length; i++) {
    const product = productsToTest[i];
    const progressText = `[${i + 1}/${productsToTest.length}]`;
    
    // Utiliser le nom corrigé si disponible
    const displayName = (product as any).correctedName || product.productName;
    
    // Vérifier si déjà traité (avec le nom corrigé)
    if (processedProducts.has(displayName)) {
      console.log(`${progressText} ⏭️  ${displayName} (déjà traité)`);
      continue;
    }

    // Utiliser le nom corrigé si disponible
    const searchTextToUse = (product as any).correctedName || product.searchText;
    
    console.log(`${progressText} 🔍 ${displayName}`);
    if ((product as any).correctedName && (product as any).correctedName !== product.productName) {
      console.log(`   📝 Nom corrigé: "${product.productName}" → "${(product as any).correctedName}"`);
    }
    if (product.productId) {
      console.log(`   ProductId: ${product.productId}`);
    }

    const testResult: TestResult = {
      productName: displayName,
      productId: product.productId,
      searchText: searchTextToUse,
      originalFound: false,
      tests: [],
      timestamp: new Date().toISOString(),
    };

    // Tester avec chaque TYPE_ID jusqu'à trouver un match parfait (avec productId)
    for (const typeId of TYPE_IDS_TO_TEST) {
      console.log(`   🧪 Test TYPE_ID ${typeId}...`);
      
      const { arborescence, error } = await searchTecDocWithType(searchTextToUse, typeId);
      
      const test: TestResult['tests'][0] = {
        typeId,
        found: !!arborescence,
        hasMatch: false,
      };

      if (arborescence) {
        test.arborescence = arborescence;
        test.arborescenceText = generateArborescenceText(arborescence);
        test.productIdsInArbo = extractProductIds(arborescence);
        
        // Vérifier si le productId correspond
        if (product.productId && test.productIdsInArbo.includes(product.productId)) {
          test.hasMatch = true;
          test.matchedProductIds = [product.productId];
          console.log(`      ✅ ProductId ${product.productId} trouvé !`);
        } else if (product.productId) {
          console.log(`      ⚠️  Arborescence trouvée mais ProductId ${product.productId} non trouvé`);
          console.log(`         ProductIds trouvés: ${test.productIdsInArbo.slice(0, 5).join(', ')}${test.productIdsInArbo.length > 5 ? '...' : ''}`);
        } else {
          console.log(`      ✅ Arborescence trouvée (${test.productIdsInArbo.length} ProductIds)`);
        }
      } else if (error) {
        test.error = error;
        console.log(`      ❌ Erreur: ${error.substring(0, 50)}`);
      } else {
        console.log(`      ❌ Aucune arborescence`);
      }

      testResult.tests.push(test);

      // Si on a trouvé un match parfait (avec productId correspondant), on s'arrête
      if (test.hasMatch) {
        console.log(`   🎯 Match parfait trouvé avec TYPE_ID ${typeId}, arrêt des tests`);
        break;
      }

      // Délai entre les requêtes
      if (typeId !== TYPE_IDS_TO_TEST[TYPE_IDS_TO_TEST.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      }
    }

    // Trouver le meilleur match
    const bestTest = testResult.tests.find(t => t.hasMatch) || testResult.tests.find(t => t.found);
    if (bestTest) {
      testResult.bestMatch = {
        typeId: bestTest.typeId,
        found: bestTest.found,
        hasMatch: bestTest.hasMatch,
      };
      foundCount++;
      console.log(`   🎯 Meilleur match: TYPE_ID ${bestTest.typeId} (${bestTest.hasMatch ? 'avec ProductId' : 'sans ProductId'})`);
    } else {
      notFoundCount++;
      console.log(`   ❌ Aucun résultat trouvé avec aucun TYPE_ID`);
    }

    // Sauvegarder le résultat
    const sanitizedFileName = sanitizeFileName(displayName);
    const filePath = path.join(resultsDir, `${sanitizedFileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testResult, null, 2), 'utf-8');
    console.log(`   💾 Sauvegardé: ${sanitizedFileName}.json`);

    // Mettre à jour la progression (avec le nom corrigé)
    processedProducts.add(displayName);
    fs.writeFileSync(progressFilePath, JSON.stringify({ processed: Array.from(processedProducts) }, null, 2), 'utf-8');

    console.log();
  }

  console.log('='.repeat(80));
  console.log('✅ TRAITEMENT TERMINÉ');
  console.log('='.repeat(80));
  console.log(`📝 Total traité: ${productsToTest.length}`);
  console.log(`✅ Résultats trouvés: ${foundCount}`);
  console.log(`❌ Aucun résultat: ${notFoundCount}`);
  console.log(`💾 Dossier de résultats: ${resultsDir}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

