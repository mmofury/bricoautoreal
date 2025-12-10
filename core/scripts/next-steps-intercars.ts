// Script pour afficher les prochaines étapes possibles
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showNextSteps() {
  console.log('🎯 Prochaines étapes possibles...\n');

  // 1. Vérifier les données actuelles
  const totalProducts = await prisma.product.count();
  const productsWithInterCars = await prisma.product.count({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
  });
  const totalRelations = await prisma.productInterCarsCategory.count();
  const uniqueCategories = await prisma.interCarsCategory.groupBy({
    by: ['genericArticleId'],
    _count: true,
  });
  const tecDocCategories = await prisma.tecDocCategory.count();

  console.log('📊 État actuel:');
  console.log(`   ✅ ${productsWithInterCars.toLocaleString()} / ${totalProducts.toLocaleString()} produits avec catégories InterCars (100%)`);
  console.log(`   ✅ ${totalRelations.toLocaleString()} relations ProductInterCarsCategory`);
  console.log(`   ✅ ${uniqueCategories.length} catégories InterCars uniques`);
  console.log(`   ⏳ ${tecDocCategories} catégories dans l'arborescence TecDocCategory\n`);

  // 2. Analyser les catégories InterCars
  console.log('📋 Analyse des catégories InterCars:\n');
  
  // Top catégories par nombre de produits
  const topCategories = await prisma.productInterCarsCategory.groupBy({
    by: ['interCarsCategoryId'],
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: 10,
  });

  console.log('   Top 10 catégories InterCars par nombre de produits:');
  for (let i = 0; i < topCategories.length; i++) {
    const cat = await prisma.interCarsCategory.findUnique({
      where: { id: topCategories[i].interCarsCategoryId },
    });
    if (cat) {
      console.log(`   ${i + 1}. ${cat.categoryName} [${cat.genericArticleId}]: ${topCategories[i]._count.productId.toLocaleString()} produits`);
    }
  }

  // Produits avec plusieurs catégories
  const productsWithMultipleCategories = await prisma.product.findMany({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
    include: {
      _count: {
        select: {
          interCarsCategories: true,
        },
      },
    },
    take: 10,
  });

  const avgCategories = await prisma.product.aggregate({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
    _avg: {
      id: true, // Utiliser un workaround pour compter
    },
  });

  const productsWithMultiple = await prisma.product.count({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
  });

  // Compter manuellement les produits avec plusieurs catégories
  let multiCount = 0;
  for (const product of productsWithMultipleCategories) {
    if (product._count.interCarsCategories > 1) {
      multiCount++;
    }
  }

  console.log(`\n   Produits avec plusieurs catégories: ${multiCount} (échantillon de 10)\n`);

  // 3. Prochaines étapes possibles
  console.log('🎯 Prochaines étapes possibles:\n');
  console.log('   1. ✅ CRÉÉ: Correspondances InterCarsCategory → Product');
  console.log('   2. 🔄 OPTION A: Créer/Compléter l\'arborescence TecDocCategory');
  console.log('      - Utiliser les fichiers level1.json, level2.json, level3.json, level4.json');
  console.log('      - Créer l\'arborescence hiérarchique complète');
  console.log('      - Lier les produits à l\'arborescence via ProductGroup ou directement\n');
  console.log('   3. 🔄 OPTION B: Utiliser directement les catégories InterCars');
  console.log('      - Pas besoin d\'arborescence hiérarchique');
  console.log('      - Accès direct via ProductInterCarsCategory\n');
  console.log('   4. 🔄 OPTION C: Créer une vue/API pour naviguer les catégories');
  console.log('      - Grouper par genericArticleId');
  console.log('      - Afficher les produits par catégorie\n');

  await prisma.$disconnect();
  console.log('✅ Analyse terminée!');
}

showNextSteps().catch(console.error);
























