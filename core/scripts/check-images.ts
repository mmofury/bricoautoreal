import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImages() {
  const totalImages = await prisma.productImage.count({
    where: { imageUrl: { not: null } },
  });
  console.log(`Total images dans la DB: ${totalImages}`);

  const sample = await prisma.productImage.findFirst({
    where: { imageUrl: { not: null } },
    include: {
      product: {
        include: {
          interCarsCategories: {
            take: 1,
            include: {
              interCarsCategory: {
                include: {
                  hierarchy: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (sample) {
    console.log(`Exemple image URL: ${sample.imageUrl}`);
    if (sample.product.interCarsCategories.length > 0) {
      const hierarchy = sample.product.interCarsCategories[0].interCarsCategory.hierarchy;
      console.log(`Level2Id associé: ${hierarchy?.level2Id}`);
    }
  }

  await prisma.$disconnect();
}

checkImages().catch(console.error);



