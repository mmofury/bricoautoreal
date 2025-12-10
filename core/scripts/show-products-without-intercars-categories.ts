// Script pour afficher des exemples de produits sans catégories InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showProductsWithoutInterCarsCategories() {
  console.log('🔍 Produits sans catégories InterCars...\n');

  // Récupérer des exemples de produits avec ProductGroup mais sans catégories InterCars
  const productsWithoutCategories = await prisma.product.findMany({
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
    include: {
      productGroup: {
        include: {
          categories: {
            include: {
              category: {
                select: {
                  name: true,
                  displayId: true,
                },
              },
            },
            take: 5,
          },
        },
      },
    },
    take: 10,
  });

  console.log(`📦 Exemples de produits sans catégories InterCars (10 premiers):\n`);

  productsWithoutCategories.forEach((product, index) => {
    console.log(`${index + 1}. Article: ${product.articleNo}`);
    console.log(`   ProductName: "${product.productName}"`);
    console.log(`   ProductGroup: "${product.productGroup?.productName}"`);
    console.log(`   Catégories totales: ${product.productGroup?.categories.length || 0}`);
    
    if (product.productGroup && product.productGroup.categories.length > 0) {
      console.log(`   Catégories (non InterCars):`);
      product.productGroup.categories.forEach(rel => {
        console.log(`      - ${rel.category.name} [${rel.category.displayId}]`);
      });
    } else {
      console.log(`   ❌ Aucune catégorie associée`);
    }
    console.log('');
  });

  // Statistiques
  const totalProducts = await prisma.product.count();
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

  const productsWithoutInterCars = totalProducts - productsWithInterCars;

  console.log(`\n📊 Statistiques:`);
  console.log(`   Total produits: ${totalProducts}`);
  console.log(`   Avec catégories InterCars: ${productsWithInterCars} (${((productsWithInterCars / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   Sans catégories InterCars: ${productsWithoutInterCars} (${((productsWithoutInterCars / totalProducts) * 100).toFixed(2)}%)\n`);

  // Analyser les ProductGroup sans catégories InterCars
  const groupsWithoutInterCars = await prisma.productGroup.findMany({
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
      products: {
        select: {
          id: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              name: true,
              displayId: true,
            },
          },
        },
        take: 3,
      },
    },
    take: 10,
  });

  console.log(`📦 ProductGroup sans catégories InterCars (10 premiers):\n`);
  groupsWithoutInterCars.forEach((group, index) => {
    console.log(`${index + 1}. ${group.productName}`);
    console.log(`   Produits: ${group.products.length}`);
    console.log(`   Catégories totales: ${group.categories.length}`);
    if (group.categories.length > 0) {
      console.log(`   Catégories (non InterCars):`);
      group.categories.forEach(rel => {
        console.log(`      - ${rel.category.name} [${rel.category.displayId}]`);
      });
    }
    console.log('');
  });

  await prisma.$disconnect();
}

showProductsWithoutInterCarsCategories().catch(console.error);
























