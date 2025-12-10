// Script pour supprimer les catégories non-InterCars et ne garder que les catégories InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeNonInterCarsCategories() {
  console.log('🧹 Suppression des catégories non-InterCars...\n');

  // Compter les relations ProductGroupCategory
  const totalRelations = await prisma.productGroupCategory.count();
  console.log(`📊 Total relations ProductGroupCategory: ${totalRelations}`);

  // Compter les relations avec catégories InterCars
  const interCarsRelations = await prisma.productGroupCategory.count({
    where: {
      category: {
        OR: [
          { displayId: { startsWith: 'GenericArticle_' } },
          { displayId: { startsWith: 'SalesClassificationNode_' } },
        ],
      },
    },
  });

  // Compter les relations avec catégories non-InterCars
  const nonInterCarsRelations = totalRelations - interCarsRelations;

  console.log(`   Relations InterCars: ${interCarsRelations} (${((interCarsRelations / totalRelations) * 100).toFixed(2)}%)`);
  console.log(`   Relations non-InterCars: ${nonInterCarsRelations} (${((nonInterCarsRelations / totalRelations) * 100).toFixed(2)}%)\n`);

  if (nonInterCarsRelations === 0) {
    console.log('✅ Aucune relation non-InterCars à supprimer\n');
    await prisma.$disconnect();
    return;
  }

  // Afficher quelques exemples de relations non-InterCars
  console.log('📋 Exemples de relations non-InterCars (10 premiers):\n');
  const examples = await prisma.productGroupCategory.findMany({
    where: {
      category: {
        AND: [
          { displayId: { not: { startsWith: 'GenericArticle_' } } },
          { displayId: { not: { startsWith: 'SalesClassificationNode_' } } },
        ],
      },
    },
    include: {
      productGroup: {
        select: {
          productName: true,
        },
      },
      category: {
        select: {
          name: true,
          displayId: true,
        },
      },
    },
    take: 10,
  });

  examples.forEach((rel, index) => {
    console.log(`   ${index + 1}. ${rel.productGroup.productName} → ${rel.category.name} [${rel.category.displayId}]`);
  });
  console.log('');

  // Supprimer les relations non-InterCars
  console.log('🗑️  Suppression des relations non-InterCars...\n');
  
  const deleted = await prisma.productGroupCategory.deleteMany({
    where: {
      category: {
        AND: [
          { displayId: { not: { startsWith: 'GenericArticle_' } } },
          { displayId: { not: { startsWith: 'SalesClassificationNode_' } } },
        ],
      },
    },
  });

  console.log(`✅ ${deleted.count} relations supprimées\n`);

  // Vérification finale
  const finalInterCarsRelations = await prisma.productGroupCategory.count({
    where: {
      category: {
        OR: [
          { displayId: { startsWith: 'GenericArticle_' } },
          { displayId: { startsWith: 'SalesClassificationNode_' } },
        ],
      },
    },
  });

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

  const totalProducts = await prisma.product.count();

  console.log(`📊 Résultats finaux:`);
  console.log(`   Relations InterCars: ${finalInterCarsRelations}`);
  console.log(`   Produits avec catégories InterCars: ${productsWithInterCars} / ${totalProducts} (${((productsWithInterCars / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

removeNonInterCarsCategories().catch(console.error);

