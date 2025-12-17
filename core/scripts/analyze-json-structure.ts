// Script pour analyser la structure des fichiers JSON et comparer avec la DB
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function analyzeJSONStructure() {
  console.log('🔍 Analyse de la structure des fichiers JSON...\n');

  // Charger level1.json
  const level1Path = path.join(process.cwd(), '..', 'intercars', 'level1.json');
  const level1Data: Array<{ categoryId: string; label: string }> = JSON.parse(
    fs.readFileSync(level1Path, 'utf-8')
  );

  // Charger level2.json
  const level2Path = path.join(process.cwd(), '..', 'intercars', 'level2.json');
  const level2Data: Array<{
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level2Path, 'utf-8'));

  console.log('📊 Level 1 JSON:');
  console.log(`   Total: ${level1Data.length} catégories`);
  console.log(`   Exemples (5 premiers):`);
  level1Data.slice(0, 5).forEach((cat, i) => {
    console.log(`   ${i + 1}. ${cat.categoryId} - ${cat.label}`);
  });

  console.log('\n📊 Level 2 JSON:');
  console.log(`   Total: ${level2Data.length} groupes`);
  console.log(`   Exemples de parentCategoryId (5 premiers):`);
  level2Data.slice(0, 5).forEach((group, i) => {
    console.log(`   ${i + 1}. parentCategoryId: ${group.parentCategoryId} (${group.parentLabel})`);
  });

  // Vérifier si les parentCategoryId de level2 existent dans level1
  console.log('\n🔍 Vérification des correspondances:');
  const level1Ids = new Set(level1Data.map(c => c.categoryId));
  const level2ParentIds = level2Data.map(g => g.parentCategoryId);
  const missingParents = level2ParentIds.filter(id => !level1Ids.has(id));

  if (missingParents.length > 0) {
    console.log(`   ❌ ${missingParents.length} parentCategoryId de level2 non trouvés dans level1:`);
    missingParents.slice(0, 10).forEach(id => {
      console.log(`      - ${id}`);
    });
  } else {
    console.log(`   ✅ Tous les parentCategoryId de level2 existent dans level1`);
  }

  // Vérifier dans la base de données
  console.log('\n📊 Catégories Level 1 dans la DB:');
  const dbLevel1 = await prisma.tecDocCategory.findMany({
    where: { level: 1 },
    select: {
      id: true,
      displayId: true,
      name: true,
    },
    take: 10,
  });

  console.log(`   Total dans DB: ${await prisma.tecDocCategory.count({ where: { level: 1 } })}`);
  console.log(`   Exemples (10 premiers):`);
  dbLevel1.forEach((cat, i) => {
    console.log(`   ${i + 1}. displayId: "${cat.displayId}" - ${cat.name}`);
  });

  // Vérifier si les IDs de level1.json existent dans la DB
  console.log('\n🔍 Vérification Level 1 JSON → DB:');
  let found = 0;
  let notFound = 0;
  const notFoundIds: string[] = [];

  for (const level1 of level1Data.slice(0, 10)) {
    const dbCategory = await prisma.tecDocCategory.findUnique({
      where: { displayId: level1.categoryId },
    });
    if (dbCategory) {
      found++;
    } else {
      notFound++;
      notFoundIds.push(level1.categoryId);
    }
  }

  console.log(`   Trouvés: ${found}`);
  console.log(`   Non trouvés: ${notFound}`);
  if (notFoundIds.length > 0) {
    console.log(`   IDs non trouvés (échantillon):`);
    notFoundIds.forEach(id => console.log(`      - ${id}`));
  }

  // Vérifier les parentCategoryId de level2 dans la DB
  console.log('\n🔍 Vérification parentCategoryId Level 2 → DB:');
  const level2ParentIdsUnique = [...new Set(level2ParentIds)];
  let foundParents = 0;
  let notFoundParents = 0;
  const notFoundParentIds: string[] = [];

  for (const parentId of level2ParentIdsUnique.slice(0, 10)) {
    const dbCategory = await prisma.tecDocCategory.findUnique({
      where: { displayId: parentId },
    });
    if (dbCategory) {
      foundParents++;
    } else {
      notFoundParents++;
      notFoundParentIds.push(parentId);
    }
  }

  console.log(`   Trouvés: ${foundParents}`);
  console.log(`   Non trouvés: ${notFoundParents}`);
  if (notFoundParentIds.length > 0) {
    console.log(`   IDs non trouvés (échantillon):`);
    notFoundParentIds.forEach(id => console.log(`      - ${id}`));
    
    // Chercher avec un pattern différent
    console.log(`\n   🔍 Recherche alternative (sans préfixe):`);
    for (const id of notFoundParentIds.slice(0, 3)) {
      const idWithoutPrefix = id.replace('SalesClassificationNode_', '');
      const dbCategory = await prisma.tecDocCategory.findFirst({
        where: {
          OR: [
            { displayId: idWithoutPrefix },
            { displayId: { contains: idWithoutPrefix } },
          ],
        },
      });
      if (dbCategory) {
        console.log(`      ${id} → trouvé avec displayId: "${dbCategory.displayId}"`);
      } else {
        console.log(`      ${id} → toujours non trouvé`);
      }
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Analyse terminée!');
}

analyzeJSONStructure().catch(console.error);

























