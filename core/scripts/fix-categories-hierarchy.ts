import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fixHierarchy() {
  console.log('🔧 Correction de la hiérarchie des catégories...\n');

  // Lire product-groups.json
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

  // Collecter tous les chemins uniques
  const allPaths = new Set<string>();
  const categoryMap = new Map<number, { path: string[]; level: number }>();

  for (const group of productGroupsData) {
    for (const cat of group.categories) {
      if (!cat.categoryId || cat.categoryId === 0) continue;
      
      const pathKey = cat.path.join('|');
      allPaths.add(pathKey);
      categoryMap.set(cat.categoryId, { path: cat.path, level: cat.level });
    }
  }

  console.log(`📦 ${categoryMap.size} catégories à traiter\n`);

  // Créer un Map pour stocker les IDs de catégories par slug
  const slugToCategoryId = new Map<string, number>();

  // Récupérer toutes les catégories existantes
  const existingCategories = await db.tecDocCategory.findMany({
    select: {
      id: true,
      slug: true,
      tecdocCategoryId: true,
      level: true,
    },
  });

  for (const cat of existingCategories) {
    if (cat.tecdocCategoryId) {
      slugToCategoryId.set(cat.slug, cat.id);
    }
  }

  console.log('🔗 Établissement des relations parent-enfant...\n');

  let updated = 0;
  let skipped = 0;

  // Pour chaque catégorie, trouver son parent dans le chemin
  for (const [tecdocCategoryId, catData] of categoryMap.entries()) {
    const category = existingCategories.find(c => c.tecdocCategoryId === tecdocCategoryId);
    if (!category) continue;

    // Si la catégorie est au niveau 1, pas de parent
    if (catData.level === 1 || catData.path.length <= 1) {
      if (category.level !== 1) {
        await db.tecDocCategory.update({
          where: { id: category.id },
          data: { level: 1, parentId: null },
        });
        updated++;
      }
      continue;
    }

    // Trouver le parent dans le chemin (l'élément avant le dernier)
    const parentPath = catData.path.slice(0, -1);
    const parentSlug = slugify(parentPath[parentPath.length - 1]);

    // Chercher le parent par son slug
    const parentCategory = existingCategories.find(
      c => c.slug === parentSlug && c.level < catData.level
    );

    if (parentCategory) {
      // Mettre à jour la catégorie avec son parent
      if (category.parentId !== parentCategory.id || category.level !== catData.level) {
        await db.tecDocCategory.update({
          where: { id: category.id },
          data: {
            parentId: parentCategory.id,
            level: catData.level,
          },
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Parent non trouvé - créer une catégorie parente virtuelle
      // Pour l'instant, on skip et on log
      console.log(`⚠️  Parent "${parentSlug}" non trouvé pour "${category.slug}" (niveau ${catData.level})`);
      skipped++;
    }
  }

  console.log(`\n✅ Correction terminée !`);
  console.log(`   - Catégories mises à jour: ${updated}`);
  console.log(`   - Catégories inchangées: ${skipped}`);

  await db.$disconnect();
}

fixHierarchy().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























