// Script pour analyser la couverture des produits dans les catégories
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeProductCoverage() {
  console.log('📊 Analyse de la couverture des produits dans les catégories...\n');

  // Compter tous les ProductGroup
  const totalProductGroups = await prisma.productGroup.count();
  console.log(`📦 Total de groupes de produits: ${totalProductGroups}`);

  // Compter les ProductGroup avec au moins une catégorie
  const productGroupsWithCategories = await prisma.productGroup.count({
    where: {
      categories: {
        some: {},
      },
    },
  });

  // Compter les ProductGroup sans catégorie
  const productGroupsWithoutCategories = totalProductGroups - productGroupsWithCategories;

  console.log(`✅ Groupes avec catégories: ${productGroupsWithCategories} (${((productGroupsWithCategories / totalProductGroups) * 100).toFixed(2)}%)`);
  console.log(`❌ Groupes sans catégories: ${productGroupsWithoutCategories} (${((productGroupsWithoutCategories / totalProductGroups) * 100).toFixed(2)}%)\n`);

  // Récupérer les catégories avec le plus de produits, triées par nombre de produits
  console.log('🏆 Top 50 catégories avec le plus de produits:\n');
  
  const topCategories = await prisma.tecDocCategory.findMany({
    include: {
      productGroups: {
        select: {
          id: true,
        },
      },
      parent: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
    orderBy: {
      productGroups: {
        _count: 'desc',
      },
    },
    take: 50,
  });

  // Construire le chemin complet pour chaque catégorie
  function getCategoryPath(category: any): string {
    const path: string[] = [];
    let current: any = category;
    
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    
    return path.join(' > ');
  }

  console.log('Rang | Catégorie | Nombre de produits | Niveau');
  console.log('-----|-----------|-------------------|-------');
  
  topCategories.forEach((category, index) => {
    const productCount = category.productGroups ? category.productGroups.length : 0;
    const path = getCategoryPath(category);
    console.log(`${String(index + 1).padStart(4)} | ${path.padEnd(50).substring(0, 50)} | ${String(productCount).padStart(17)} | ${category.level}`);
  });

  // Statistiques par niveau
  console.log('\n\n📊 Statistiques par niveau:\n');
  
  const categoriesByLevel = await prisma.tecDocCategory.groupBy({
    by: ['level'],
    _count: {
      id: true,
    },
    where: {
      productGroups: {
        some: {},
      },
    },
  });

  for (const level of categoriesByLevel.sort((a, b) => a.level - b.level)) {
    const categories = await prisma.tecDocCategory.findMany({
      where: {
        level: level.level,
        productGroups: {
          some: {},
        },
      },
      include: {
        productGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    const totalProducts = categories.reduce((sum, cat) => sum + (cat.productGroups?.length || 0), 0);
    const avgProducts = categories.length > 0 ? (totalProducts / categories.length).toFixed(2) : '0';
    const maxProducts = Math.max(...categories.map(cat => cat.productGroups?.length || 0), 0);

    console.log(`Niveau ${level.level}:`);
    console.log(`   Catégories avec produits: ${level._count.id}`);
    console.log(`   Total produits: ${totalProducts}`);
    console.log(`   Moyenne par catégorie: ${avgProducts}`);
    console.log(`   Maximum: ${maxProducts}`);
    console.log('');
  }

  // Afficher quelques exemples de groupes sans catégories
  if (productGroupsWithoutCategories > 0) {
    console.log('\n⚠️  Exemples de groupes de produits sans catégories:\n');
    const uncategorizedGroups = await prisma.productGroup.findMany({
      where: {
        categories: {
          none: {},
        },
      },
      take: 20,
      orderBy: {
        productName: 'asc',
      },
    });

    uncategorizedGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. ${group.productName}`);
    });

    if (productGroupsWithoutCategories > 20) {
      console.log(`   ... et ${productGroupsWithoutCategories - 20} autres`);
    }
  }

  await prisma.$disconnect();
}

analyzeProductCoverage().catch(console.error);
























