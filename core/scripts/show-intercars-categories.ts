// Script pour afficher les correspondances InterCarsCategory
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showInterCarsCategories() {
  console.log('📊 Correspondances InterCarsCategory...\n');

  // Statistiques globales
  const total = await prisma.interCarsCategory.count();
  const uniqueProductNames = await prisma.interCarsCategory.groupBy({
    by: ['productName'],
    _count: {
      productName: true,
    },
  });

  console.log(`📦 Statistiques:`);
  console.log(`   Total correspondances: ${total}`);
  console.log(`   ProductName uniques: ${uniqueProductNames.length}\n`);

  // ProductName avec plusieurs catégories
  const productNamesWithMultipleCategories = uniqueProductNames.filter(
    (g) => g._count.productName > 1
  );

  console.log(`📋 ProductName avec plusieurs catégories: ${productNamesWithMultipleCategories.length}\n`);

  // Afficher les 20 premiers exemples
  console.log(`📋 Exemples de correspondances (20 premiers):\n`);
  const examples = await prisma.interCarsCategory.findMany({
    take: 20,
    orderBy: {
      productName: 'asc',
    },
  });

  examples.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.productName}`);
    console.log(`   csvId: ${cat.csvId}`);
    console.log(`   Catégorie: ${cat.categoryName} [${cat.genericArticleId}]`);
    console.log(`   Primary: ${cat.isPrimary ? 'Oui' : 'Non'}`);
    console.log('');
  });

  // ProductName avec plusieurs catégories (exemples)
  if (productNamesWithMultipleCategories.length > 0) {
    console.log(`\n📋 Exemples de ProductName avec plusieurs catégories:\n`);
    const multiCategoryExamples = await prisma.interCarsCategory.findMany({
      where: {
        productName: {
          in: productNamesWithMultipleCategories.slice(0, 5).map((g) => g.productName),
        },
      },
      orderBy: {
        productName: 'asc',
      },
    });

    let currentProductName = '';
    multiCategoryExamples.forEach((cat) => {
      if (cat.productName !== currentProductName) {
        currentProductName = cat.productName;
        console.log(`\n${currentProductName}:`);
      }
      console.log(`   - ${cat.categoryName} [${cat.genericArticleId}] (csvId: ${cat.csvId}, primary: ${cat.isPrimary})`);
    });
  }

  // Top 10 des catégories les plus fréquentes
  console.log(`\n📊 Top 10 des catégories InterCars les plus fréquentes:\n`);
  const topCategories = await prisma.interCarsCategory.groupBy({
    by: ['genericArticleId', 'categoryName'],
    _count: {
      genericArticleId: true,
    },
    orderBy: {
      _count: {
        genericArticleId: 'desc',
      },
    },
    take: 10,
  });

  topCategories.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.categoryName} [${cat.genericArticleId}]: ${cat._count.genericArticleId} correspondances`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Terminé!');
}

showInterCarsCategories().catch(console.error);
























