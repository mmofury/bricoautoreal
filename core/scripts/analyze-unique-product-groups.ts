// Script pour analyser les groupes de produits uniques dans l'arborescence
import * as fs from 'fs';
import * as path from 'path';

interface ProductGroup {
  productName: string;
  productId?: number;
}

interface BuiltCategoryNode {
  id: string;
  name: string;
  tecdocCategoryId: number | null;
  level: number;
  path: string[];
  productGroups: ProductGroup[];
  children: Record<string, BuiltCategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, BuiltCategoryNode>;
}

function collectAllProductGroups(
  categories: Record<string, BuiltCategoryNode>,
  uniqueGroups: Map<string, { productName: string; productId?: number; categories: string[] }> = new Map()
): Map<string, { productName: string; productId?: number; categories: string[] }> {
  for (const category of Object.values(categories)) {
    // Ajouter les groupes de produits de cette catégorie
    for (const pg of category.productGroups) {
      const key = pg.productId ? `id_${pg.productId}` : pg.productName;
      
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, {
          productName: pg.productName,
          productId: pg.productId,
          categories: [],
        });
      }
      
      const group = uniqueGroups.get(key)!;
      const categoryPath = category.path.join(' > ');
      if (!group.categories.includes(categoryPath)) {
        group.categories.push(categoryPath);
      }
    }

    // Récursivement traiter les enfants
    if (Object.keys(category.children).length > 0) {
      collectAllProductGroups(category.children, uniqueGroups);
    }
  }

  return uniqueGroups;
}

async function analyzeUniqueProductGroups() {
  console.log('🔍 Analyse des groupes de produits uniques...\n');

  // Charger l'arborescence
  const arborescenceFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('arborescence-from-tecdoc-results-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (arborescenceFiles.length === 0) {
    console.error('❌ Aucun fichier arborescence-from-tecdoc-results-*.json trouvé!');
    return;
  }

  const latestFile = arborescenceFiles[0];
  console.log(`📂 Chargement: ${latestFile}`);
  const data: ArborescenceData = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

  // Collecter tous les groupes de produits uniques
  const uniqueGroups = collectAllProductGroups(data.categories);

  // Compter les occurrences totales
  let totalOccurrences = 0;
  const byCategoryCount: Record<number, number> = {}; // Combien de groupes apparaissent dans X catégories

  uniqueGroups.forEach(group => {
    totalOccurrences += group.categories.length;
    const categoryCount = group.categories.length;
    byCategoryCount[categoryCount] = (byCategoryCount[categoryCount] || 0) + 1;
  });

  console.log('\n📊 Statistiques:\n');
  console.log(`   📦 Groupes de produits uniques: ${uniqueGroups.size}`);
  console.log(`   📍 Occurrences totales (avec doublons): ${totalOccurrences}`);
  console.log(`   📈 Moyenne d'occurrences par groupe: ${(totalOccurrences / uniqueGroups.size).toFixed(2)}\n`);

  console.log('📊 Répartition par nombre de catégories où apparaît chaque groupe:');
  Object.keys(byCategoryCount)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(count => {
      const groups = byCategoryCount[parseInt(count)];
      console.log(`   ${count} catégorie(s): ${groups} groupes`);
    });
  console.log('');

  // Afficher les groupes qui apparaissent dans plusieurs catégories
  const multiCategoryGroups = Array.from(uniqueGroups.values())
    .filter(g => g.categories.length > 1)
    .sort((a, b) => b.categories.length - a.categories.length);

  if (multiCategoryGroups.length > 0) {
    console.log(`📋 Groupes apparaissant dans plusieurs catégories (${multiCategoryGroups.length} groupes):\n`);
    multiCategoryGroups.slice(0, 20).forEach(group => {
      console.log(`   "${group.productName}" (${group.categories.length} catégories):`);
      group.categories.forEach(catPath => {
        console.log(`      - ${catPath}`);
      });
      console.log('');
    });

    if (multiCategoryGroups.length > 20) {
      console.log(`   ... et ${multiCategoryGroups.length - 20} autres groupes\n`);
    }
  }

  // Sauvegarder le rapport
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `unique-product-groups-analysis-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      uniqueGroupsCount: uniqueGroups.size,
      totalOccurrences,
      averageOccurrences: totalOccurrences / uniqueGroups.size,
      byCategoryCount,
    },
    uniqueGroups: Array.from(uniqueGroups.values()).map(g => ({
      productName: g.productName,
      productId: g.productId,
      categoryCount: g.categories.length,
      categories: g.categories,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Rapport sauvegardé dans: ${outputPath}\n`);
}

analyzeUniqueProductGroups().catch(console.error);

























