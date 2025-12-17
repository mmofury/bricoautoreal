// Script pour générer l'arborescence complète avec tous les niveaux et les groupes de produits intégrés
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, CategoryNode>;
}

interface ProductGroupAssociation {
  productName: string;
  productId?: number;
  categoryId: string;
  categoryName: string;
  categoryLevel: number;
  categoryPath: string[];
  confidence: string;
}

interface EnrichedCategoryNode {
  id: string;
  name: string;
  level: number;
  path: string[];
  productGroups: Array<{
    productName: string;
    productId?: number;
    confidence: string;
  }>;
  children: Record<string, EnrichedCategoryNode>;
}

function enrichCategoryNode(
  node: CategoryNode,
  nodeId: string,
  level: number,
  parentPath: string[],
  associationsByCategoryId: Map<string, ProductGroupAssociation[]>
): EnrichedCategoryNode {
  const currentPath = [...parentPath, node.text];
  const productGroups = associationsByCategoryId.get(nodeId) || [];

  const enriched: EnrichedCategoryNode = {
    id: nodeId,
    name: node.text,
    level,
    path: currentPath,
    productGroups: productGroups.map(assoc => ({
      productName: assoc.productName,
      productId: assoc.productId,
      confidence: assoc.confidence,
    })),
    children: {},
  };

  // Récursivement enrichir les enfants
  if (node.children && Object.keys(node.children).length > 0) {
    for (const [childId, childNode] of Object.entries(node.children)) {
      enriched.children[childId] = enrichCategoryNode(
        childNode,
        childId,
        level + 1,
        currentPath,
        associationsByCategoryId
      );
    }
  }

  return enriched;
}

async function generateFullArborescenceWithProducts() {
  console.log('🚀 Génération de l\'arborescence complète avec groupes de produits...\n');

  // 1. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));
  console.log(`   ✅ Arborescence chargée\n`);

  // 2. Charger les associations groupes de produits -> catégories
  console.log('📂 Chargement des associations groupes de produits...');
  const matchingFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('product-groups-categories-simplified-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (matchingFiles.length === 0) {
    console.error('❌ Aucun fichier product-groups-categories-simplified-*.json trouvé!');
    console.error('   Exécutez d\'abord: pnpm tecdoc:match-to-arborescence');
    return;
  }

  const latestFile = matchingFiles[0];
  console.log(`   ✅ Fichier trouvé: ${latestFile}`);
  const matchingData = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

  const associations: ProductGroupAssociation[] = matchingData.associations || [];
  console.log(`   ✅ ${associations.length} associations chargées\n`);

  // 3. Créer un index des associations par categoryId
  console.log('🔍 Création de l\'index des associations...');
  const associationsByCategoryId = new Map<string, ProductGroupAssociation[]>();

  associations.forEach(assoc => {
    if (!associationsByCategoryId.has(assoc.categoryId)) {
      associationsByCategoryId.set(assoc.categoryId, []);
    }
    associationsByCategoryId.get(assoc.categoryId)!.push(assoc);
  });

  console.log(`   ✅ ${associationsByCategoryId.size} catégories avec groupes de produits\n`);

  // 4. Enrichir l'arborescence avec les groupes de produits
  console.log('🔄 Enrichissement de l\'arborescence...');
  const enrichedCategories: Record<string, EnrichedCategoryNode> = {};

  for (const [categoryId, categoryNode] of Object.entries(arborescence.categories)) {
    enrichedCategories[categoryId] = enrichCategoryNode(
      categoryNode,
      categoryId,
      1,
      [],
      associationsByCategoryId
    );
  }

  console.log(`   ✅ Arborescence enrichie\n`);

  // 5. Statistiques
  let totalCategories = 0;
  let categoriesWithProducts = 0;
  let totalProductGroups = 0;
  const byLevel: Record<number, { total: number; withProducts: number; productGroups: number }> = {};

  function countStats(node: EnrichedCategoryNode) {
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

  for (const category of Object.values(enrichedCategories)) {
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
      console.log(`   Niveau ${level}: ${stats.total} catégories, ${stats.withProducts} avec produits (${stats.productGroups} groupes)`);
    });
  console.log('');

  // 6. Sauvegarder le résultat
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `arborescence-complete-with-products-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCategories,
      categoriesWithProducts,
      totalProductGroups,
      byLevel,
    },
    categories: enrichedCategories,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Arborescence complète sauvegardée dans: ${outputPath}\n`);

  // 7. Afficher quelques exemples
  console.log('📋 Exemples de catégories avec groupes de produits:\n');
  let examplesShown = 0;
  for (const category of Object.values(enrichedCategories)) {
    if (category.productGroups.length > 0 && examplesShown < 5) {
      console.log(`   ${category.name} (niveau ${category.level}):`);
      console.log(`      Chemin: ${category.path.join(' > ')}`);
      console.log(`      ${category.productGroups.length} groupes de produits:`);
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

generateFullArborescenceWithProducts().catch(console.error);


























