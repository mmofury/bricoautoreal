// Script pour trouver des URLs InterCars réelles dans la base
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUrls() {
  console.log('🔍 Recherche d\'URLs InterCars dans la base de données...\n');

  // Chercher des URLs de niveau 4 qui contiennent "filtre" ou "huile"
  const withFiltre = await prisma.interCarsHierarchy.findMany({
    where: {
      OR: [
        { level4Url: { contains: 'filtre' } },
        { level4Url: { contains: 'huile' } },
        { level1Url: { contains: 'filtre' } },
      ],
    },
    take: 10,
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

  console.log(`=== ${withFiltre.length} URLs trouvées avec "filtre" ou "huile" ===\n`);
  withFiltre.forEach((h, i) => {
    console.log(`${i + 1}.`);
    if (h.level1Url) console.log(`   Level 1: "${h.level1LabelFr}" -> ${h.level1Url}`);
    if (h.level2Url) console.log(`   Level 2: "${h.level2LabelFr}" -> ${h.level2Url}`);
    if (h.level3Url) console.log(`   Level 3: "${h.level3LabelFr}" -> ${h.level3Url}`);
    if (h.level4Url) console.log(`   Level 4: "${h.level4LabelFr}" -> ${h.level4Url}`);
    console.log('');
  });

  // Chercher quelques exemples de chaque niveau
  console.log('\n=== Exemples par niveau ===\n');

  const level1Examples = await prisma.interCarsHierarchy.findMany({
    where: { level1Url: { not: null } },
    select: { level1LabelFr: true, level1Url: true },
    distinct: ['level1Id'],
    take: 5,
  });

  console.log('Niveau 1:');
  level1Examples.forEach((h) => {
    console.log(`  ${h.level1LabelFr} -> ${h.level1Url}`);
  });

  const level2Examples = await prisma.interCarsHierarchy.findMany({
    where: { level2Url: { not: null } },
    select: { level2LabelFr: true, level2Url: true },
    distinct: ['level2Id'],
    take: 5,
  });

  console.log('\nNiveau 2:');
  level2Examples.forEach((h) => {
    console.log(`  ${h.level2LabelFr} -> ${h.level2Url}`);
  });

  const level4Examples = await prisma.interCarsHierarchy.findMany({
    where: { level4Url: { not: null } },
    select: { level4LabelFr: true, level4Url: true },
    distinct: ['level4Id'],
    take: 10,
  });

  console.log('\nNiveau 4:');
  level4Examples.forEach((h) => {
    console.log(`  ${h.level4LabelFr} -> ${h.level4Url}`);
  });
}

findUrls()
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









