import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewGeneratedImages() {
  console.log('🖼️  Images générées pour les catégories level 2:\n');

  const images = await prisma.interCarsLevel2Image.findMany({
    where: {
      imageUrl: {
        not: null,
      },
    },
    take: 10,
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Récupérer les labels des catégories
  const level2Ids = images.map(img => img.level2Id);
  const hierarchies = await prisma.interCarsHierarchy.findMany({
    where: {
      level2Id: {
        in: level2Ids,
      },
    },
    select: {
      level2Id: true,
      level2Label: true,
      level2LabelFr: true,
    },
    distinct: ['level2Id'],
  });

  const categoryMap = new Map(hierarchies.map(h => [h.level2Id, h]));

  console.log(`📊 Total: ${images.length} images générées\n`);
  console.log('Dernières images générées:\n');

  images.forEach((img, idx) => {
    const category = categoryMap.get(img.level2Id);
    const categoryName = category?.level2LabelFr || category?.level2Label || img.level2Id;
    console.log(`${idx + 1}. ${categoryName}`);
    console.log(`   URL: ${img.imageUrl}`);
    console.log(`   ID: ${img.level2Id}\n`);
  });

  const total = await prisma.interCarsLevel2Image.count({
    where: {
      imageUrl: {
        not: null,
      },
    },
  });

  console.log(`\n✨ Total d'images dans la base: ${total}`);

  await prisma.$disconnect();
}

viewGeneratedImages().catch(console.error);



