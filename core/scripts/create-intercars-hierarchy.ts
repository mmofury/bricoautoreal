// Script pour créer une table de hiérarchie InterCars basée sur les fichiers JSON
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function createInterCarsHierarchy() {
  console.log('🚀 Création de la hiérarchie InterCars...\n');

  // Charger les fichiers JSON
  const basePath = path.join(process.cwd(), '..', 'intercars');
  
  // Level 1
  const level1Path = path.join(basePath, 'level1.json');
  const level1Data: Array<{ categoryId: string; label: string }> = JSON.parse(
    fs.readFileSync(level1Path, 'utf-8')
  );

  // Level 2
  const level2Path = path.join(basePath, 'level2.json');
  const level2Data: Array<{
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level2Path, 'utf-8'));

  // Level 3
  const level3Path = path.join(basePath, 'level3.json');
  const level3Data: Array<{
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level3Path, 'utf-8'));

  // Level 4
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

  console.log(`📂 Fichiers chargés:`);
  console.log(`   Level 1: ${level1Data.length} catégories`);
  console.log(`   Level 2: ${level2Data.length} groupes`);
  console.log(`   Level 3: ${level3Data.length} groupes`);
  console.log(`   Level 4: ${level4Data.length} groupes\n`);

  // Créer un index complet : genericArticleId -> hiérarchie
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

  // Analyser quels GenericArticle sont utilisés dans InterCarsCategory
  const usedGenericArticles = await prisma.interCarsCategory.groupBy({
    by: ['genericArticleId'],
    _count: true,
  });

  console.log(`📦 GenericArticle utilisés dans InterCarsCategory: ${usedGenericArticles.length}\n`);

  // Afficher des exemples avec leur hiérarchie complète
  console.log('📋 Exemples de hiérarchie complète:\n');

  for (const used of usedGenericArticles.slice(0, 5)) {
    const hierarchy = hierarchyMap.get(used.genericArticleId);
    if (hierarchy) {
      console.log(`${used.genericArticleId}:`);
      console.log(`   Level 1: ${hierarchy.level1Label} [${hierarchy.level1Id}]`);
      console.log(`   Level 2: ${hierarchy.level2Label} [${hierarchy.level2Id}]`);
      console.log(`   Level 3: ${hierarchy.level3Label} [${hierarchy.level3Id}]`);
      if (hierarchy.level4Id) {
        console.log(`   Level 4: ${hierarchy.level4Label} [${hierarchy.level4Id}]`);
      }
      
      // Trouver les productName associés
      const categories = await prisma.interCarsCategory.findMany({
        where: { genericArticleId: used.genericArticleId },
        select: { productName: true },
        distinct: ['productName'],
      });
      
      console.log(`   ProductName: ${categories.map(c => c.productName).join(', ')}`);
      console.log(`   Utilisé dans ${used._count} correspondances\n`);
    }
  }

  // Statistiques
  const withHierarchy = usedGenericArticles.filter(u => hierarchyMap.has(u.genericArticleId));
  const withoutHierarchy = usedGenericArticles.filter(u => !hierarchyMap.has(u.genericArticleId));

  console.log('📊 Statistiques:');
  console.log(`   GenericArticle avec hiérarchie: ${withHierarchy.length} (${((withHierarchy.length / usedGenericArticles.length) * 100).toFixed(2)}%)`);
  console.log(`   GenericArticle sans hiérarchie: ${withoutHierarchy.length} (${((withoutHierarchy.length / usedGenericArticles.length) * 100).toFixed(2)}%)\n`);

  console.log('✅ Analyse terminée!');
  console.log('\n💡 Pour créer une table de hiérarchie, on peut:');
  console.log('   1. Créer une table InterCarsHierarchy avec level1, level2, level3, level4');
  console.log('   2. Lier InterCarsCategory à cette hiérarchie via genericArticleId');
  console.log('   3. Les produits héritent automatiquement de la hiérarchie via ProductInterCarsCategory\n');

  await prisma.$disconnect();
}

createInterCarsHierarchy().catch(console.error);
























