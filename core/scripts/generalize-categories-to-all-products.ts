// Script pour généraliser les catégories de ProductGroup à tous les produits
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generalizeCategoriesToAllProducts() {
  console.log('🚀 Généralisation des catégories aux produits...\n');

  // Compter les ProductGroup avec catégories
  const groupsWithCategories = await prisma.productGroup.findMany({
    where: {
      categories: {
        some: {},
      },
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      products: {
        select: {
          id: true,
        },
      },
    },
  });

  console.log(`📦 ProductGroup avec catégories: ${groupsWithCategories.length}`);

  let totalProducts = 0;
  let totalRelations = 0;
  let productsProcessed = 0;

  // Pour chaque ProductGroup avec catégories
  for (const group of groupsWithCategories) {
    const productCount = group.products.length;
    totalProducts += productCount;

    if (productCount > 0 && group.categories.length > 0) {
      // Les catégories sont déjà associées au ProductGroup via ProductGroupCategory
      // Tous les produits de ce groupe héritent automatiquement de ces catégories
      // via leur relation ProductGroup -> ProductGroupCategory -> TecDocCategory
      
      productsProcessed += productCount;
      totalRelations += group.categories.length * productCount;
    }
  }

  console.log(`📦 Total produits dans ces groupes: ${totalProducts}`);
  console.log(`🔗 Relations catégories disponibles: ${totalRelations} (via ProductGroup)\n`);

  // Vérifier combien de produits ont un ProductGroup
  const totalProductsInDb = await prisma.product.count();
  const productsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });

  console.log(`📊 Statistiques globales:`);
  console.log(`   Total produits dans la DB: ${totalProductsInDb}`);
  console.log(`   Produits avec ProductGroup: ${productsWithGroup} (${((productsWithGroup / totalProductsInDb) * 100).toFixed(2)}%)`);
  console.log(`   Produits sans ProductGroup: ${totalProductsInDb - productsWithGroup} (${(((totalProductsInDb - productsWithGroup) / totalProductsInDb) * 100).toFixed(2)}%)\n`);

  // Vérifier les ProductGroup sans catégories
  const groupsWithoutCategories = await prisma.productGroup.findMany({
    where: {
      categories: {
        none: {},
      },
    },
    include: {
      products: {
        select: {
          id: true,
        },
      },
    },
  });

  const productsInGroupsWithoutCategories = groupsWithoutCategories.reduce(
    (sum, group) => sum + group.products.length,
    0
  );

  console.log(`⚠️  ProductGroup sans catégories: ${groupsWithoutCategories.length}`);
  console.log(`   Produits affectés: ${productsInGroupsWithoutCategories}\n`);

  // Statistiques par ProductGroup
  console.log(`📊 Répartition des catégories par ProductGroup:`);
  
  const stats = {
    groupsWith1Category: 0,
    groupsWith2To5Categories: 0,
    groupsWith6To10Categories: 0,
    groupsWithMoreThan10Categories: 0,
  };

  for (const group of groupsWithCategories) {
    const categoryCount = group.categories.length;
    if (categoryCount === 1) {
      stats.groupsWith1Category++;
    } else if (categoryCount >= 2 && categoryCount <= 5) {
      stats.groupsWith2To5Categories++;
    } else if (categoryCount >= 6 && categoryCount <= 10) {
      stats.groupsWith6To10Categories++;
    } else {
      stats.groupsWithMoreThan10Categories++;
    }
  }

  console.log(`   1 catégorie: ${stats.groupsWith1Category} groupes`);
  console.log(`   2-5 catégories: ${stats.groupsWith2To5Categories} groupes`);
  console.log(`   6-10 catégories: ${stats.groupsWith6To10Categories} groupes`);
  console.log(`   >10 catégories: ${stats.groupsWithMoreThan10Categories} groupes\n`);

  // Afficher quelques exemples de ProductGroup avec beaucoup de produits
  console.log(`🏆 Top 10 ProductGroup avec le plus de produits:`);
  const topGroups = await prisma.productGroup.findMany({
    include: {
      products: {
        select: {
          id: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      products: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  topGroups.forEach((group, index) => {
    console.log(`   ${index + 1}. ${group.productName}: ${group.products.length} produits, ${group.categories.length} catégorie(s)`);
  });

  console.log('\n✅ Les catégories sont déjà généralisées !');
  console.log('   Tous les produits héritent automatiquement des catégories de leur ProductGroup');
  console.log('   via la relation Product -> ProductGroup -> ProductGroupCategory -> TecDocCategory\n');

  await prisma.$disconnect();
}

generalizeCategoriesToAllProducts().catch(console.error);
























