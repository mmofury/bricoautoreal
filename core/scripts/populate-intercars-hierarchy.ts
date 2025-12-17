// Script pour remplir la table InterCarsHierarchy depuis les fichiers JSON
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function populateInterCarsHierarchy() {
  console.log('🚀 Remplissage de la table InterCarsHierarchy...\n');

  // Charger les fichiers JSON
  const basePath = path.join(process.cwd(), '..', 'intercars');
  
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
  console.log(`   Level 3: ${level3Data.length} groupes`);
  console.log(`   Level 4: ${level4Data.length} groupes\n`);

  let created = 0;
  let updated = 0;

  // Créer les hiérarchies depuis level3 (GenericArticle niveau 3)
  console.log('📦 Création des hiérarchies depuis level3...');
  for (const level3Group of level3Data) {
    for (const cat of level3Group.categories) {
      if (cat.categoryId.startsWith('GenericArticle_')) {
        try {
          await prisma.interCarsHierarchy.upsert({
            where: { genericArticleId: cat.categoryId },
            update: {
              level1Id: level3Group.grandParentCategoryId,
              level1Label: level3Group.grandParentLabel,
              level2Id: level3Group.parentCategoryId,
              level2Label: level3Group.parentLabel,
              level3Id: cat.categoryId,
              level3Label: cat.label,
              level4Id: null,
              level4Label: null,
            },
            create: {
              genericArticleId: cat.categoryId,
              level1Id: level3Group.grandParentCategoryId,
              level1Label: level3Group.grandParentLabel,
              level2Id: level3Group.parentCategoryId,
              level2Label: level3Group.parentLabel,
              level3Id: cat.categoryId,
              level3Label: cat.label,
              level4Id: null,
              level4Label: null,
            },
          });
          created++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            updated++;
          } else {
            console.error(`   ❌ Erreur pour ${cat.categoryId}: ${error.message}`);
          }
        }
      }
    }
  }
  console.log(`   ✅ ${created} créées, ${updated} mises à jour\n`);

  // Créer les hiérarchies depuis level4 (GenericArticle niveau 4)
  console.log('📦 Création des hiérarchies depuis level4...');
  created = 0;
  updated = 0;
  
  for (const level4Group of level4Data) {
    for (const cat of level4Group.categories) {
      if (cat.categoryId.startsWith('GenericArticle_')) {
        try {
          await prisma.interCarsHierarchy.upsert({
            where: { genericArticleId: cat.categoryId },
            update: {
              level1Id: level4Group.grandGrandParentCategoryId,
              level1Label: level4Group.grandGrandParentLabel,
              level2Id: level4Group.grandParentCategoryId,
              level2Label: level4Group.grandParentLabel,
              level3Id: level4Group.parentCategoryId,
              level3Label: level4Group.parentLabel,
              level4Id: cat.categoryId,
              level4Label: cat.label,
            },
            create: {
              genericArticleId: cat.categoryId,
              level1Id: level4Group.grandGrandParentCategoryId,
              level1Label: level4Group.grandGrandParentLabel,
              level2Id: level4Group.grandParentCategoryId,
              level2Label: level4Group.grandParentLabel,
              level3Id: level4Group.parentCategoryId,
              level3Label: level4Group.parentLabel,
              level4Id: cat.categoryId,
              level4Label: cat.label,
            },
          });
          created++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            updated++;
          } else {
            console.error(`   ❌ Erreur pour ${cat.categoryId}: ${error.message}`);
          }
        }
      }
    }
  }
  console.log(`   ✅ ${created} créées, ${updated} mises à jour\n`);

  // Lier InterCarsCategory à InterCarsHierarchy
  console.log('🔗 Liaison InterCarsCategory → InterCarsHierarchy...');
  const interCarsCategories = await prisma.interCarsCategory.findMany({
    select: {
      id: true,
      genericArticleId: true,
    },
  });

  let linked = 0;
  let notLinked = 0;

  for (const category of interCarsCategories) {
    const hierarchy = await prisma.interCarsHierarchy.findUnique({
      where: { genericArticleId: category.genericArticleId },
    });

    if (hierarchy) {
      await prisma.interCarsCategory.update({
        where: { id: category.id },
        data: { hierarchyId: hierarchy.id },
      });
      linked++;
    } else {
      notLinked++;
    }
  }

  console.log(`   ✅ ${linked} catégories liées`);
  console.log(`   ❌ ${notLinked} catégories sans hiérarchie\n`);

  // Statistiques finales
  const totalHierarchy = await prisma.interCarsHierarchy.count();
  const withLevel4 = await prisma.interCarsHierarchy.count({
    where: { level4Id: { not: null } },
  });
  const withoutLevel4 = totalHierarchy - withLevel4;

  console.log('📊 Résultats finaux:');
  console.log(`   Total hiérarchies: ${totalHierarchy}`);
  console.log(`   Avec Level 4: ${withLevel4}`);
  console.log(`   Sans Level 4 (niveau 3): ${withoutLevel4}`);
  console.log(`   InterCarsCategory liées: ${linked} / ${interCarsCategories.length} (${((linked / interCarsCategories.length) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

populateInterCarsHierarchy().catch(console.error);

























