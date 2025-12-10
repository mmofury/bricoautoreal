// Script pour matcher les groupes de produits avec l'arborescence categoriesbyvehicleid.json
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface CategoriesByVehicleId {
  categories: Record<string, CategoryNode>;
}

interface TecDocResultFile {
  productName: string;
  productId?: number;
  arborescencePaths?: Array<{
    path: string[];
    categoryIds: (number | null)[];
    finalCategoryId: number | null;
    productId?: number;
  }>;
}

interface ProductGroupMatch {
  productName: string;
  productId?: number;
  categoryId: string;
  categoryName: string;
  categoryPath: string[];
  matchType: 'exact' | 'path';
}

function collectAllCategoryIds(
  categories: Record<string, CategoryNode>,
  categoryIdMap: Map<number, { name: string; path: string[] }> = new Map(),
  currentPath: string[] = []
): Map<number, { name: string; path: string[] }> {
  for (const [id, category] of Object.entries(categories)) {
    const categoryIdNum = parseInt(id);
    const fullPath = [...currentPath, category.text];
    
    categoryIdMap.set(categoryIdNum, {
      name: category.text,
      path: fullPath,
    });

    if (Object.keys(category.children).length > 0) {
      collectAllCategoryIds(category.children, categoryIdMap, fullPath);
    }
  }

  return categoryIdMap;
}

