// Script pour afficher un exemple de hiérarchie InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showInterCarsHierarchyExample() {
  console.log('🌳 Exemple de hiérarchie InterCars...\n');

  // Trouver un GenericArticle avec hiérarchie complète et des produits
  const example = await prisma.interCarsHierarchy.findFirst({
    where: {
      level4Id: { not: null },
      categories: {
        some: {
          products: {
            some: {},
          },
        },
      },
    },
    include: {
      categories: {
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        take: 3,
      },
    },
  });

  if (!example) {
    console.log('❌ Aucun exemple trouvé\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Exemple: ${example.genericArticleId}\n`);
  console.log(`   Level 1: ${example.level1Label} [${example.level1Id}]`);
  console.log(`   Level 2: ${example.level2Label} [${example.level2Id}]`);
  console.log(`   Level 3: ${example.level3Label} [${example.level3Id}]`);
  if (example.level4Id) {
    console.log(`   Level 4: ${example.level4Label} [${example.level4Id}]\n`);
  }

  // Compter les produits
  const productCount = await prisma.productInterCarsCategory.count({
    where: {
      interCarsCategory: {
        hierarchyId: example.id,
      },
    },
  });

  console.log(`   📦 Total produits: ${productCount.toLocaleString()}\n`);

  // Afficher les productName associés
  console.log(`   📦 ProductName associés (${example.categories.length} premiers):`);
  for (const cat of example.categories) {
    console.log(`      - ${cat.productName} (${cat._count.products.toLocaleString()} produits)`);
  }

  // Afficher d'autres exemples de la même hiérarchie Level 1
  console.log(`\n📋 Autres catégories dans "${example.level1Label}" (Level 1):\n`);
  
  const sameLevel1 = await prisma.interCarsHierarchy.findMany({
    where: {
      level1Id: example.level1Id,
      id: { not: example.id },
    },
    include: {
      _count: {
        select: {
          categories: true,
        },
      },
    },
    take: 5,
  });

  for (const h of sameLevel1) {
    const productCount = await prisma.productInterCarsCategory.count({
      where: {
        interCarsCategory: {
          hierarchyId: h.id,
        },
      },
    });
    
    console.log(`   ${h.level3Label}${h.level4Label ? ` > ${h.level4Label}` : ''} [${h.genericArticleId}]`);
    console.log(`      ${productCount.toLocaleString()} produits\n`);
  }

  // Statistiques globales
  const stats = {
    totalHierarchy: await prisma.interCarsHierarchy.count(),
    withLevel4: await prisma.interCarsHierarchy.count({ where: { level4Id: { not: null } } }),
    withoutLevel4: await prisma.interCarsHierarchy.count({ where: { level4Id: null } }),
    linkedCategories: await prisma.interCarsCategory.count({ where: { hierarchyId: { not: null } } }),
    totalProducts: await prisma.productInterCarsCategory.count(),
  };

  console.log('📊 Statistiques globales:');
  console.log(`   Total hiérarchies: ${stats.totalHierarchy}`);
  console.log(`   Avec Level 4: ${stats.withLevel4}`);
  console.log(`   Sans Level 4 (niveau 3): ${stats.withoutLevel4}`);
  console.log(`   InterCarsCategory liées: ${stats.linkedCategories}`);
  console.log(`   Total relations Product → InterCarsCategory: ${stats.totalProducts.toLocaleString()}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

showInterCarsHierarchyExample().catch(console.error);

























