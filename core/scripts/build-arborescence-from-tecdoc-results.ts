// Script pour construire l'arborescence complète à partir des fichiers tecdoc-results
import * as fs from 'fs';
import * as path from 'path';

interface TecDocCategoryNode {
  categoryId: number | null;
  categoryName: string;
  level: number;
  children: Record<string, TecDocCategoryNode>;
  productId?: number;
}

interface TecDocArborescence {
  [categoryName: string]: TecDocCategoryNode;
}

interface TecDocResultFile {
  productName: string;
  productId?: number;
  arborescence?: TecDocArborescence;
  arborescencePaths?: Array<{
    path: string[];
    categoryIds: (number | null)[];
    finalCategoryId: number | null;
    productId?: number;
  }>;
}

interface BuiltCategoryNode {
  id: string; // ID unique généré ou categoryId si disponible
  name: string;
  tecdocCategoryId: number | null;
  level: number;
  path: string[];
  productGroups: Array<{
    productName: string;
    productId?: number;
  }>;
  children: Record<string, BuiltCategoryNode>;
}

function generateCategoryId(categoryName: string, parentPath: string[]): string {
  // Générer un ID basé sur le chemin complet pour éviter les doublons
  const fullPath = [...parentPath, categoryName].join('|');
  // Utiliser un hash simple basé sur le chemin
  let hash = 0;
  for (let i = 0; i < fullPath.length; i++) {
    const char = fullPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `cat_${Math.abs(hash)}`;
}

function mergeCategoryNode(
  categoryName: string,
  tecdocNode: TecDocCategoryNode,
  parentPath: string[],
  builtCategories: Map<string, BuiltCategoryNode>,
  productGroupsMap: Map<string, Array<{ productName: string; productId?: number }>>
): BuiltCategoryNode {
  const currentPath = [...parentPath, categoryName];
  const categoryId = tecdocNode.categoryId !== null 
    ? `tecdoc_${tecdocNode.categoryId}` 
    : generateCategoryId(categoryName, parentPath);

  // Vérifier si la catégorie existe déjà
  let builtNode = builtCategories.get(categoryId);
  
  if (!builtNode) {
    builtNode = {
      id: categoryId,
      name: categoryName,
      tecdocCategoryId: tecdocNode.categoryId,
      level: tecdocNode.level,
      path: currentPath,
      productGroups: [],
      children: {},
    };
    builtCategories.set(categoryId, builtNode);
  }

  // Ajouter les groupes de produits si disponibles
  const productGroups = productGroupsMap.get(categoryId) || [];
  builtNode.productGroups = productGroups;

  // Traiter les enfants
  if (tecdocNode.children && Object.keys(tecdocNode.children).length > 0) {
    for (const [childName, childNode] of Object.entries(tecdocNode.children)) {
      const childId = childNode.categoryId !== null
        ? `tecdoc_${childNode.categoryId}`
        : generateCategoryId(childName, currentPath);

      // Vérifier si l'enfant existe déjà
      if (!builtNode.children[childId]) {
        const builtChild = mergeCategoryNode(
          childName,
          childNode,
          currentPath,
          builtCategories,
          productGroupsMap
        );
        builtNode.children[childId] = builtChild;
      } else {
        // L'enfant existe, mais on peut avoir besoin de fusionner les enfants
        const existingChild = builtNode.children[childId];
        if (childNode.children && Object.keys(childNode.children).length > 0) {
          for (const [grandChildName, grandChildNode] of Object.entries(childNode.children)) {
            const grandChildId = grandChildNode.categoryId !== null
              ? `tecdoc_${grandChildNode.categoryId}`
              : generateCategoryId(grandChildName, [...currentPath, childName]);
            
            if (!existingChild.children[grandChildId]) {
              const builtGrandChild = mergeCategoryNode(
                grandChildName,
                grandChildNode,
                [...currentPath, childName],
                builtCategories,
                productGroupsMap
              );
              existingChild.children[grandChildId] = builtGrandChild;
            }
          }
        }
      }
    }
  }

  return builtNode;
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isEnglishOrProductName(categoryName: string, productName: string): boolean {
  // Vérifier si le nom est en anglais (commence par majuscule, mots courts communs en anglais)
  const englishWords = ['tools', 'tool', 'parts', 'part', 'components', 'component', 'accessories', 'accessory'];
  const normalized = categoryName.toLowerCase().trim();
  
  // Si c'est exactement le nom du produit, on l'ignore
  if (normalized === productName.toLowerCase().trim()) {
    return true;
  }
  
  // Si c'est un mot anglais commun
  if (englishWords.includes(normalized)) {
    return true;
  }
  
  // Si le nom ne contient que des caractères ASCII et ressemble à de l'anglais
  // (pas d'accents, mots courts)
  if (/^[a-zA-Z\s]+$/.test(categoryName) && categoryName.split(' ').length <= 2) {
    // Vérifier si ce n'est pas un nom français commun
    const frenchWords = ['outils', 'outil', 'pièces', 'pièce', 'composants', 'composant', 'accessoires', 'accessoire'];
    if (!frenchWords.includes(normalized)) {
      return true;
    }
  }
  
  return false;
}

function isExactMatch(categoryName: string, productName: string): boolean {
  // Vérifier si le nom de la catégorie correspond exactement au nom du produit (après normalisation)
  return normalizeString(categoryName) === normalizeString(productName);
}

function buildArborescenceFromPaths(
  paths: Array<{ path: string[]; categoryIds: (number | null)[]; finalCategoryId: number | null }>,
  productName: string,
  productId: number | undefined,
  builtCategories: Map<string, BuiltCategoryNode>,
  productGroupsMap: Map<string, Array<{ productName: string; productId?: number }>>,
  rootCategories: Record<string, BuiltCategoryNode>
): void {
  for (const pathData of paths) {
    if (!pathData.path || pathData.path.length === 0) continue;

    // Ignorer le dernier élément s'il est en anglais ou correspond au nom du produit
    let effectivePath = [...pathData.path];
    let effectiveCategoryIds = [...pathData.categoryIds];
    
    if (effectivePath.length > 0) {
      const lastElement = effectivePath[effectivePath.length - 1];
      if (isEnglishOrProductName(lastElement, productName)) {
        effectivePath = effectivePath.slice(0, -1);
        effectiveCategoryIds = effectiveCategoryIds.slice(0, -1);
      }
    }

    // Si après avoir ignoré le dernier élément, il ne reste rien, on prend tout le chemin
    if (effectivePath.length === 0) {
      effectivePath = pathData.path;
      effectiveCategoryIds = pathData.categoryIds;
    }

    // Construire la hiérarchie pour ce chemin (sans le dernier élément ignoré)
    let currentPath: string[] = [];
    let parentNode: BuiltCategoryNode | null = null;
    let rootId: string | null = null;

    for (let i = 0; i < effectivePath.length; i++) {
      const categoryName = effectivePath[i];
      const categoryId = effectiveCategoryIds[i];
      const tecdocId = categoryId !== null ? `tecdoc_${categoryId}` : generateCategoryId(categoryName, currentPath);
      
      currentPath = [...currentPath, categoryName];

      // Vérifier si la catégorie existe déjà
      let categoryNode = builtCategories.get(tecdocId);

      if (!categoryNode) {
        categoryNode = {
          id: tecdocId,
          name: categoryName,
          tecdocCategoryId: categoryId,
          level: i + 1,
          path: [...currentPath],
          productGroups: [],
          children: {},
        };
        builtCategories.set(tecdocId, categoryNode);
      }

      // Si c'est le premier niveau, l'ajouter aux racines
      if (i === 0) {
        rootId = tecdocId;
        if (!rootCategories[tecdocId]) {
          rootCategories[tecdocId] = categoryNode;
        }
      }

      // Ajouter le groupe de produit à la catégorie la plus profonde (dernière du chemin effectif)
      // MAIS seulement si le nom de la catégorie correspond exactement au nom du produit
      if (i === effectivePath.length - 1) {
        // Vérifier la correspondance exacte : le nom de la catégorie doit correspondre exactement au nom du produit
        if (isExactMatch(categoryName, productName)) {
          if (!productGroupsMap.has(tecdocId)) {
            productGroupsMap.set(tecdocId, []);
          }
          const groups = productGroupsMap.get(tecdocId)!;
          if (!groups.find(g => g.productName === productName)) {
            groups.push({ productName, productId });
          }
          categoryNode.productGroups = groups;
        }
        // Si pas de correspondance exacte, on n'associe pas le groupe à cette catégorie
      }

      // Lier à l'enfant du parent
      if (parentNode) {
        if (!parentNode.children[tecdocId]) {
          parentNode.children[tecdocId] = categoryNode;
        }
      }

      parentNode = categoryNode;
    }
  }
}

async function buildArborescenceFromTecDocResults() {
  console.log('🚀 Construction de l\'arborescence à partir des fichiers tecdoc-results...\n');

  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');

  const builtCategories = new Map<string, BuiltCategoryNode>();
  const productGroupsMap = new Map<string, Array<{ productName: string; productId?: number }>>();
  const rootCategories: Record<string, BuiltCategoryNode> = {};

  let processed = 0;
  let totalFiles = 0;

  const processFile = (filePath: string): void => {
    try {
      const content: TecDocResultFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!content.productName) return;

      // Méthode 1: Utiliser arborescencePaths (plus fiable)
      if (content.arborescencePaths && content.arborescencePaths.length > 0) {
        buildArborescenceFromPaths(
          content.arborescencePaths,
          content.productName,
          content.productId,
          builtCategories,
          productGroupsMap,
          rootCategories
        );
      }

      // Méthode 2: Utiliser arborescence (structure imbriquée)
      if (content.arborescence && Object.keys(content.arborescence).length > 0) {
        for (const [rootName, rootNode] of Object.entries(content.arborescence)) {
          const rootId = rootNode.categoryId !== null
            ? `tecdoc_${rootNode.categoryId}`
            : generateCategoryId(rootName, []);

          if (!rootCategories[rootId]) {
            const builtRoot = mergeCategoryNode(
              rootName,
              rootNode,
              [],
              builtCategories,
              productGroupsMap
            );
            rootCategories[rootId] = builtRoot;
          }
        }
      }

      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed} fichiers traités...`);
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  };

  if (fs.existsSync(dir1)) {
    const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.json') && f !== '_progress.json');
    totalFiles += files1.length;
    for (const file of files1) {
      processFile(path.join(dir1, file));
    }
  }

  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    totalFiles += files2.length;
    for (const file of files2) {
      processFile(path.join(dir2, file));
    }
  }

  console.log(`   ✅ ${processed} fichiers traités\n`);

  // Utiliser les catégories racines construites
  const finalCategories = rootCategories;

  // Statistiques
  let totalCategories = 0;
  let categoriesWithProducts = 0;
  let totalProductGroups = 0;
  const byLevel: Record<number, { total: number; withProducts: number; productGroups: number }> = {};

  function countStats(node: BuiltCategoryNode) {
    totalCategories++;
    const level = node.level;
    if (!byLevel[level]) {
      byLevel[level] = { total: 0, withProducts: 0, productGroups: 0 };
    }
    byLevel[level].total++;
    
    if (node.productGroups.length > 0) {
      categoriesWithProducts++;
      byLevel[level].withProducts++;
      byLevel[level].productGroups += node.productGroups.length;
      totalProductGroups += node.productGroups.length;
    }

    for (const child of Object.values(node.children)) {
      countStats(child);
    }
  }

  for (const category of Object.values(finalCategories)) {
    countStats(category);
  }

  console.log('📊 Statistiques:\n');
  console.log(`   📁 Total catégories: ${totalCategories}`);
  console.log(`   📦 Catégories avec groupes de produits: ${categoriesWithProducts} (${((categoriesWithProducts / totalCategories) * 100).toFixed(1)}%)`);
  console.log(`   🔗 Total groupes de produits: ${totalProductGroups}\n`);

  console.log('📊 Répartition par niveau:');
  Object.keys(byLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(level => {
      const stats = byLevel[parseInt(level)];
      const avgGroups = stats.withProducts > 0 ? (stats.productGroups / stats.withProducts).toFixed(1) : '0';
      console.log(`   Niveau ${level}: ${stats.total} catégories, ${stats.withProducts} avec produits (${stats.productGroups} groupes, moyenne: ${avgGroups} groupes/catégorie)`);
    });
  console.log('');

  // Répartition par nombre de groupes de produits
  const byProductCount: Record<string, number> = {
    '1 groupe': 0,
    '2-5 groupes': 0,
    '6-10 groupes': 0,
    '11-20 groupes': 0,
    '21-50 groupes': 0,
    '50+ groupes': 0,
  };

  function countByProductGroups(node: BuiltCategoryNode) {
    if (node.productGroups.length > 0) {
      const count = node.productGroups.length;
      if (count === 1) {
        byProductCount['1 groupe']++;
      } else if (count >= 2 && count <= 5) {
        byProductCount['2-5 groupes']++;
      } else if (count >= 6 && count <= 10) {
        byProductCount['6-10 groupes']++;
      } else if (count >= 11 && count <= 20) {
        byProductCount['11-20 groupes']++;
      } else if (count >= 21 && count <= 50) {
        byProductCount['21-50 groupes']++;
      } else {
        byProductCount['50+ groupes']++;
      }
    }

    for (const child of Object.values(node.children)) {
      countByProductGroups(child);
    }
  }

  for (const category of Object.values(finalCategories)) {
    countByProductGroups(category);
  }

  console.log('📊 Répartition par nombre de groupes de produits par catégorie:');
  Object.entries(byProductCount).forEach(([range, count]) => {
    console.log(`   ${range}: ${count} catégories`);
  });
  console.log('');

  // Sauvegarder
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `arborescence-from-tecdoc-results-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'tecdoc-results files',
      totalFiles: processed,
      totalCategories,
      categoriesWithProducts,
      totalProductGroups,
      byLevel,
    },
    categories: finalCategories,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Arborescence sauvegardée dans: ${outputPath}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de catégories avec groupes de produits:\n');
  let examplesShown = 0;
  for (const category of Object.values(finalCategories)) {
    if (category.productGroups.length > 0 && examplesShown < 5) {
      console.log(`   ${category.name} (niveau ${category.level}):`);
      console.log(`      Chemin: ${category.path.join(' > ')}`);
      console.log(`      ${category.productGroups.length} groupes de produits`);
      category.productGroups.slice(0, 3).forEach(pg => {
        console.log(`        - ${pg.productName}`);
      });
      if (category.productGroups.length > 3) {
        console.log(`        ... et ${category.productGroups.length - 3} autres`);
      }
      console.log('');
      examplesShown++;
    }
  }
}

buildArborescenceFromTecDocResults().catch(console.error);

