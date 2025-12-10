import { db } from '../lib/db';

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  level: number;
  url: string;
  children: CategoryNode[];
  productCount: number;
}

async function analyzeArborescence() {
  console.log('🌳 Analyse de l\'arborescence des catégories...\n');

  // Récupérer toutes les catégories
  const allCategories = await db.tecDocCategory.findMany({
    include: {
      productGroups: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
    ],
  });

  console.log(`📊 Total: ${allCategories.length} catégories\n`);

  // Créer un Map pour accès rapide
  const categoryMap = new Map<number, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // Créer les nœuds
  for (const cat of allCategories) {
    const node: CategoryNode = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      level: cat.level,
      url: cat.url,
      children: [],
      productCount: cat.productGroups.length,
    };
    categoryMap.set(cat.id, node);
  }

  // Construire la hiérarchie
  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id)!;
    
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent non trouvé, c'est une racine
        rootCategories.push(node);
      }
    } else {
      // Pas de parent, c'est une racine
      rootCategories.push(node);
    }
  }

  // Afficher l'arborescence
  function printTree(node: CategoryNode, indent: string = '', isLast: boolean = true) {
    const prefix = isLast ? '└── ' : '├── ';
    const productInfo = node.productCount > 0 ? ` (${node.productCount} produits)` : '';
    console.log(`${indent}${prefix}${node.name}${productInfo}`);
    console.log(`${indent}    URL: ${node.url}`);
    
    const childIndent = indent + (isLast ? '    ' : '│   ');
    for (let i = 0; i < node.children.length; i++) {
      printTree(node.children[i], childIndent, i === node.children.length - 1);
    }
  }

  // Afficher les catégories racines (niveau 1)
  console.log('📁 Catégories principales (niveau 1):\n');
  const level1Categories = allCategories.filter(c => c.level === 1);
  
  if (level1Categories.length > 0) {
    for (const cat of level1Categories.slice(0, 20)) { // Limiter à 20 pour l'affichage
      const node = categoryMap.get(cat.id)!;
      printTree(node);
      console.log('');
    }
    
    if (level1Categories.length > 20) {
      console.log(`... et ${level1Categories.length - 20} autres catégories de niveau 1\n`);
    }
  } else {
    // Si pas de niveau 1, afficher toutes les catégories sans parent
    console.log('📁 Toutes les catégories (sans hiérarchie parent):\n');
    for (const node of rootCategories.slice(0, 20)) {
      printTree(node);
      console.log('');
    }
  }

  // Statistiques par niveau
  console.log('\n📊 Statistiques par niveau:\n');
  const byLevel = new Map<number, number>();
  for (const cat of allCategories) {
    byLevel.set(cat.level, (byLevel.get(cat.level) || 0) + 1);
  }
  
  for (const [level, count] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`   Niveau ${level}: ${count} catégories`);
  }

  // Catégories avec le plus de produits
  console.log('\n🏆 Top 10 catégories avec le plus de produits:\n');
  const topCategories = allCategories
    .map(cat => ({
      name: cat.name,
      url: cat.url,
      count: cat.productGroups.length,
      level: cat.level,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const cat of topCategories) {
    console.log(`   ${cat.name} (niveau ${cat.level}): ${cat.count} produits`);
    console.log(`   ${cat.url}\n`);
  }

  await db.$disconnect();
}

analyzeArborescence().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























