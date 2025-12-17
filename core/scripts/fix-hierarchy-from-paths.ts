import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fixHierarchyFromPaths() {
  console.log('🔧 Correction de la hiérarchie depuis les chemins complets...\n');

  // Lire product-groups.json pour avoir les chemins
  const fs = await import('fs');
  const path = await import('path');
  const productGroupsPath = path.join(process.cwd(), 'product-groups.json');
  const productGroupsContent = fs.readFileSync(productGroupsPath, 'utf-8');
  const productGroupsData: Array<{
    categories: Array<{
      path: string[];
      categoryId: number;
      level: number;
    }>;
  }> = JSON.parse(productGroupsContent);

  // Lire aussi les fichiers tecdoc-results pour avoir les chemins complets
  const tecdocResultsPath = path.join(process.cwd(), 'tecdoc-results');
  const tecdocFiles = fs.readdirSync(tecdocResultsPath).filter(f => f.endsWith('.json'));

  console.log(`📂 Analyse de ${tecdocFiles.length} fichiers TecDoc...\n`);

  // Collecter tous les chemins avec leurs categoryIds
  const categoryPaths = new Map<number, string[]>(); // categoryId -> path complet

  for (const file of tecdocFiles) {
    const filePath = path.join(tecdocResultsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (data.arborescencePaths) {
      for (const pathData of data.arborescencePaths) {
        if (pathData.finalCategoryId) {
          categoryPaths.set(pathData.finalCategoryId, pathData.path);
        }
      }
    }
  }

  console.log(`📦 ${categoryPaths.size} chemins trouvés\n`);

  // Récupérer toutes les catégories
  const allCategories = await db.tecDocCategory.findMany({
    select: {
      id: true,
      slug: true,
      tecdocCategoryId: true,
      level: true,
      parentId: true,
    },
  });

  // Créer un Map slug -> category
  const slugToCategory = new Map(
    allCategories.map(c => [c.slug, c])
  );

  let updated = 0;
  let skipped = 0;

  // Pour chaque chemin, établir la hiérarchie
  for (const [categoryId, pathArray] of categoryPaths.entries()) {
    const category = allCategories.find(c => c.tecdocCategoryId === categoryId);
    if (!category) continue;

    // Le dernier élément du chemin est la catégorie elle-même
    // L'avant-dernier est son parent
    if (pathArray.length < 2) continue;

    const parentName = pathArray[pathArray.length - 2];
    const parentSlug = slugify(parentName);

    const parentCategory = slugToCategory.get(parentSlug);
    if (!parentCategory) {
      skipped++;
      continue;
    }

    // Mettre à jour si le parent est différent
    if (category.parentId !== parentCategory.id) {
      await db.tecDocCategory.update({
        where: { id: category.id },
        data: { parentId: parentCategory.id },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Correction terminée !`);
  console.log(`   - Catégories mises à jour: ${updated}`);
  console.log(`   - Catégories inchangées: ${skipped}`);

  await db.$disconnect();
}

fixHierarchyFromPaths().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});































