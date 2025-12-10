// Script pour afficher l'arborescence des catégories TecDoc
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  level: number;
  displayId: string;
  children: CategoryNode[];
  productCount?: number;
}

async function buildCategoryTree(categories: any[]): Promise<CategoryNode[]> {
  const categoryMap = new Map<number, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // Créer tous les nœuds
  for (const cat of categories) {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      level: cat.level,
      displayId: cat.displayId,
      children: [],
      productCount: cat.productGroups ? cat.productGroups.length : 0,
    });
  }

  // Construire l'arbre
  for (const cat of categories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId === null) {
      rootCategories.push(node);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent non trouvé, traiter comme racine
        rootCategories.push(node);
      }
    }
  }

  // Trier les enfants par nom
  function sortChildren(node: CategoryNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  }
  rootCategories.forEach(sortChildren);
  rootCategories.sort((a, b) => a.name.localeCompare(b.name));

  return rootCategories;
}

function printTree(nodes: CategoryNode[], prefix = '', isLast = true) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;
    const currentPrefix = isLast ? prefix + '└── ' : prefix + '├── ';
    
    const productInfo = node.productCount ? ` (${node.productCount} produits)` : '';
    console.log(`${currentPrefix}${node.name} [Niveau ${node.level}]${productInfo}`);
    
    if (node.children.length > 0) {
      const nextPrefix = isLast ? prefix + '    ' : prefix + '│   ';
      printTree(node.children, nextPrefix, isLastNode);
    }
  }
}

async function showTecDocArborescence() {
  console.log('🌳 Chargement de l\'arborescence des catégories TecDoc...\n');

  // Récupérer toutes les catégories avec leurs relations
  const categories = await prisma.tecDocCategory.findMany({
    include: {
      productGroups: true,
    },
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
    ],
  });

  console.log(`📊 Total: ${categories.length} catégories\n`);

  // Construire l'arbre
  const tree = await buildCategoryTree(categories);

  // Afficher les statistiques par niveau
  const statsByLevel = new Map<number, { count: number; withProducts: number }>();
  for (const cat of categories) {
    const stats = statsByLevel.get(cat.level) || { count: 0, withProducts: 0 };
    stats.count++;
    if (cat.productGroups && cat.productGroups.length > 0) {
      stats.withProducts++;
    }
    statsByLevel.set(cat.level, stats);
  }

  console.log('📊 Statistiques par niveau:');
  for (const [level, stats] of Array.from(statsByLevel.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`   Niveau ${level}: ${stats.count} catégories (${stats.withProducts} avec produits)`);
  }
  console.log('');

  // Afficher l'arborescence complète
  console.log('🌳 Arborescence complète:\n');
  printTree(tree);

  // Afficher quelques exemples de catégories avec produits
  console.log('\n\n📦 Exemples de catégories avec produits:\n');
  const categoriesWithProducts = categories
    .filter(cat => cat.productGroups && cat.productGroups.length > 0)
    .sort((a, b) => (b.productGroups?.length || 0) - (a.productGroups?.length || 0))
    .slice(0, 10);

  for (const cat of categoriesWithProducts) {
    const path = await getCategoryPath(cat.id);
    console.log(`   ${path.join(' > ')} (${cat.productGroups ? cat.productGroups.length : 0} produits)`);
  }

  await prisma.$disconnect();
}

async function getCategoryPath(categoryId: number): Promise<string[]> {
  const path: string[] = [];
  let currentId: number | null = categoryId;

  while (currentId !== null) {
    const category = await prisma.tecDocCategory.findUnique({
      where: { id: currentId },
      select: { name: true, parentId: true },
    });
    if (!category) break;
    path.unshift(category.name);
    currentId = category.parentId;
  }

  return path;
}

showTecDocArborescence().catch(console.error);