async function matchProductGroupsToCategoriesByVehicleId() {
  console.log('🚀 Matching des groupes de produits avec categoriesbyvehicleid.json...\n');

  // Charger l'arborescence categoriesbyvehicleid.json
  const categoriesFilePath = path.join(process.cwd(), '..', 'categoriesbyvehicleid.json');
  if (!fs.existsSync(categoriesFilePath)) {
    console.error(`❌ Fichier introuvable: ${categoriesFilePath}`);
    return;
  }

  console.log(`📂 Chargement de categoriesbyvehicleid.json...`);
  const categoriesData: CategoriesByVehicleId = JSON.parse(
    fs.readFileSync(categoriesFilePath, 'utf-8')
  );

  // Créer un index de tous les categoryIds
  const categoryIdMap = collectAllCategoryIds(categoriesData.categories);
  console.log(`✅ ${categoryIdMap.size} catégories indexées\n`);

  // Traiter les fichiers tecdoc-results
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');

  const matches: ProductGroupMatch[] = [];
  const unmatchedGroups = new Set<string>();
  let processed = 0;

  const processFile = (filePath: string): void => {
    try {
      const content: TecDocResultFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!content.productName || !content.arborescencePaths) return;

      // Collecter tous les matches possibles pour ce groupe de produit
      const possibleMatches: ProductGroupMatch[] = [];

      // Parcourir tous les chemins d'arborescence
      for (const pathData of content.arborescencePaths) {
        if (!pathData.categoryIds || pathData.categoryIds.length === 0) continue;

        // Chercher toutes les correspondances avec les categoryIds
        for (const categoryId of pathData.categoryIds) {
          if (categoryId === null) continue;

          const categoryInfo = categoryIdMap.get(categoryId);
          if (categoryInfo) {
            possibleMatches.push({
              productName: content.productName,
              productId: content.productId,
              categoryId: categoryId.toString(),
              categoryName: categoryInfo.name,
              categoryPath: categoryInfo.path,
              matchType: 'exact',
            });
          }
        }
      }

      // Choisir le match le plus profond (chemin le plus long)
      if (possibleMatches.length > 0) {
        // Trier par profondeur (longueur du chemin) décroissante
        possibleMatches.sort((a, b) => {
          const depthA = a.categoryPath.length;
          const depthB = b.categoryPath.length;
          if (depthA !== depthB) {
            return depthB - depthA; // Plus profond en premier
          }
          // En cas d'égalité, garder l'ordre original
          return 0;
        });

        // Prendre le match le plus profond
        matches.push(possibleMatches[0]);
      } else {
        unmatchedGroups.add(content.productName);
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
    for (const file of files1) {
      processFile(path.join(dir1, file));
    }
  }

  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    for (const file of files2) {
      processFile(path.join(dir2, file));
    }
  }

  console.log(`   ✅ ${processed} fichiers traités\n`);

  // Statistiques
  const uniqueProductGroups = new Set(matches.map(m => m.productName));
  const matchesByCategory = new Map<string, ProductGroupMatch[]>();

  for (const match of matches) {
    if (!matchesByCategory.has(match.categoryId)) {
      matchesByCategory.set(match.categoryId, []);
    }
    matchesByCategory.get(match.categoryId)!.push(match);
  }

  console.log('📊 Statistiques:\n');
  console.log(`   📦 Total groupes de produits traités: ${processed}`);
  console.log(`   ✅ Groupes avec correspondance: ${uniqueProductGroups.size}`);
  console.log(`   ❌ Groupes sans correspondance: ${unmatchedGroups.size}`);
  console.log(`   📍 Total correspondances: ${matches.length}`);
  console.log(`   📁 Catégories avec groupes de produits: ${matchesByCategory.size}\n`);

  // Répartition par niveau
  const byLevel: Record<number, { categories: number; productGroups: number }> = {};
  for (const [categoryId, categoryMatches] of matchesByCategory.entries()) {
    const categoryInfo = categoryIdMap.get(parseInt(categoryId));
    if (categoryInfo) {
      const level = categoryInfo.path.length;
      if (!byLevel[level]) {
        byLevel[level] = { categories: 0, productGroups: 0 };
      }
      byLevel[level].categories++;
      byLevel[level].productGroups += categoryMatches.length;
    }
  }

  console.log('📊 Répartition par niveau:');
  Object.keys(byLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(level => {
      const stats = byLevel[parseInt(level)];
      console.log(`   Niveau ${level}: ${stats.categories} catégories, ${stats.productGroups} groupes de produits`);
    });
  console.log('');

  // Top 10 catégories avec le plus de groupes
  const topCategories = Array.from(matchesByCategory.entries())
    .map(([categoryId, categoryMatches]) => {
      const categoryInfo = categoryIdMap.get(parseInt(categoryId));
      return {
        categoryId,
        categoryName: categoryInfo?.name || 'Unknown',
        categoryPath: categoryInfo?.path || [],
        count: categoryMatches.length,
        productGroups: categoryMatches.map(m => m.productName),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log('📋 Top 10 catégories avec le plus de groupes de produits:\n');
  topCategories.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.categoryName} (ID: ${cat.categoryId})`);
    console.log(`      Chemin: ${cat.categoryPath.join(' > ')}`);
    console.log(`      ${cat.count} groupes de produits`);
    console.log(`      Exemples: ${cat.productGroups.slice(0, 3).join(', ')}${cat.productGroups.length > 3 ? '...' : ''}`);
    console.log('');
  });

  // Reconstruire l'arborescence complète avec les groupes de produits
  function buildFullArborescence(
    categories: Record<string, CategoryNode>,
    matchesByCategory: Map<string, ProductGroupMatch[]>,
    categoryIdMap: Map<number, { name: string; path: string[] }>,
    currentPath: string[] = []
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [id, category] of Object.entries(categories)) {
      const categoryIdNum = parseInt(id);
      const fullPath = [...currentPath, category.text];
      const categoryInfo = categoryIdMap.get(categoryIdNum);

      const categoryData: any = {
        categoryName: category.text,
        categoryPath: fullPath,
        productGroups: [],
      };

      // Ajouter les groupes de produits s'ils existent
      const categoryMatches = matchesByCategory.get(id);
      if (categoryMatches) {
        categoryData.productGroups = categoryMatches.map(m => ({
          productName: m.productName,
          productId: m.productId,
        }));
      }

      // Traiter les enfants
      if (Object.keys(category.children).length > 0) {
        categoryData.children = buildFullArborescence(
          category.children,
          matchesByCategory,
          categoryIdMap,
          fullPath
        );
      }

      result[id] = categoryData;
    }

    return result;
  }

  const fullArborescence = buildFullArborescence(
    categoriesData.categories,
    matchesByCategory,
    categoryIdMap
  );

  // Sauvegarder les résultats
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `product-groups-categoriesbyvehicleid-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'categoriesbyvehicleid.json',
      totalFiles: processed,
      totalMatches: matches.length,
      uniqueProductGroups: uniqueProductGroups.size,
      unmatchedGroups: unmatchedGroups.size,
      categoriesWithProducts: matchesByCategory.size,
      byLevel,
    },
    matches: matches,
    matchesByCategory: Object.fromEntries(
      Array.from(matchesByCategory.entries()).map(([categoryId, categoryMatches]) => {
        const categoryInfo = categoryIdMap.get(parseInt(categoryId));
        return [
          categoryId,
          {
            categoryName: categoryInfo?.name || 'Unknown',
            categoryPath: categoryInfo?.path || [],
            productGroups: categoryMatches.map(m => ({
              productName: m.productName,
              productId: m.productId,
            })),
          },
        ];
      })
    ),
    fullArborescence: fullArborescence,
    unmatchedGroups: Array.from(unmatchedGroups),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
}

matchProductGroupsToCategoriesByVehicleId().catch(console.error);

