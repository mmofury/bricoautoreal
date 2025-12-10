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
  arborescence?: TecDocResponse;
  arborescenceText?: string; // Version textuelle lisible
  arborescencePaths?: ArborescencePath[]; // Liste des chemins simplifiés
  productIdsInArbo?: number[];
  matchedProductIds?: number[];
  error?: string;
}

interface BatchResults {
  total: number;
  processed: number;
  found: number;
  notFound: number;
  errors: number;
  products: ProductResult[];
  timestamp: string;
}

// Configuration de l'API TecDoc
const TECDOC_API_KEY = '8dfaae4fb2msh88f294b47a23e72p1d63fcjsn02184b022654';
const TECDOC_BASE_URL = 'https://tecdoc-catalog.p.rapidapi.com';
const TYPE_ID = 1; // Type ID pour les pièces auto
const LANG_ID = 6; // Langue ID (6 = français)

// Délai entre les requêtes (en ms) pour éviter de dépasser les limites de l'API
const REQUEST_DELAY = 500; // 500ms = 2 requêtes par seconde max

/**
 * Charge le fichier product-names-list.txt et extrait les noms de produits
 */
function loadProductNamesList(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Ignorer la première ligne (Total: ...)
  const productLines = lines.slice(1);
  
  // Extraire les noms de produits (format: "NUMERO. Nom du produit")
  const products: string[] = [];
  
  for (const line of productLines) {
    // Enlever le numéro et le point
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match && match[1]) {
      products.push(match[1].trim());
    }
  }

  return products;
}

/**
 * Charge le fichier productnames.json pour faire le matching des productId
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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as TecDocResponse;
    
    // Vérifier si c'est un tableau vide
    if (Array.isArray(data) && data.length === 0) {
      return null;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Essaie plusieurs variantes d'un texte de recherche
 */
function generateSearchVariants(searchText: string): string[] {
  const variants: string[] = [searchText];

  // Enlever la virgule et les espaces multiples
  const cleaned = searchText.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned !== searchText) {
    variants.push(cleaned);
  }

  // Essayer avec juste la première partie (avant la virgule)
  const parts = searchText.split(',').map(p => p.trim());
  if (parts.length > 1) {
    variants.push(...parts);
  }

  // Essayer les mots clés principaux (plus de 3 caractères)
  const words = searchText
    .split(/[\s,]+/)
    .map(w => w.trim())
    .filter(w => w.length > 3);
  
  if (words.length > 1) {
    variants.push(...words.slice(0, 3));
  }

  return Array.from(new Set(variants)).filter(v => v.length > 0);
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
 * Vérifie si une catégorie ou ses enfants contiennent un productId donné
 */
function containsProductId(category: TecDocCategory, targetProductId: number): boolean {
  if (category.productId === targetProductId) {
    return true;
  }

  for (const child of Object.values(category.children)) {
    if (containsProductId(child, targetProductId)) {
      return true;
    }
  }

  return false;
}

/**
 * Filtre une catégorie pour ne garder que les branches contenant le productId cible
 */
function filterCategoryByProductId(category: TecDocCategory, targetProductId: number): TecDocCategory | null {
  // Si cette catégorie contient directement le productId, on la garde
  if (category.productId === targetProductId) {
    return category;
  }

  // Filtrer les enfants pour ne garder que ceux qui contiennent le productId
  const filteredChildren: Record<string, TecDocCategory> = {};
  let hasMatchingChild = false;

  for (const [key, child] of Object.entries(category.children)) {
    if (containsProductId(child, targetProductId)) {
      const filteredChild = filterCategoryByProductId(child, targetProductId);
      if (filteredChild) {
        filteredChildren[key] = filteredChild;
        hasMatchingChild = true;
      }
    }
  }

  // Si on a des enfants qui matchent, créer une nouvelle catégorie avec seulement ces enfants
  if (hasMatchingChild) {
    return {
      ...category,
      children: filteredChildren,
    };
  }

  return null;
}

/**
 * Filtre l'arborescence complète pour ne garder que les branches contenant le productId cible
 */
