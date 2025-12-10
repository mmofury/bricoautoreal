// Script pour afficher un exemple d'arborescence complète
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showArborescenceExample() {
  console.log('🌳 Exemple d\'arborescence complète (niveaux 1, 2, 3, 4)...\n');

  // Trouver une catégorie Level 1 qui a des enfants
  const level1Categories = await prisma.tecDocCategory.findMany({
    where: {
      level: 1,
      children: {
        some: {},
      },
    },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
      },
    },
    take: 1,
  });

  if (level1Categories.length === 0) {
    console.log('❌ Aucune catégorie Level 1 avec enfants trouvée\n');
    await prisma.$disconnect();
    return;
  }

  const level1 = level1Categories[0];

  console.log(`📁 Level 1: ${level1.name} [${level1.displayId}]\n`);

  // Limiter manuellement
  const level2Children = level1.children.slice(0, 2);
  
  for (const level2 of level2Children) {
    console.log(`   📁 Level 2: ${level2.name} [${level2.displayId}]\n`);

    const level3Children = level2.children.slice(0, 2);
    
    for (const level3 of level3Children) {
      console.log(`      📁 Level 3: ${level3.name} [${level3.displayId}]\n`);

      const level4Children = level3.children.slice(0, 2);
      
      if (level4Children.length > 0) {
        for (const level4 of level4Children) {
          // Compter les produits dans cette catégorie
          const productCount = await prisma.productTecDocCategory.count({
            where: {
              tecDocCategoryId: level4.id,
            },
          });

          console.log(`         📦 Level 4: ${level4.name} [${level4.displayId}] (${productCount.toLocaleString()} produits)\n`);
        }
      } else {
        // Si pas de Level 4, afficher les produits directement dans Level 3
        const productCount = await prisma.productTecDocCategory.count({
          where: {
            tecDocCategoryId: level3.id,
          },
        });
        console.log(`         📦 (pas de Level 4, ${productCount.toLocaleString()} produits dans Level 3)\n`);
      }
    }
  }

  // Afficher un autre exemple avec un chemin complet
  console.log('\n📋 Exemple de chemin complet (Level 1 → 2 → 3 → 4):\n');
  
  const fullPath = await prisma.tecDocCategory.findFirst({
    where: {
      level: 4,
      parent: {
        parent: {
          parent: {
            isNot: null,
          },
        },
      },
    },
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
  });

  if (fullPath) {
    const level4 = fullPath;
    const level3 = level4.parent!;
    const level2 = level3.parent!;
    const level1 = level2.parent!;

    const productCount = await prisma.productTecDocCategory.count({
      where: {
        tecDocCategoryId: level4.id,
      },
    });

    console.log(`Level 1: ${level1.name} [${level1.displayId}]`);
    console.log(`  └─ Level 2: ${level2.name} [${level2.displayId}]`);
    console.log(`     └─ Level 3: ${level3.name} [${level3.displayId}]`);
    console.log(`        └─ Level 4: ${level4.name} [${level4.displayId}]`);
    console.log(`           └─ ${productCount.toLocaleString()} produits\n`);
  }

  // Statistiques globales
  const stats = {
    level1: await prisma.tecDocCategory.count({ where: { level: 1 } }),
    level2: await prisma.tecDocCategory.count({ where: { level: 2 } }),
    level3: await prisma.tecDocCategory.count({ where: { level: 3 } }),
    level4: await prisma.tecDocCategory.count({ where: { level: 4 } }),
    totalProducts: await prisma.productTecDocCategory.count(),
  };

  console.log('📊 Statistiques globales:');
  console.log(`   Level 1: ${stats.level1}`);
  console.log(`   Level 2: ${stats.level2}`);
  console.log(`   Level 3: ${stats.level3}`);
  console.log(`   Level 4: ${stats.level4}`);
  console.log(`   Total relations Product → TecDocCategory: ${stats.totalProducts.toLocaleString()}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

showArborescenceExample().catch(console.error);

