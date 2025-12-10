import { db } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ArboCategory {
  categoryId: number | null;
  categoryName: string;
  level: number;
  children: Record<string, ArboCategory>;
}

type ArboStructure = Record<string, ArboCategory>;

async function verifyArborescenceMatch() {
  console.log('🔍 Vérification de la correspondance avec arbo.json...\n');

  // Lire le fichier arbo.json
  const arboPath = join(process.cwd(), '..', 'arbo.json');
  const arboContent = readFileSync(arboPath, 'utf-8');
  const arbo: ArboStructure = JSON.parse(arboContent);

  console.log(`📄 Fichier arbo.json chargé\n`);

  // Extraire tous les categoryId de l'arborescence
  const arboCategoryIds = new Set<number>();
  const arboCategoryMap = new Map<number, { name: string; level: number; parentName?: string }>();

  function extractCategories(categories: Record<string, ArboCategory>, parentName?: string) {
    for (const [key, cat] of Object.entries(categories)) {
      if (cat.categoryId !== null) {
        arboCategoryIds.add(cat.categoryId);
        arboCategoryMap.set(cat.categoryId, {
          name: cat.categoryName,
          level: cat.level,
          parentName,
        });
      }
      if (cat.children && Object.keys(cat.children).length > 0) {
        extractCategories(cat.children, cat.categoryName);
      }
    }
  }

  extractCategories(arbo);

  console.log(`📊 Statistiques arbo.json:`);
  console.log(`   - Catégories avec ID: ${arboCategoryIds.size}`);
  console.log(`   - Catégories racine: ${Object.keys(arbo).length}\n`);

  // Récupérer toutes les catégories de la base de données
  const dbCategories = await db.tecDocCategory.findMany({
    where: {
      tecdocCategoryId: {
        not: null,
      },
    },
    include: {
      productGroups: {
        include: {
          productGroup: {
            select: {
              id: true,
              productName: true,
              tecdocProductId: true,
            },
          },
        },
      },
    },
  });

  console.log(`📊 Statistiques base de données:`);
  console.log(`   - Catégories avec tecdocCategoryId: ${dbCategories.length}\n`);

  // Comparer les catégories
  const dbCategoryIds = new Set(dbCategories.map(c => c.tecdocCategoryId).filter((id): id is number => id !== null));
  
  const inArboNotInDb = Array.from(arboCategoryIds).filter(id => !dbCategoryIds.has(id));
  const inDbNotInArbo = Array.from(dbCategoryIds).filter(id => !arboCategoryIds.has(id));
  const inBoth = Array.from(arboCategoryIds).filter(id => dbCategoryIds.has(id));

  console.log(`📊 Comparaison:`);
  console.log(`   - Catégories dans arbo.json ET dans la DB: ${inBoth.length}`);
  console.log(`   - Catégories dans arbo.json mais PAS dans la DB: ${inArboNotInDb.length}`);
  console.log(`   - Catégories dans la DB mais PAS dans arbo.json: ${inDbNotInArbo.length}\n`);

  // Vérifier les groupes de produits
  const allProductGroups = await db.productGroup.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  console.log(`📦 Groupes de produits:`);
  console.log(`   - Total: ${allProductGroups.length}`);
  console.log(`   - Avec catégories: ${allProductGroups.filter(pg => pg.categories.length > 0).length}`);
  console.log(`   - Sans catégories: ${allProductGroups.filter(pg => pg.categories.length === 0).length}\n`);

  // Vérifier combien de groupes de produits sont associés à des catégories qui sont dans arbo.json
  let groupsInArboCategories = 0;
  let groupsNotInArboCategories = 0;
  const groupsByArboCategory = new Map<number, number>();

  for (const pg of allProductGroups) {
    let foundInArbo = false;
    for (const rel of pg.categories) {
      const cat = rel.category;
      if (cat.tecdocCategoryId && arboCategoryIds.has(cat.tecdocCategoryId)) {
        foundInArbo = true;
        const count = groupsByArboCategory.get(cat.tecdocCategoryId) || 0;
        groupsByArboCategory.set(cat.tecdocCategoryId, count + 1);
      }
    }
    if (foundInArbo) {
      groupsInArboCategories++;
    } else if (pg.categories.length > 0) {
      groupsNotInArboCategories++;
    }
  }

  console.log(`📊 Groupes de produits vs arbo.json:`);
  console.log(`   - Groupes associés à des catégories dans arbo.json: ${groupsInArboCategories}`);
  console.log(`   - Groupes associés à des catégories PAS dans arbo.json: ${groupsNotInArboCategories}\n`);

  // Exemples de catégories dans arbo.json avec leurs groupes de produits
  console.log(`\n${'='.repeat(80)}`);
  console.log('📋 Exemples de catégories de arbo.json avec leurs groupes de produits:\n');

  const exampleCategoryIds = Array.from(arboCategoryIds).slice(0, 10);
  for (const categoryId of exampleCategoryIds) {
    const arboInfo = arboCategoryMap.get(categoryId);
    const dbCategory = dbCategories.find(c => c.tecdocCategoryId === categoryId);

    if (dbCategory) {
      console.log(`\n📁 ${arboInfo?.name || 'N/A'} (ID: ${categoryId}, Niveau: ${arboInfo?.level || 'N/A'})`);
      console.log(`   └─ Dans la DB: ${dbCategory.name} (ID DB: ${dbCategory.id})`);
      console.log(`   └─ Groupes de produits: ${dbCategory.productGroups.length}`);
      
      if (dbCategory.productGroups.length > 0) {
        dbCategory.productGroups.slice(0, 5).forEach(rel => {
          console.log(`      • ${rel.productGroup.productName} (TecDoc Product ID: ${rel.productGroup.tecdocProductId})`);
        });
        if (dbCategory.productGroups.length > 5) {
          console.log(`      ... et ${dbCategory.productGroups.length - 5} autres`);
        }
      }
    } else {
      console.log(`\n⚠️  ${arboInfo?.name || 'N/A'} (ID: ${categoryId}) - PAS dans la DB`);
    }
  }

  // Vérifier spécifiquement "Accoudoir" (100860)
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 Vérification spécifique: "Accoudoir" (categoryId: 100860)\n');

  const accoudoirArbo = arboCategoryMap.get(100860);
  const accoudoirDb = dbCategories.find(c => c.tecdocCategoryId === 100860);

  if (accoudoirArbo) {
    console.log(`📄 Dans arbo.json:`);
    console.log(`   - Nom: ${accoudoirArbo.name}`);
    console.log(`   - Niveau: ${accoudoirArbo.level}`);
    console.log(`   - Parent: ${accoudoirArbo.parentName || 'N/A'}`);
  }

  if (accoudoirDb) {
    console.log(`\n💾 Dans la DB:`);
    console.log(`   - Nom: ${accoudoirDb.name}`);
    console.log(`   - Niveau: ${accoudoirDb.level}`);
    console.log(`   - ID DB: ${accoudoirDb.id}`);
    console.log(`   - Groupes de produits: ${accoudoirDb.productGroups.length}`);
    accoudoirDb.productGroups.forEach(rel => {
      console.log(`     • ${rel.productGroup.productName}`);
    });
  } else {
    console.log(`\n⚠️  "Accoudoir" (100860) n'est PAS dans la DB`);
  }

  // Résumé final
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 RÉSUMÉ:\n');
  console.log(`✅ ${inBoth.length} catégories correspondent entre arbo.json et la DB`);
  console.log(`⚠️  ${inArboNotInDb.length} catégories dans arbo.json mais pas dans la DB`);
  console.log(`⚠️  ${inDbNotInArbo.length} catégories dans la DB mais pas dans arbo.json`);
  console.log(`📦 ${groupsInArboCategories} groupes de produits sont associés à des catégories de arbo.json`);

  if (inArboNotInDb.length > 0 && inArboNotInDb.length <= 20) {
    console.log(`\n⚠️  Catégories dans arbo.json mais pas dans la DB (exemples):`);
    inArboNotInDb.slice(0, 10).forEach(id => {
      const info = arboCategoryMap.get(id);
      console.log(`   - ${info?.name || 'N/A'} (ID: ${id})`);
    });
  }

  await db.$disconnect();
}

verifyArborescenceMatch().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});





























