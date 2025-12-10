// Script pour lister des exemples d'URLs InterCars à tester
// Utiliser: dotenv -e ../.env.local -- tsx scripts/list-intercars-urls.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listInterCarsUrls() {
  console.log('🔗 Exemples d\'URLs InterCars à tester:\n');

  // Récupérer quelques exemples de chaque niveau
  const examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level1Url: { not: null },
      level2Url: { not: null },
      level3Url: { not: null },
      level4Url: { not: null },
    },
    take: 5,
    select: {
      level1LabelFr: true,
      level1Url: true,
      level2LabelFr: true,
      level2Url: true,
      level3LabelFr: true,
      level3Url: true,
      level4LabelFr: true,
      level4Url: true,
    },
  });

  console.log('=== EXEMPLES COMPLETS (avec tous les niveaux) ===\n');
  examples.forEach((example, index) => {
    console.log(`Exemple ${index + 1}:`);
    console.log(`  Level 1: ${example.level1LabelFr}`);
    console.log(`    URL: ${example.level1Url}`);
    console.log(`  Level 2: ${example.level2LabelFr}`);
    console.log(`    URL: ${example.level2Url}`);
    console.log(`  Level 3: ${example.level3LabelFr}`);
    console.log(`    URL: ${example.level3Url}`);
    console.log(`  Level 4: ${example.level4LabelFr}`);
    console.log(`    URL: ${example.level4Url}`);
    console.log('');
  });

  // Exemples de niveau 1 uniquement
  const level1Examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level1Url: { not: null },
    },
    select: {
      level1Id: true,
      level1LabelFr: true,
      level1Url: true,
    },
    distinct: ['level1Id'],
    take: 10,
  });

  console.log('\n=== EXEMPLES NIVEAU 1 (Page d\'index) ===\n');
  console.log(`URL: http://localhost:3000/fr/pieces-detachees\n`);

  console.log('\n=== EXEMPLES NIVEAU 1 (Catégories individuelles) ===\n');
  level1Examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.level1LabelFr}`);
    console.log(`   URL: http://localhost:3000/fr${example.level1Url}\n`);
  });

  // Exemples de niveau 2
  const level2Examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level2Url: { not: null },
    },
    select: {
      level1LabelFr: true,
      level2LabelFr: true,
      level2Url: true,
    },
    distinct: ['level2Id'],
    take: 10,
  });

  console.log('\n=== EXEMPLES NIVEAU 2 ===\n');
  level2Examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.level2LabelFr} (sous ${example.level1LabelFr})`);
    console.log(`   URL: http://localhost:3000/fr${example.level2Url}\n`);
  });

  // Exemples de niveau 3
  const level3Examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level3Url: { not: null },
    },
    select: {
      level2LabelFr: true,
      level3LabelFr: true,
      level3Url: true,
    },
    distinct: ['level3Id'],
    take: 10,
  });

  console.log('\n=== EXEMPLES NIVEAU 3 ===\n');
  level3Examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.level3LabelFr} (sous ${example.level2LabelFr})`);
    console.log(`   URL: http://localhost:3000/fr${example.level3Url}\n`);
  });

  // Exemples de niveau 4
  const level4Examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level4Url: { not: null },
    },
    select: {
      level3LabelFr: true,
      level4LabelFr: true,
      level4Url: true,
    },
    distinct: ['level4Id'],
    take: 10,
  });

  console.log('\n=== EXEMPLES NIVEAU 4 ===\n');
  level4Examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.level4LabelFr} (sous ${example.level3LabelFr})`);
    console.log(`   URL: http://localhost:3000/fr${example.level4Url}\n`);
  });

  // Statistiques
  const stats = {
    level1: await prisma.interCarsHierarchy.count({
      where: { level1Url: { not: null } },
      distinct: ['level1Id'],
    }),
    level2: await prisma.interCarsHierarchy.count({
      where: { level2Url: { not: null } },
      distinct: ['level2Id'],
    }),
    level3: await prisma.interCarsHierarchy.count({
      where: { level3Url: { not: null } },
      distinct: ['level3Id'],
    }),
    level4: await prisma.interCarsHierarchy.count({
      where: { level4Url: { not: null } },
      distinct: ['level4Id'],
    }),
  };

  console.log('\n=== STATISTIQUES ===\n');
  console.log(`Total catégories niveau 1: ${stats.level1}`);
  console.log(`Total catégories niveau 2: ${stats.level2}`);
  console.log(`Total catégories niveau 3: ${stats.level3}`);
  console.log(`Total catégories niveau 4: ${stats.level4}`);
}

listInterCarsUrls()
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