function filterArborescenceByProductId(arborescence: TecDocResponse, targetProductId: number): TecDocResponse {
  const filtered: TecDocResponse = {};

  for (const [rootKey, rootCategory] of Object.entries(arborescence)) {
    if (containsProductId(rootCategory, targetProductId)) {
      const filteredCategory = filterCategoryByProductId(rootCategory, targetProductId);
      if (filteredCategory) {
        filtered[rootKey] = filteredCategory;
      }
    }
  }

  return filtered;
}

/**
 * Trouve les productId correspondant à un nom de produit
 */
function findProductIds(productName: string, productNames: ProductName[]): number[] {
  return productNames
    .filter((p) => p.productName.toLowerCase() === productName.toLowerCase())
    .map((p) => p.productId);
}

/**
 * Génère une représentation textuelle lisible d'une catégorie et de ses enfants
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

/**
 * Génère une représentation textuelle lisible de l'arborescence complète
 */
function generateArborescenceText(arborescence: TecDocResponse): string {
  const lines: string[] = [];
  
  const entries = Object.entries(arborescence);
  entries.forEach(([rootKey, rootCategory], index) => {
    const isLastRoot = index === entries.length - 1;
    
    // Afficher la catégorie racine
    lines.push(formatCategoryTree(rootCategory, '', isLastRoot));
    
    // Ajouter une ligne vide entre les différentes racines (sauf après la dernière)
    if (!isLastRoot) {
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Extrait tous les chemins possibles dans l'arborescence jusqu'au productId
 */
function extractArborescencePaths(arborescence: TecDocResponse, targetProductId?: number): ArborescencePath[] {
  const paths: ArborescencePath[] = [];
  
  function traverse(
    category: TecDocCategory,
    currentPath: string[],
    currentCategoryIds: (number | null)[]
  ) {
    const newPath = [...currentPath, category.categoryName];
    const newCategoryIds = [...currentCategoryIds, category.categoryId];
    
    // Si on a atteint le productId cible ou si c'est une feuille
    if (category.productId !== undefined) {
      if (!targetProductId || category.productId === targetProductId) {
        paths.push({
          path: newPath,
          categoryIds: newCategoryIds,
          finalCategoryId: category.categoryId,
          productId: category.productId,
        });
      }
      return;
    }
    
    // Continuer avec les enfants
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
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Usage: tsx tecdoc-batch-search.ts [--resume] [--output <file>] [--limit <number>]');
    console.error('   --resume: Reprendre depuis le dernier résultat sauvegardé');
    console.error('   --output: Nom du fichier de sortie (défaut: tecdoc-arborescence.json)');
    console.error('   --limit: Limiter le nombre de produits à traiter (pour test)');
    process.exit(1);
  }

  const resume = args.includes('--resume');
  const outputArgIndex = args.indexOf('--output');
  const outputFile = outputArgIndex !== -1 && args[outputArgIndex + 1]
    ? args[outputArgIndex + 1]
    : 'tecdoc-arborescence.json';
  
  const limitArgIndex = args.indexOf('--limit');
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1]
    ? parseInt(args[limitArgIndex + 1], 10)
    : undefined;

  console.log('='.repeat(80));
  console.log('🔧 SCRIPT BATCH DE RECHERCHE TECDOC');
  console.log('='.repeat(80));
  console.log();

  // Charger les listes de produits
  console.log('📂 Chargement des fichiers...');
  const listPath = path.join(process.cwd(), 'product-names-list.txt');
  const productNamesList = loadProductNamesList(listPath);
  console.log(`✅ ${productNamesList.length} produits dans la liste`);

  const productNames = loadProductNames();
  console.log(`✅ ${productNames.length} produits dans productnames.json`);
  console.log();

  // Charger ou créer le fichier de résultats
  const outputPath = path.join(process.cwd(), outputFile);
  let results: BatchResults;

  if (resume && fs.existsSync(outputPath)) {
    console.log('📂 Reprise depuis le fichier existant...');
    const existingData = fs.readFileSync(outputPath, 'utf-8');
    results = JSON.parse(existingData) as BatchResults;
    console.log(`✅ ${results.processed} produits déjà traités`);
  } else {
    results = {
      total: productNamesList.length,
      processed: 0,
      found: 0,
      notFound: 0,
      errors: 0,
      products: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Filtrer les produits déjà traités
  const processedNames = new Set(results.products.map(p => p.productName));
  const productsToProcess = productNamesList
    .filter(name => !processedNames.has(name))
    .slice(0, limit);

  console.log(`📋 ${productsToProcess.length} produits à traiter`);
  if (limit) {
    console.log(`⚠️  Mode limité: traitement de ${limit} produits maximum`);
  }
  console.log();

  // Traiter chaque produit
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < productsToProcess.length; i++) {
    const productName = productsToProcess[i];
    const progress = `[${results.processed + i + 1}/${results.total}]`;
    
    console.log(`${progress} 🔍 Recherche: "${productName}"`);

    const result: ProductResult = {
      productName,
      searchText: productName,
      found: false,
    };

    // Trouver le productId correspondant
    const matchingProducts = findProductIds(productName, productNames);
    if (matchingProducts.length > 0) {
      result.productId = matchingProducts[0]; // Prendre le premier
      if (matchingProducts.length > 1) {
        console.log(`   ⚠️  ${matchingProducts.length} productId trouvés, utilisation du premier: ${matchingProducts[0]}`);
      }
    }

    try {
      // Essayer la recherche exacte d'abord
      let arborescence = await searchTecDoc(productName);

      // Si pas de résultat, essayer des variantes
      if (!arborescence) {
        const variants = generateSearchVariants(productName);
        for (const variant of variants) {
          if (variant === productName) continue;
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
          arborescence = await searchTecDoc(variant);
          if (arborescence) {
            result.searchText = variant;
            console.log(`   ✅ Trouvé avec la variante: "${variant}"`);
            break;
          }
        }
      }

      if (arborescence) {
        result.found = true;
        result.productIdsInArbo = extractProductIds(arborescence);
        
        // Vérifier si le productId correspond
        let filteredArborescence: TecDocResponse;
        if (result.productId && result.productIdsInArbo.includes(result.productId)) {
          result.matchedProductIds = [result.productId];
          console.log(`   ✅ ProductId ${result.productId} trouvé dans l'arborescence !`);
          
          // Filtrer l'arborescence pour ne garder que les branches contenant ce productId
          filteredArborescence = filterArborescenceByProductId(arborescence, result.productId);
        } else if (result.productId) {
          console.log(`   ⚠️  ProductId ${result.productId} NON trouvé dans l'arborescence`);
          // Si pas de match, garder l'arborescence complète
          filteredArborescence = arborescence;
        } else {
          // Si pas de productId connu, garder l'arborescence complète
          filteredArborescence = arborescence;
        }

        // Sauvegarder l'arborescence filtrée
        result.arborescence = filteredArborescence;
        
        // Générer les versions lisibles
        result.arborescenceText = generateArborescenceText(filteredArborescence);
        result.arborescencePaths = extractArborescencePaths(filteredArborescence, result.productId);

        results.found++;
        successCount++;
      } else {
        result.found = false;
        results.notFound++;
        console.log(`   ❌ Aucun résultat`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      results.errors++;
      errorCount++;
      console.log(`   ❌ Erreur: ${errorMessage}`);
    }

    results.products.push(result);
    results.processed++;

    // Sauvegarder périodiquement (tous les 10 produits)
    if ((i + 1) % 10 === 0) {
      results.timestamp = new Date().toISOString();
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`   💾 Sauvegarde intermédiaire...`);
    }

    // Délai entre les requêtes pour ne pas dépasser les limites de l'API
    if (i < productsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }

    console.log();
  }

  // Sauvegarde finale
  results.timestamp = new Date().toISOString();
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log('='.repeat(80));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(80));
  console.log(`✅ Produits trouvés: ${results.found}`);
  console.log(`❌ Produits non trouvés: ${results.notFound}`);
  console.log(`⚠️  Erreurs: ${results.errors}`);
  console.log(`📝 Total traité: ${results.processed}/${results.total}`);
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

