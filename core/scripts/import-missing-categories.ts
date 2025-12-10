import { db } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArborescenceToCategories(
  arbo: Record<string, any>,
  currentPath: string[] = []
): Array<{ path: string[]; categoryId: number | null; level: number }> {
  const categories: Array<{ path: string[]; categoryId: number | null; level: number }> = [];

  for (const [key, value] of Object.entries(arbo)) {
    const slug = slugify(key);
    const newPath = [...currentPath, slug];

    // Si cette catégorie a un categoryId, c'est une catégorie finale
    if (value.categoryId) {
      categories.push({
        path: newPath,
        categoryId: value.categoryId,
        level: value.level || newPath.length,
      });
    }

    // Récursivement parser les enfants
    if (value.children && Object.keys(value.children).length > 0) {
      const childCategories = parseArborescenceToCategories(value.children, newPath);
      categories.push(...childCategories);
    }
  }

  return categories;
}

async function importMissingCategories() {
  console.log('🔧 Import des catégories manquantes depuis tecdoc-results...\n');

  // Récupérer les groupes sans catégories
  const groupsWithoutCategories = await db.productGroup.findMany({
    where: {
      categories: {
        none: {},
      },
    },
    select: {
      id: true,
      productName: true,
      slug: true,
      tecdocProductId: true,
    },
  });

  console.log(`📦 ${groupsWithoutCategories.length} groupes à traiter\n`);

  // Lire les fichiers tecdoc-results
  const tecdocResultsPath = path.join(process.cwd(), 'tecdoc-results');
  const tecdocFiles = fs.readdirSync(tecdocResultsPath).filter(f => f.endsWith('.json'));

  console.log(`📂 ${tecdocFiles.length} fichiers TecDoc disponibles\n`);

  // Créer un Map slug -> fichier
  const fileMap = new Map<string, string>();
  for (const file of tecdocFiles) {
    const filePath = path.join(tecdocResultsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.productName) {
      const slug = slugify(data.productName);
      fileMap.set(slug, filePath);
    }
  }

  let processed = 0;
  let categoriesFound = 0;
  let categoriesCreated = 0;
  let relationsCreated = 0;

  for (const group of groupsWithoutCategories) {
    const filePath = fileMap.get(group.slug);
    if (!filePath) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.arborescence) {
      continue;
    }

    // Extraire les catégories depuis l'arborescence
    let categories = parseArborescenceToCategories(data.arborescence || {});

    // Utiliser aussi arborescencePaths si disponible
    if (data.arborescencePaths && data.arborescencePaths.length > 0) {
      data.arborescencePaths.forEach((pathData: any) => {
        const slugs = pathData.path.map((p: string) => slugify(p));
        const finalCategoryId = pathData.finalCategoryId;
        if (finalCategoryId) {
          categories.push({
            path: slugs,
            categoryId: finalCategoryId,
            level: slugs.length,
          });
        }
      });
    }

    if (categories.length === 0) {
      continue;
    }

    categoriesFound++;
    processed++;

    // Pour chaque catégorie, créer la relation
    for (const cat of categories) {
      if (!cat.categoryId || cat.categoryId === 0) continue;

      // Chercher la catégorie dans la base
      const category = await db.tecDocCategory.findFirst({
        where: {
          tecdocCategoryId: cat.categoryId,
        },
      });

      if (!category) {
        // Catégorie n'existe pas, on skip pour l'instant
        continue;
      }

      // Créer la relation
      try {
        await db.productGroupCategory.create({
          data: {
            productGroupId: group.id,
            tecdocCategoryId: category.id,
          },
        });
        relationsCreated++;
      } catch (error: any) {
        // Ignorer les doublons
        if (error.code !== 'P2002') {
          console.error(`❌ Erreur pour ${group.productName}:`, error.message);
        }
      }
    }

    if (processed % 100 === 0) {
      console.log(`   Traités: ${processed}/${groupsWithoutCategories.length}...`);
    }
  }

  console.log(`\n✅ Import terminé !`);
  console.log(`   - Groupes traités: ${processed}`);
  console.log(`   - Groupes avec catégories trouvées: ${categoriesFound}`);
  console.log(`   - Relations créées: ${relationsCreated}`);

  await db.$disconnect();
}

importMissingCategories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























