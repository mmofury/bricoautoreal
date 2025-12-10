// Script pour analyser les problèmes dans les catégories de la DB
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCategoriesIssues() {
  console.log('🔍 Analyse des problèmes dans les catégories de la DB...\n');

  // 1. Statistiques générales
  const totalCategories = await prisma.tecdocCategory.count();
  const categoriesWithTecDocId = await prisma.tecdocCategory.count({
    where: { tecdocCategoryId: { not: null } },
  });
  const categoriesWithoutTecDocId = totalCategories - categoriesWithTecDocId;

  console.log('📊 Statistiques générales:');
  console.log(`   📁 Total catégories: ${totalCategories}`);
  console.log(`   ✅ Avec tecdocCategoryId: ${categoriesWithTecDocId}`);
  console.log(`   ❌ Sans tecdocCategoryId: ${categoriesWithoutTecDocId}\n`);

  // 2. Doublons par tecdocCategoryId
  const duplicates = await prisma.$queryRaw<Array<{ tecdocCategoryId: number; count: bigint }>>`
    SELECT tecdoc_category_id, COUNT(*) as count
    FROM tecdoc_categories
    WHERE tecdoc_category_id IS NOT NULL
    GROUP BY tecdoc_category_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;

  console.log('🔍 Doublons par tecdocCategoryId:');
  if (duplicates.length === 0) {
    console.log('   ✅ Aucun doublon trouvé\n');
  } else {
    console.log(`   ⚠️  ${duplicates.length} tecdocCategoryId en doublon:\n`);
    for (const dup of duplicates) {
      const categories = await prisma.tecdocCategory.findMany({
        where: { tecdocCategoryId: Number(dup.tecdocCategoryId) },
        select: { id: true, name: true, slug: true, level: true },
      });
      console.log(`   - tecdocCategoryId ${dup.tecdocCategoryId} (${dup.count} occurrences):`);
      categories.forEach(cat => {
        console.log(`     • ID: ${cat.id}, Nom: "${cat.name}", Niveau: ${cat.level}, Slug: ${cat.slug}`);
      });
      console.log('');
    }
  }

  // 3. Catégories orphelines (sans parent mais level > 1)
  const orphanCategories = await prisma.tecdocCategory.findMany({
    where: {
      parentId: null,
      level: { gt: 1 },
    },
    select: { id: true, name: true, level: true, tecdocCategoryId: true },
    take: 20,
  });

  console.log('🔍 Catégories orphelines (level > 1 sans parent):');
  if (orphanCategories.length === 0) {
    console.log('   ✅ Aucune catégorie orpheline\n');
  } else {
    console.log(`   ⚠️  ${orphanCategories.length} catégories orphelines (affichage des 20 premières):\n`);
    orphanCategories.forEach(cat => {
      console.log(`   - ID: ${cat.id}, Nom: "${cat.name}", Niveau: ${cat.level}, tecdocCategoryId: ${cat.tecdocCategoryId || 'NULL'}`);
    });
    console.log('');
  }

  // 4. Incohérences de niveau (parent.level >= child.level)
  const levelInconsistencies = await prisma.$queryRaw<Array<{
    childId: number;
    childName: string;
    childLevel: number;
    parentId: number;
    parentName: string;
    parentLevel: number;
  }>>`
    SELECT 
      c.id as childId,
      c.name as childName,
      c.level as childLevel,
      p.id as parentId,
      p.name as parentName,
      p.level as parentLevel
    FROM tecdoc_categories c
    INNER JOIN tecdoc_categories p ON c.parent_id = p.id
    WHERE c.level <= p.level
    LIMIT 20
  `;

  console.log('🔍 Incohérences de niveau (enfant.level <= parent.level):');
  if (levelInconsistencies.length === 0) {
    console.log('   ✅ Aucune incohérence de niveau\n');
  } else {
    console.log(`   ⚠️  ${levelInconsistencies.length} incohérences (affichage des 20 premières):\n`);
    levelInconsistencies.forEach(inc => {
      console.log(`   - Enfant: "${inc.childName}" (ID: ${inc.childId}, Niveau: ${inc.childLevel})`);
      console.log(`     Parent: "${inc.parentName}" (ID: ${inc.parentId}, Niveau: ${inc.parentLevel})`);
      console.log('');
    });
  }

  // 5. Catégories sans ProductGroup associés
  const categoriesWithoutProducts = await prisma.tecdocCategory.findMany({
    where: {
      productGroups: {
        none: {},
      },
    },
    select: { id: true, name: true, level: true, tecdocCategoryId: true },
    take: 20,
  });

  const totalCategoriesWithoutProducts = await prisma.tecdocCategory.count({
    where: {
      productGroups: {
        none: {},
      },
    },
  });

  console.log('🔍 Catégories sans ProductGroup associés:');
  console.log(`   📊 Total: ${totalCategoriesWithoutProducts} sur ${totalCategories} (${((totalCategoriesWithoutProducts / totalCategories) * 100).toFixed(1)}%)`);
  if (categoriesWithoutProducts.length > 0) {
    console.log(`   Exemples (20 premières):\n`);
    categoriesWithoutProducts.forEach(cat => {
      console.log(`   - ID: ${cat.id}, Nom: "${cat.name}", Niveau: ${cat.level}`);
    });
    console.log('');
  }

  // 6. ProductGroupCategory avec des catégories inexistantes
  const invalidRelations = await prisma.$queryRaw<Array<{ id: number; productGroupId: number; tecdocCategoryId: number }>>`
    SELECT pgc.id, pgc.product_group_id, pgc.tecdoc_category_id
    FROM product_group_categories pgc
    LEFT JOIN tecdoc_categories tc ON pgc.tecdoc_category_id = tc.id
    WHERE tc.id IS NULL
    LIMIT 20
  `;

  console.log('🔍 Relations ProductGroupCategory invalides (catégorie inexistante):');
  if (invalidRelations.length === 0) {
    console.log('   ✅ Aucune relation invalide\n');
  } else {
    console.log(`   ⚠️  ${invalidRelations.length} relations invalides (affichage des 20 premières):\n`);
    for (const rel of invalidRelations) {
      const pg = await prisma.productGroup.findUnique({
        where: { id: rel.productGroupId },
        select: { productName: true },
      });
      console.log(`   - ProductGroupCategory ID: ${rel.id}`);
      console.log(`     ProductGroup: "${pg?.productName || 'INCONNU'}" (ID: ${rel.productGroupId})`);
      console.log(`     TecDocCategory ID: ${rel.tecdocCategoryId} (N'EXISTE PAS)`);
      console.log('');
    }
  }

  // 7. Répartition par niveau
  const byLevel = await prisma.tecdocCategory.groupBy({
    by: ['level'],
    _count: true,
    orderBy: { level: 'asc' },
  });

  console.log('📊 Répartition par niveau:');
  byLevel.forEach(stat => {
    console.log(`   Niveau ${stat.level}: ${stat._count} catégories`);
  });
  console.log('');

  await prisma.$disconnect();
}

analyzeCategoriesIssues().catch(console.error);

























