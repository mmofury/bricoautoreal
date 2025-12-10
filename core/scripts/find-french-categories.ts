// Script pour trouver les catégories en français
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findFrenchCategories() {
  console.log('🔍 Recherche des catégories en français...\n');

  // Chercher des catégories avec des noms qui semblent français
  // (mots avec accents, mots français communs)
  const frenchKeywords = ['accoudoir', 'réparation', 'démarrage', 'échappement', 'embrayage', 'freinage'];
  
  // SQLite ne supporte pas mode: 'insensitive', on utilise LOWER()
  const frenchCategories = await prisma.$queryRaw`
    SELECT id, name, display_id as "displayId", level, parent_id as "parentId"
    FROM tecdoc_categories
    WHERE 
      LOWER(name) LIKE LOWER('%accoudoir%') OR
      LOWER(name) LIKE LOWER('%réparation%') OR
      LOWER(name) LIKE LOWER('%démarrage%') OR
      LOWER(name) LIKE LOWER('%échappement%') OR
      LOWER(name) LIKE LOWER('%embrayage%') OR
      LOWER(name) LIKE LOWER('%freinage%')
    LIMIT 20
  ` as Array<{
    id: number;
    name: string;
    displayId: string;
    level: number;
    parentId: number | null;
  }>;
    select: {
      id: true,
      name: true,
      displayId: true,
      level: true,
      parentId: true,
    },
    take: 20,
  });

  console.log(`📊 Catégories en français trouvées (échantillon de 20):\n`);
  for (const cat of frenchCategories) {
    const parent = cat.parentId 
      ? await prisma.tecDocCategory.findUnique({ 
          where: { id: cat.parentId }, 
          select: { name: true, displayId: true } 
        })
      : null;
    
    console.log(`   Level ${cat.level}: ${cat.name} [${cat.displayId}]`);
    if (parent) {
      console.log(`      Parent: ${parent.name} [${parent.displayId}]`);
    }
    console.log('');
  }

  // Compter toutes les catégories françaises
  const totalFrenchResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM tecdoc_categories
    WHERE 
      LOWER(name) LIKE LOWER('%accoudoir%') OR
      LOWER(name) LIKE LOWER('%réparation%') OR
      LOWER(name) LIKE LOWER('%démarrage%') OR
      LOWER(name) LIKE LOWER('%échappement%') OR
      LOWER(name) LIKE LOWER('%embrayage%') OR
      LOWER(name) LIKE LOWER('%freinage%')
  `;
  const totalFrench = Number(totalFrenchResult[0]?.count || 0);

  console.log(`📊 Total catégories en français (approximatif): ${totalFrench}\n`);

  // Vérifier si ces catégories viennent des fichiers JSON ou d'ailleurs
  console.log('🔍 Vérification de l\'origine:\n');
  
  // Charger level1.json et level2.json pour voir si ces IDs existent
  const fs = require('fs');
  const path = require('path');
  
  const level1Path = path.join(process.cwd(), '..', 'intercars', 'level1.json');
  const level1Data = JSON.parse(fs.readFileSync(level1Path, 'utf-8'));
  const level1Ids = new Set(level1Data.map((c: any) => c.categoryId));
  
  const level2Path = path.join(process.cwd(), '..', 'intercars', 'level2.json');
  const level2Data = JSON.parse(fs.readFileSync(level2Path, 'utf-8'));
  const level2Ids = new Set(level2Data.flatMap((g: any) => g.categories.map((c: any) => c.categoryId)));

  for (const cat of frenchCategories.slice(0, 5)) {
    const inLevel1 = level1Ids.has(cat.displayId);
    const inLevel2 = level2Ids.has(cat.displayId);
    
    if (inLevel1 || inLevel2) {
      console.log(`   ✅ ${cat.name} [${cat.displayId}] existe dans les fichiers JSON`);
    } else {
      console.log(`   ❌ ${cat.name} [${cat.displayId}] N'EXISTE PAS dans les fichiers JSON (créée ailleurs)`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Analyse terminée!');
}

findFrenchCategories().catch(console.error);

