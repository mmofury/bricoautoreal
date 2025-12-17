// Script pour afficher des exemples de traductions françaises
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showFrenchTranslations() {
  console.log('🇫🇷 Exemples de traductions françaises...\n');

  // Exemples avec traductions complètes
  const examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level1LabelFr: { not: null },
      level2LabelFr: { not: null },
      level3LabelFr: { not: null },
    },
    take: 10,
  });

  console.log('📋 Exemples de hiérarchies avec traductions:\n');
  
  for (const example of examples) {
    console.log(`${example.genericArticleId}:`);
    console.log(`   EN: ${example.level1Label} > ${example.level2Label} > ${example.level3Label}${example.level4Label ? ` > ${example.level4Label}` : ''}`);
    console.log(`   FR: ${example.level1LabelFr} > ${example.level2LabelFr} > ${example.level3LabelFr}${example.level4LabelFr ? ` > ${example.level4LabelFr}` : ''}`);
    
    // Compter les produits
    const productCount = await prisma.productInterCarsCategory.count({
      where: {
        interCarsCategory: {
          hierarchyId: example.id,
        },
      },
    });
    console.log(`   Produits: ${productCount.toLocaleString()}\n`);
  }

  // Statistiques
  const stats = {
    total: await prisma.interCarsHierarchy.count(),
    withLevel1Fr: await prisma.interCarsHierarchy.count({ where: { level1LabelFr: { not: null } } }),
    withLevel2Fr: await prisma.interCarsHierarchy.count({ where: { level2LabelFr: { not: null } } }),
    withLevel3Fr: await prisma.interCarsHierarchy.count({ where: { level3LabelFr: { not: null } } }),
    withLevel4Fr: await prisma.interCarsHierarchy.count({ where: { level4LabelFr: { not: null } } }),
    complete: await prisma.interCarsHierarchy.count({
      where: {
        level1LabelFr: { not: null },
        level2LabelFr: { not: null },
        level3LabelFr: { not: null },
      },
    }),
  };

  console.log('📊 Statistiques des traductions:');
  console.log(`   Total hiérarchies: ${stats.total}`);
  console.log(`   Level 1 traduits: ${stats.withLevel1Fr} (${((stats.withLevel1Fr / stats.total) * 100).toFixed(2)}%)`);
  console.log(`   Level 2 traduits: ${stats.withLevel2Fr} (${((stats.withLevel2Fr / stats.total) * 100).toFixed(2)}%)`);
  console.log(`   Level 3 traduits: ${stats.withLevel3Fr} (${((stats.withLevel3Fr / stats.total) * 100).toFixed(2)}%)`);
  console.log(`   Level 4 traduits: ${stats.withLevel4Fr} (${((stats.withLevel4Fr / stats.total) * 100).toFixed(2)}%)`);
  console.log(`   Hiérarchies complètes (1-3): ${stats.complete} (${((stats.complete / stats.total) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

showFrenchTranslations().catch(console.error);

























