// Script pour peupler la table ProductSample avec 2 produits par productName
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateProductSamples() {
  console.log('🚀 Peuplement de la table ProductSample...\n');

  // Vider la table d'abord
  console.log('🧹 Vidage de la table ProductSample...');
  await prisma.productSample.deleteMany({});
  console.log('   ✅ Table vidée\n');

  // Récupérer tous les productName uniques avec leurs produits
  console.log('📦 Récupération des produits groupés par productName...');
  
  const products = await prisma.product.findMany({
    where: {
      productName: { not: null },
      csvId: { not: null },
    },
    select: {
      id: true,
      csvId: true,
      productName: true,
    },
    orderBy: {
      id: 'asc', // Prendre les premiers produits (les plus anciens)
    },
  });

  console.log(`   ✅ ${products.length} produits trouvés\n`);

  // Grouper par productName et prendre max 2 par groupe
  const productNameMap = new Map<string, Array<{ csvId: string | null; productName: string | null }>>();

  for (const product of products) {
    if (!product.productName) continue;

    if (!productNameMap.has(product.productName)) {
      productNameMap.set(product.productName, []);
    }

    const group = productNameMap.get(product.productName)!;
    if (group.length < 2) {
      group.push({
        csvId: product.csvId,
        productName: product.productName,
      });
    }
  }

  console.log(`📊 ${productNameMap.size} productName uniques trouvés\n`);

  // Insérer dans ProductSample
  console.log('💾 Insertion dans ProductSample...');
  let inserted = 0;

  for (const [productName, samples] of productNameMap.entries()) {
    for (const sample of samples) {
      await prisma.productSample.create({
        data: {
          csvId: sample.csvId || null,
          productName: sample.productName || null,
        },
      });
      inserted++;
    }
  }

  console.log(`   ✅ ${inserted} échantillons insérés\n`);

  // Statistiques
  const totalSamples = await prisma.productSample.count();
  const uniqueProductNames = await prisma.productSample.groupBy({
    by: ['productName'],
    _count: true,
  });

  console.log('📊 Statistiques:');
  console.log(`   📦 Total échantillons: ${totalSamples}`);
  console.log(`   📁 ProductName uniques: ${uniqueProductNames.length}`);
  
  // Afficher la répartition
  const with1Sample = uniqueProductNames.filter(g => g._count === 1).length;
  const with2Samples = uniqueProductNames.filter(g => g._count === 2).length;
  
  console.log(`   📊 ProductName avec 1 échantillon: ${with1Sample}`);
  console.log(`   📊 ProductName avec 2 échantillons: ${with2Samples}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples d\'échantillons (10 premiers):');
  const samples = await prisma.productSample.findMany({
    take: 10,
    orderBy: { productName: 'asc' },
  });
  
  samples.forEach((sample, index) => {
    console.log(`   ${index + 1}. ${sample.productName} (csvId: ${sample.csvId || 'NULL'})`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Terminé!');
}

populateProductSamples().catch(console.error);

























