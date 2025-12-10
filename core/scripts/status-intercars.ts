// Script pour afficher le statut actuel du projet InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showStatus() {
  console.log('📊 Statut actuel du projet InterCars...\n');

  // 1. ProductSample
  const productSamples = await prisma.productSample.count();
  console.log(`1️⃣  ProductSample:`);
  console.log(`   Total: ${productSamples}\n`);

  // 2. InterCarsCategory (correspondances)
  const interCarsCategories = await prisma.interCarsCategory.count();
  const uniqueProductNames = await prisma.interCarsCategory.groupBy({
    by: ['productName'],
    _count: true,
  });
  console.log(`2️⃣  InterCarsCategory (correspondances):`);
  console.log(`   Total correspondances: ${interCarsCategories}`);
  console.log(`   ProductName uniques: ${uniqueProductNames.length}\n`);

  // 3. Produits dans la DB
  const totalProducts = await prisma.product.count();
  const productsWithProductName = await prisma.product.count({
    where: {
      productName: {
        not: null,
      },
    },
  });
  console.log(`3️⃣  Produits dans la DB:`);
  console.log(`   Total: ${totalProducts.toLocaleString()}`);
  console.log(`   Avec productName: ${productsWithProductName.toLocaleString()}\n`);

  // 4. Produits qui ont un productName correspondant à InterCarsCategory
  const productNamesInInterCars = uniqueProductNames.map(g => g.productName);
  const productsWithInterCarsCategory = await prisma.product.count({
    where: {
      productName: {
        in: productNamesInInterCars,
      },
    },
  });
  console.log(`4️⃣  Produits pouvant être catégorisés:`);
  console.log(`   Produits avec productName dans InterCarsCategory: ${productsWithInterCarsCategory.toLocaleString()}`);
  console.log(`   Pourcentage: ${((productsWithInterCarsCategory / totalProducts) * 100).toFixed(2)}%\n`);

  // 5. Arborescence TecDocCategory
  const tecDocCategories = await prisma.tecDocCategory.count();
  console.log(`5️⃣  Arborescence TecDocCategory:`);
  console.log(`   Total catégories: ${tecDocCategories}\n`);

  // 6. Relations ProductGroupCategory
  const productGroupCategories = await prisma.productGroupCategory.count();
  console.log(`6️⃣  Relations ProductGroupCategory:`);
  console.log(`   Total relations: ${productGroupCategories}\n`);

  // 7. ProductGroup
  const productGroups = await prisma.productGroup.count();
  console.log(`7️⃣  ProductGroup:`);
  console.log(`   Total: ${productGroups}\n`);

  // Résumé
  console.log('📋 Résumé:');
  console.log(`   ✅ ${productSamples} ProductSample traités`);
  console.log(`   ✅ ${interCarsCategories} correspondances InterCars enregistrées`);
  console.log(`   ✅ ${uniqueProductNames.length} productName uniques avec catégories InterCars`);
  console.log(`   ⏳ ${productsWithInterCarsCategory.toLocaleString()} produits à catégoriser (${((productsWithInterCarsCategory / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   ⏳ Arborescence: ${tecDocCategories} catégories créées`);
  console.log(`   ⏳ Relations: ${productGroupCategories} relations créées\n`);

  // Prochaines étapes
  console.log('🎯 Prochaines étapes possibles:');
  console.log('   1. Généraliser les catégories InterCars à tous les produits');
  console.log('   2. Créer/remplir l\'arborescence TecDocCategory à partir des catégories InterCars');
  console.log('   3. Lier les produits aux catégories de l\'arborescence\n');

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

showStatus().catch(console.error);
























