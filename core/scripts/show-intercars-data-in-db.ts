// Script pour voir les données InterCars enregistrées dans la DB
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showInterCarsDataInDB() {
  console.log('🔍 Données InterCars dans la base de données...\n');

  // Compter les catégories créées depuis InterCars
  const totalCategories = await prisma.tecDocCategory.count();
  console.log(`📁 Total catégories TecDocCategory: ${totalCategories}`);

  // Compter les relations ProductGroupCategory
  const totalRelations = await prisma.productGroupCategory.count();
  console.log(`🔗 Total relations ProductGroupCategory: ${totalRelations}\n`);

  // Vérifier les catégories créées récemment (depuis le script InterCars)
  // Les catégories créées par InterCars ont des displayId qui commencent par "GenericArticle_" ou "SalesClassificationNode_"
  const interCarsCategories = await prisma.tecDocCategory.findMany({
    where: {
      OR: [
        { displayId: { startsWith: 'GenericArticle_' } },
        { displayId: { startsWith: 'SalesClassificationNode_' } },
      ],
    },
    include: {
      productGroups: {
        select: {
          id: true,
        },
      },
    },
    take: 20,
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📦 Catégories créées depuis InterCars (échantillon de 20):\n`);
  interCarsCategories.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.name} [${cat.displayId}]`);
    console.log(`      Niveau: ${cat.level} | Produits: ${cat.productGroups.length}`);
    if (cat.parent) {
      console.log(`      Parent: ${cat.parent.name}`);
    }
    console.log('');
  });

  // Vérifier les ProductGroup avec catégories InterCars
  const productGroupsWithInterCarsCategories = await prisma.productGroup.findMany({
    where: {
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
    include: {
      categories: {
        include: {
          category: {
            select: {
              name: true,
              displayId: true,
              level: true,
            },
          },
        },
      },
      products: {
        select: {
          id: true,
        },
      },
    },
    take: 10,
  });

  console.log(`\n📦 ProductGroup avec catégories InterCars (échantillon de 10):\n`);
  productGroupsWithInterCarsCategories.forEach((group, index) => {
    console.log(`   ${index + 1}. ${group.productName}`);
    console.log(`      Produits: ${group.products.length}`);
    console.log(`      Catégories InterCars: ${group.categories.length}`);
    group.categories.slice(0, 3).forEach(rel => {
      console.log(`         - ${rel.category.name} [${rel.category.displayId}] (niveau ${rel.category.level})`);
    });
    if (group.categories.length > 3) {
      console.log(`         ... et ${group.categories.length - 3} autres`);
    }
    console.log('');
  });

  // Statistiques par niveau
  console.log(`\n📊 Statistiques par niveau (catégories InterCars):\n`);
  const categoriesByLevel = await prisma.tecDocCategory.groupBy({
    by: ['level'],
    where: {
      OR: [
        { displayId: { startsWith: 'GenericArticle_' } },
        { displayId: { startsWith: 'SalesClassificationNode_' } },
      ],
    },
    _count: {
      id: true,
    },
  });

  for (const level of categoriesByLevel.sort((a, b) => a.level - b.level)) {
    const withProducts = await prisma.tecDocCategory.count({
      where: {
        level: level.level,
        OR: [
          { displayId: { startsWith: 'GenericArticle_' } },
          { displayId: { startsWith: 'SalesClassificationNode_' } },
        ],
        productGroups: {
          some: {},
        },
      },
    });
    console.log(`   Niveau ${level.level}: ${level._count.id} catégories (${withProducts} avec produits)`);
  }

  // Vérifier les ProductSample qui ont été traités
  const totalSamples = await prisma.productSample.count();
  const samplesWithCsvId = await prisma.productSample.count({
    where: {
      csvId: {
        not: null,
      },
    },
  });

  console.log(`\n📋 ProductSample:`);
  console.log(`   Total: ${totalSamples}`);
  console.log(`   Avec csvId: ${samplesWithCsvId}`);

  // Vérifier combien de ProductSample ont un ProductGroup avec catégories
  const samplesWithCategories = await prisma.productSample.findMany({
    where: {
      csvId: {
        not: null,
      },
      productName: {
        not: null,
      },
    },
    include: {
      // On ne peut pas faire de relation directe, on doit vérifier via ProductGroup
    },
    take: 100,
  });

  let samplesWithGroupCategories = 0;
  for (const sample of samplesWithCategories) {
    if (sample.productName) {
      const group = await prisma.productGroup.findUnique({
        where: { productName: sample.productName },
        include: {
          categories: {
            where: {
              category: {
                OR: [
                  { displayId: { startsWith: 'GenericArticle_' } },
                  { displayId: { startsWith: 'SalesClassificationNode_' } },
                ],
              },
            },
          },
        },
      });
      if (group && group.categories.length > 0) {
        samplesWithGroupCategories++;
      }
    }
  }

  console.log(`   Avec catégories InterCars (échantillon 100): ${samplesWithGroupCategories} / ${samplesWithCategories.length}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

showInterCarsDataInDB().catch(console.error);
























