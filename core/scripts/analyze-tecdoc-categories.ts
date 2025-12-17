// Script pour analyser les catégories TecDocCategory existantes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeTecDocCategories() {
  console.log('📊 Analyse des catégories TecDocCategory...\n');

  // Statistiques globales
  const total = await prisma.tecDocCategory.count();
  const byLevel = await prisma.tecDocCategory.groupBy({
    by: ['level'],
    _count: true,
  });

  console.log(`📦 Total catégories: ${total}\n`);

  console.log('📊 Répartition par niveau:');
  for (const level of byLevel.sort((a, b) => a.level - b.level)) {
    console.log(`   Level ${level.level}: ${level._count.level}`);
  }

  // Exemples de catégories par niveau
  console.log('\n📋 Exemples de catégories par niveau:\n');
  
  for (let level = 1; level <= 4; level++) {
    const categories = await prisma.tecDocCategory.findMany({
      where: { level },
      take: 5,
      orderBy: { name: 'asc' },
    });

    if (categories.length > 0) {
      console.log(`Level ${level}:`);
      for (const cat of categories) {
        const parentInfo = cat.parentId 
          ? await prisma.tecDocCategory.findUnique({ where: { id: cat.parentId }, select: { name: true } })
          : null;
        console.log(`   - ${cat.name} [${cat.displayId}]${parentInfo ? ` (parent: ${parentInfo.name})` : ''}`);
      }
      console.log('');
    }
  }

  // Catégories avec produits
  const categoriesWithProducts = await prisma.tecDocCategory.count({
    where: {
      productTecDocCategories: {
        some: {},
      },
    },
  });

  console.log(`📊 Catégories avec produits: ${categoriesWithProducts} / ${total} (${((categoriesWithProducts / total) * 100).toFixed(2)}%)\n`);

  // Top catégories par nombre de produits
  const topCategories = await prisma.tecDocCategory.findMany({
    include: {
      _count: {
        select: {
          productTecDocCategories: true,
        },
      },
    },
    orderBy: {
      productTecDocCategories: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  console.log('🏆 Top 10 catégories par nombre de produits:');
  for (let i = 0; i < topCategories.length; i++) {
    const cat = topCategories[i];
    console.log(`   ${i + 1}. ${cat.name} [${cat.displayId}] (Level ${cat.level}): ${cat._count.productTecDocCategories.toLocaleString()} produits`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Analyse terminée!');
}

analyzeTecDocCategories().catch(console.error);

























