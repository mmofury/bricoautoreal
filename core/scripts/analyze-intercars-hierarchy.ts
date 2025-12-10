// Script pour analyser la hiérarchie InterCars basée sur InterCarsCategory
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function analyzeInterCarsHierarchy() {
  console.log('🔍 Analyse de la hiérarchie InterCars...\n');

  // Charger les fichiers JSON pour comprendre la hiérarchie
  const basePath = path.join(process.cwd(), '..', 'intercars');
  
  // Level 3 - contient les GenericArticle avec leur hiérarchie
  const level3Path = path.join(basePath, 'level3.json');
  const level3Data: Array<{
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level3Path, 'utf-8'));

  // Level 4 - contient les GenericArticle niveau 4
  const level4Path = path.join(basePath, 'level4.json');
  const level4Data: Array<{
    grandGrandParentCategoryId: string;
    grandGrandParentLabel: string;
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level4Path, 'utf-8'));

  // Créer un index pour mapper genericArticleId -> hiérarchie complète
  const hierarchyMap = new Map<string, {
    level1Id: string;
    level1Label: string;
    level2Id: string;
    level2Label: string;
    level3Id: string;
    level3Label: string;
    level4Id?: string;
    level4Label?: string;
  }>();

  // Indexer depuis level3 (GenericArticle niveau 3)
  for (const level3Group of level3Data) {
    for (const cat of level3Group.categories) {
      if (cat.categoryId.startsWith('GenericArticle_')) {
        hierarchyMap.set(cat.categoryId, {
          level1Id: level3Group.grandParentCategoryId,
          level1Label: level3Group.grandParentLabel,
          level2Id: level3Group.parentCategoryId,
          level2Label: level3Group.parentLabel,
          level3Id: cat.categoryId,
          level3Label: cat.label,
        });
      }
    }
  }

  // Indexer depuis level4 (GenericArticle niveau 4)
  for (const level4Group of level4Data) {
    for (const cat of level4Group.categories) {
      if (cat.categoryId.startsWith('GenericArticle_')) {
        hierarchyMap.set(cat.categoryId, {
          level1Id: level4Group.grandGrandParentCategoryId,
          level1Label: level4Group.grandGrandParentLabel,
          level2Id: level4Group.grandParentCategoryId,
          level2Label: level4Group.grandParentLabel,
          level3Id: level4Group.parentCategoryId,
          level3Label: level4Group.parentLabel,
          level4Id: cat.categoryId,
          level4Label: cat.label,
        });
      }
    }
  }

  console.log(`📊 ${hierarchyMap.size} GenericArticle indexés avec leur hiérarchie\n`);

  // Analyser InterCarsCategory
  const interCarsCategories = await prisma.interCarsCategory.findMany({
    select: {
      id: true,
      productName: true,
      genericArticleId: true,
      categoryName: true,
      isPrimary: true,
    },
  });

  console.log(`📦 InterCarsCategory: ${interCarsCategories.length} correspondances\n`);

  // Analyser ProductInterCarsCategory
  const productInterCarsCount = await prisma.productInterCarsCategory.count();
  const productsWithInterCars = await prisma.product.count({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
  });

  console.log(`📦 ProductInterCarsCategory: ${productInterCarsCount.toLocaleString()} relations`);
  console.log(`📦 Produits avec catégories InterCars: ${productsWithInterCars.toLocaleString()}\n`);

  // Exemple avec GenericArticle_3897
  console.log('🔍 Exemple: GenericArticle_3897\n');
  
  const exampleGenericArticle = 'GenericArticle_3897';
  const hierarchy = hierarchyMap.get(exampleGenericArticle);
  
  if (hierarchy) {
    console.log(`   Level 1: ${hierarchy.level1Label} [${hierarchy.level1Id}]`);
    console.log(`   Level 2: ${hierarchy.level2Label} [${hierarchy.level2Id}]`);
    console.log(`   Level 3: ${hierarchy.level3Label} [${hierarchy.level3Id}]`);
    if (hierarchy.level4Id) {
      console.log(`   Level 4: ${hierarchy.level4Label} [${hierarchy.level4Id}]`);
    }
  } else {
    console.log(`   ❌ GenericArticle_3897 non trouvé dans les fichiers JSON`);
  }

  // Trouver les InterCarsCategory avec ce genericArticleId
  const matchingCategories = interCarsCategories.filter(
    c => c.genericArticleId === exampleGenericArticle
  );

  console.log(`\n   📦 ProductName associés (${matchingCategories.length}):`);
  const uniqueProductNames = [...new Set(matchingCategories.map(c => c.productName))];
  uniqueProductNames.slice(0, 10).forEach((productName, i) => {
    const count = matchingCategories.filter(c => c.productName === productName).length;
    console.log(`      ${i + 1}. ${productName} (${count} correspondance(s))`);
  });

  // Compter les produits
  const productCount = await prisma.productInterCarsCategory.count({
    where: {
      interCarsCategory: {
        genericArticleId: exampleGenericArticle,
      },
    },
  });

  console.log(`\n   📦 Total produits avec cette catégorie: ${productCount.toLocaleString()}\n`);

  // Analyser la structure globale
  console.log('📊 Structure globale:\n');
  
  const uniqueGenericArticles = [...new Set(interCarsCategories.map(c => c.genericArticleId))];
  console.log(`   GenericArticle uniques dans InterCarsCategory: ${uniqueGenericArticles.length}`);
  
  const withHierarchy = uniqueGenericArticles.filter(id => hierarchyMap.has(id));
  const withoutHierarchy = uniqueGenericArticles.filter(id => !hierarchyMap.has(id));
  
  console.log(`   Avec hiérarchie (dans JSON): ${withHierarchy.length}`);
  console.log(`   Sans hiérarchie (pas dans JSON): ${withoutHierarchy.length}\n`);

  if (withoutHierarchy.length > 0) {
    console.log(`   Exemples de GenericArticle sans hiérarchie (10 premiers):`);
    withoutHierarchy.slice(0, 10).forEach(id => {
      const categories = interCarsCategories.filter(c => c.genericArticleId === id);
      console.log(`      - ${id} (${categories.length} correspondances)`);
    });
  }

  // Top GenericArticle par nombre de produits
  console.log('\n🏆 Top 10 GenericArticle par nombre de produits:\n');
  
  const topCategories = await prisma.productInterCarsCategory.groupBy({
    by: ['interCarsCategoryId'],
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: 10,
  });

  for (let i = 0; i < topCategories.length; i++) {
    const cat = await prisma.interCarsCategory.findUnique({
      where: { id: topCategories[i].interCarsCategoryId },
    });
    
    if (cat) {
      const hierarchy = hierarchyMap.get(cat.genericArticleId);
      console.log(`${i + 1}. ${cat.categoryName} [${cat.genericArticleId}]`);
      console.log(`   Produits: ${topCategories[i]._count.productId.toLocaleString()}`);
      if (hierarchy) {
        console.log(`   Hiérarchie: ${hierarchy.level1Label} > ${hierarchy.level2Label} > ${hierarchy.level3Label}${hierarchy.level4Label ? ` > ${hierarchy.level4Label}` : ''}`);
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
  console.log('✅ Analyse terminée!');
}

analyzeInterCarsHierarchy().catch(console.error);
























