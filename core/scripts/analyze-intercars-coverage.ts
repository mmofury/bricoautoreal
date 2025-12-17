// Script pour analyser la couverture InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeInterCarsCoverage() {
  console.log('📊 Analyse de la couverture InterCars...\n');

  // Statistiques globales
  const totalProducts = await prisma.product.count();
  const totalProductGroups = await prisma.productGroup.count();

  // ProductGroup avec catégories InterCars
  const groupsWithInterCars = await prisma.productGroup.count({
    where: {
      categories: {
        some: {
          category: {
            OR: [
              { displayId: { startsWith: 'GenericArticle_' } },
              { displayId: { startsWith: 'SalesClassificationNode_' } },
            ],
          },
        },
      },
    },
  });

  // Produits avec catégories InterCars
  const productsWithInterCars = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
      productGroup: {
        categories: {
          some: {
            category: {
              OR: [
                { displayId: { startsWith: 'GenericArticle_' } },
                { displayId: { startsWith: 'SalesClassificationNode_' } },
              ],
            },
          },
        },
      },
    },
  });

  // ProductGroup sans catégories InterCars
  const groupsWithoutInterCars = totalProductGroups - groupsWithInterCars;

  // Produits dans des ProductGroup sans catégories InterCars
  const productsInGroupsWithoutInterCars = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
      productGroup: {
        categories: {
          none: {
            category: {
              OR: [
                { displayId: { startsWith: 'GenericArticle_' } },
                { displayId: { startsWith: 'SalesClassificationNode_' } },
              ],
            },
          },
        },
      },
    },
  });

  console.log(`📦 Statistiques globales:`);
  console.log(`   Total produits: ${totalProducts.toLocaleString()}`);
  console.log(`   Total ProductGroup: ${totalProductGroups.toLocaleString()}\n`);

  console.log(`🔗 ProductGroup:`);
  console.log(`   Avec catégories InterCars: ${groupsWithInterCars} (${((groupsWithInterCars / totalProductGroups) * 100).toFixed(2)}%)`);
  console.log(`   Sans catégories InterCars: ${groupsWithoutInterCars} (${((groupsWithoutInterCars / totalProductGroups) * 100).toFixed(2)}%)\n`);

  console.log(`📊 Produits:`);
  console.log(`   Avec catégories InterCars: ${productsWithInterCars.toLocaleString()} (${((productsWithInterCars / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   Dans ProductGroup sans InterCars: ${productsInGroupsWithoutInterCars.toLocaleString()} (${((productsInGroupsWithoutInterCars / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   Sans ProductGroup: ${(totalProducts - productsWithInterCars - productsInGroupsWithoutInterCars).toLocaleString()}\n`);

  // Top ProductGroup sans catégories InterCars (par nombre de produits)
  console.log(`📋 Top 20 ProductGroup sans catégories InterCars (par nombre de produits):\n`);
  const topGroupsWithoutInterCars = await prisma.productGroup.findMany({
    where: {
      categories: {
        none: {
          category: {
            OR: [
              { displayId: { startsWith: 'GenericArticle_' } },
              { displayId: { startsWith: 'SalesClassificationNode_' } },
            ],
          },
        },
      },
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      products: {
        _count: 'desc',
      },
    },
    take: 20,
  });

  topGroupsWithoutInterCars.forEach((group, index) => {
    console.log(`   ${index + 1}. ${group.productName}: ${group._count.products.toLocaleString()} produits`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Analyse terminée!');
}

analyzeInterCarsCoverage().catch(console.error);

























