// Script pour construire l'arborescence complète depuis les fichiers JSON
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function buildFullArborescenceFromJSON() {
  console.log('🚀 Construction de l\'arborescence complète depuis les fichiers JSON...\n');

  // Charger les fichiers JSON
  const basePath = path.join(process.cwd(), '..', 'intercars');
  
  console.log('📂 Chargement des fichiers JSON...');
  
  // Level 1
  const level1Path = path.join(basePath, 'level1.json');
  const level1Data: Array<{ categoryId: string; label: string }> = JSON.parse(
    fs.readFileSync(level1Path, 'utf-8')
  );
  console.log(`   ✅ Level 1: ${level1Data.length} catégories`);

  // Level 2
  const level2Path = path.join(basePath, 'level2.json');
  const level2Data: Array<{
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level2Path, 'utf-8'));
  console.log(`   ✅ Level 2: ${level2Data.length} groupes`);

  // Level 3
  const level3Path = path.join(basePath, 'level3.json');
  const level3Data: Array<{
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = JSON.parse(fs.readFileSync(level3Path, 'utf-8'));
  console.log(`   ✅ Level 3: ${level3Data.length} groupes`);

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
  console.log(`   ✅ Level 4: ${level4Data.length} groupes\n`);

  // Map pour stocker les catégories créées: categoryId -> dbId
  const categoryMap = new Map<string, number>();
  let categoriesCreated = 0;
  let categoriesUpdated = 0;

  // Charger toutes les catégories existantes dans categoryMap
  console.log('📦 Chargement des catégories existantes...');
  const existingCategories = await prisma.tecDocCategory.findMany({
    select: {
      id: true,
      displayId: true,
    },
  });
  
  for (const cat of existingCategories) {
    categoryMap.set(cat.displayId, cat.id);
    // Ajouter aussi sans préfixe si c'est un SalesClassificationNode
    if (cat.displayId.startsWith('SalesClassificationNode_')) {
      const withoutPrefix = cat.displayId.replace('SalesClassificationNode_', '');
      if (!categoryMap.has(withoutPrefix)) {
        categoryMap.set(withoutPrefix, cat.id);
      }
    } else {
      // Si c'est sans préfixe, ajouter aussi avec préfixe
      const withPrefix = `SalesClassificationNode_${cat.displayId}`;
      if (!categoryMap.has(withPrefix)) {
        categoryMap.set(withPrefix, cat.id);
      }
    }
  }
  console.log(`   ✅ ${existingCategories.length} catégories existantes chargées\n`);

  // 1. Créer les catégories Level 1
  console.log('1️⃣  Création des catégories Level 1...');
  categoriesCreated = 0;
  categoriesUpdated = 0;
  
  for (const level1 of level1Data) {
    // Vérifier si déjà dans categoryMap (chargée au début)
    if (categoryMap.has(level1.categoryId)) {
      categoriesUpdated++;
      continue;
    }

    const slug = slugify(level1.label);
    const displayId = level1.categoryId; // Garder le displayId complet (ex: "SalesClassificationNode_6100000")
    const url = `/categorie/${slug}-${displayId}`;

    try {
      const category = await prisma.tecDocCategory.upsert({
        where: { displayId },
        update: {
          name: level1.label,
          slug,
          url,
          level: 1,
          parentId: null,
        },
        create: {
          name: level1.label,
          slug,
          displayId,
          level: 1,
          parentId: null,
          url,
        },
      });
      categoryMap.set(level1.categoryId, category.id);
      categoriesCreated++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Existe déjà, récupérer
        const existing = await prisma.tecDocCategory.findUnique({
          where: { displayId },
        });
        if (existing) {
          categoryMap.set(level1.categoryId, existing.id);
          categoriesUpdated++;
        }
      } else {
        console.error(`   ❌ Erreur pour ${level1.categoryId}: ${error.message}`);
      }
    }
  }
  console.log(`   ✅ ${categoriesCreated} créées, ${categoriesUpdated} mises à jour\n`);

  // 2. Créer les catégories Level 2
  console.log('2️⃣  Création des catégories Level 2...');
  categoriesCreated = 0;
  categoriesUpdated = 0;
  
  for (const level2Group of level2Data) {
    let parentId = categoryMap.get(level2Group.parentCategoryId);
    
    // Si pas trouvé, essayer sans préfixe
    if (!parentId && level2Group.parentCategoryId.startsWith('SalesClassificationNode_')) {
      const withoutPrefix = level2Group.parentCategoryId.replace('SalesClassificationNode_', '');
      parentId = categoryMap.get(withoutPrefix);
      if (parentId) {
        // Mettre à jour le displayId pour avoir le préfixe
        await prisma.tecDocCategory.update({
          where: { id: parentId },
          data: { displayId: level2Group.parentCategoryId },
        });
        categoryMap.set(level2Group.parentCategoryId, parentId);
      }
    }
    
    if (!parentId) {
      // Le parent devrait être dans level1, essayer de le créer
      const parentLevel1 = level1Data.find(l1 => l1.categoryId === level2Group.parentCategoryId);
      if (parentLevel1) {
        const slug = slugify(parentLevel1.label);
        const displayId = parentLevel1.categoryId;
        const url = `/categorie/${slug}-${displayId}`;
        
        try {
          const parentCategory = await prisma.tecDocCategory.upsert({
            where: { displayId },
            update: {
              name: parentLevel1.label,
              slug,
              url,
              level: 1,
              parentId: null,
            },
            create: {
              name: parentLevel1.label,
              slug,
              displayId,
              level: 1,
              parentId: null,
              url,
            },
          });
          categoryMap.set(parentLevel1.categoryId, parentCategory.id);
          parentId = parentCategory.id;
        } catch (error: any) {
          if (error.code === 'P2002') {
            const existing = await prisma.tecDocCategory.findUnique({
              where: { displayId },
            });
            if (existing) {
              categoryMap.set(parentLevel1.categoryId, existing.id);
              parentId = existing.id;
            }
          }
        }
      }
      
      if (!parentId) {
        console.warn(`   ⚠️  Parent non trouvé pour ${level2Group.parentCategoryId}`);
        continue;
      }
    }

    const finalParentId = parentId;

    for (const level2 of level2Group.categories) {
      const slug = slugify(level2.label);
      const displayId = level2.categoryId; // Garder le displayId complet
      const url = `/categorie/${slug}-${displayId}`;

      try {
        const category = await prisma.tecDocCategory.upsert({
          where: { displayId },
          update: {
            name: level2.label,
            slug,
            url,
            level: 2,
            parentId: finalParentId,
          },
          create: {
            name: level2.label,
            slug,
            displayId,
            level: 2,
            parentId: finalParentId,
            url,
          },
        });
        categoryMap.set(level2.categoryId, category.id);
        categoriesCreated++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existing = await prisma.tecDocCategory.findUnique({
            where: { displayId },
          });
          if (existing) {
            categoryMap.set(level2.categoryId, existing.id);
            await prisma.tecDocCategory.update({
              where: { id: existing.id },
              data: { parentId: finalParentId, level: 2 },
            });
            categoriesUpdated++;
          }
        } else {
          console.error(`   ❌ Erreur pour ${level2.categoryId}: ${error.message}`);
        }
      }
    }
  }
  console.log(`   ✅ ${categoriesCreated} créées, ${categoriesUpdated} mises à jour\n`);

  // 3. Créer les catégories Level 3
  console.log('3️⃣  Création des catégories Level 3...');
  categoriesCreated = 0;
  categoriesUpdated = 0;
  
  for (const level3Group of level3Data) {
    const parentId = categoryMap.get(level3Group.parentCategoryId);
    if (!parentId) {
      continue;
    }

    for (const level3 of level3Group.categories) {
      const slug = slugify(level3.label);
      const displayId = level3.categoryId; // Garder le displayId complet
      const url = `/categorie/${slug}-${displayId}`;

      try {
        const category = await prisma.tecDocCategory.upsert({
          where: { displayId },
          update: {
            name: level3.label,
            slug,
            url,
            level: 3,
            parentId,
          },
          create: {
            name: level3.label,
            slug,
            displayId,
            level: 3,
            parentId,
            url,
          },
        });
        categoryMap.set(level3.categoryId, category.id);
        categoriesCreated++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existing = await prisma.tecDocCategory.findUnique({
            where: { displayId },
          });
          if (existing) {
            categoryMap.set(level3.categoryId, existing.id);
            await prisma.tecDocCategory.update({
              where: { id: existing.id },
              data: { parentId, level: 3 },
            });
            categoriesUpdated++;
          }
        }
      }
    }
  }
  console.log(`   ✅ ${categoriesCreated} créées, ${categoriesUpdated} mises à jour\n`);

  // 4. Créer les catégories Level 4
  console.log('4️⃣  Création des catégories Level 4...');
  categoriesCreated = 0;
  categoriesUpdated = 0;
  
  for (const level4Group of level4Data) {
    const parentId = categoryMap.get(level4Group.parentCategoryId);
    if (!parentId) {
      continue;
    }

    for (const level4 of level4Group.categories) {
      const slug = slugify(level4.label);
      const displayId = level4.categoryId; // Garder le displayId complet
      const url = `/categorie/${slug}-${displayId}`;

      try {
        const category = await prisma.tecDocCategory.upsert({
          where: { displayId },
          update: {
            name: level4.label,
            slug,
            url,
            level: 4,
            parentId,
          },
          create: {
            name: level4.label,
            slug,
            displayId,
            level: 4,
            parentId,
            url,
          },
        });
        categoryMap.set(level4.categoryId, category.id);
        categoriesCreated++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existing = await prisma.tecDocCategory.findUnique({
            where: { displayId },
          });
          if (existing) {
            categoryMap.set(level4.categoryId, existing.id);
            await prisma.tecDocCategory.update({
              where: { id: existing.id },
              data: { parentId, level: 4 },
            });
            categoriesUpdated++;
          }
        }
      }
    }
  }
  console.log(`   ✅ ${categoriesCreated} créées, ${categoriesUpdated} mises à jour\n`);

  // Vérification finale
  const totalCategories = await prisma.tecDocCategory.count();
  const byLevel = await prisma.tecDocCategory.groupBy({
    by: ['level'],
    _count: {
      level: true,
    },
  });

  console.log('📊 Résultats finaux:');
  console.log(`   Total catégories: ${totalCategories}`);
  for (const level of byLevel.sort((a, b) => a.level - b.level)) {
    console.log(`   Level ${level.level}: ${level._count.level}`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Arborescence complète créée!');
}

buildFullArborescenceFromJSON().catch(console.error);

