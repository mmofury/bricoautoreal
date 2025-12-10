import * as fs from 'fs';
import * as path from 'path';
import { db } from '../lib/db';

interface ProductGroupFromJSON {
  productName: string;
  slug: string;
  tecdocProductId: number;
  categories: Array<{
    path: string[];
    categoryId: number;
    level: number;
  }>;
  displayId: string;
  url: string;
}

interface TecDocResult {
  productName: string;
  productId: number;
  arborescence?: Record<string, any>;
  arborescencePaths?: Array<{
    path: string[];
    categoryIds: (number | null)[];
    finalCategoryId: number;
  }>;
  tests?: Array<{
    typeId: number;
    found: boolean;
    hasMatch: boolean;
    arborescence?: Record<string, any>;
    arborescencePaths?: Array<{
      path: string[];
      categoryIds: (number | null)[];
      finalCategoryId: number;
    }>;
  }>;
  bestMatch?: {
    typeId: number;
    found: boolean;
    hasMatch: boolean;
  };
}

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

async function importProductGroups() {
  console.log('🚀 Démarrage de l\'importation des groupes de produits...\n');

  // 1. Importer depuis product-groups.json
  console.log('📂 Lecture de product-groups.json...');
  // Le fichier est dans le dossier core
  const productGroupsPath = path.join(process.cwd(), 'product-groups.json');
  const productGroupsContent = fs.readFileSync(productGroupsPath, 'utf-8');
  const productGroups: ProductGroupFromJSON[] = JSON.parse(productGroupsContent);
  console.log(`✅ ${productGroups.length} groupes trouvés dans product-groups.json\n`);

  // 2. Importer depuis tecdoc-results-other-types
  console.log('📂 Lecture des fichiers dans tecdoc-results-other-types...');
  const otherTypesDir = path.join(process.cwd(), 'tecdoc-results-other-types');
  const files = fs.readdirSync(otherTypesDir).filter((f) => f.endsWith('.json') && f !== '_progress.json');

  const otherTypesGroups: ProductGroupFromJSON[] = [];
  let processed = 0;

  for (const file of files) {
    try {
      const filePath = path.join(otherTypesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: TecDocResult = JSON.parse(content);

      if (!data.productName || !data.productId) {
        continue;
      }

      let categories: Array<{ path: string[]; categoryId: number | null; level: number }> = [];

      // Si c'est un fichier avec tests (tecdoc-results-other-types)
      if (data.tests && data.tests.length > 0) {
        // Utiliser le bestMatch ou le premier test avec arborescence
        const testToUse = data.bestMatch
          ? data.tests.find((t) => t.typeId === data.bestMatch?.typeId && t.hasMatch)
          : data.tests.find((t) => t.hasMatch && t.arborescence);

        if (testToUse?.arborescence) {
          categories = parseArborescenceToCategories(testToUse.arborescence);
        }

        // Utiliser aussi arborescencePaths si disponible
        if (testToUse?.arborescencePaths && testToUse.arborescencePaths.length > 0) {
          testToUse.arborescencePaths.forEach((pathData) => {
            const slugs = pathData.path.map((p) => slugify(p));
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
      } else {
        // Format classique (tecdoc-results)
        // Extraire les catégories depuis l'arborescence
        categories = parseArborescenceToCategories(data.arborescence || {});

        // Utiliser aussi arborescencePaths si disponible
        if (data.arborescencePaths && data.arborescencePaths.length > 0) {
          data.arborescencePaths.forEach((pathData) => {
            const slugs = pathData.path.map((p) => slugify(p));
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
      }

      if (categories.length > 0) {
        const slug = slugify(data.productName);
        // Générer un displayId unique : utiliser productId TecDoc, mais s'assurer qu'il est unique
        // En ajoutant un suffixe si nécessaire
        let displayId = String(data.productId).padStart(5, '0');

        otherTypesGroups.push({
          productName: data.productName,
          slug,
          tecdocProductId: data.productId,
          categories: categories.map((cat) => ({
            path: cat.path,
            categoryId: cat.categoryId || 0,
            level: cat.level,
          })),
          displayId,
          url: `/pieces-detachees/${slug}-${displayId}`,
        });
      }

      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(`\r   Traité: ${processed}/${files.length} fichiers...`);
      }
    } catch (error) {
      console.error(`\n❌ Erreur avec ${file}:`, error);
    }
  }

  console.log(`\n✅ ${otherTypesGroups.length} groupes trouvés dans tecdoc-results-other-types\n`);

  // 3. Combiner les deux sources (éviter les doublons)
  console.log('🔄 Combinaison des sources...');
  const allGroups = new Map<string, ProductGroupFromJSON>();

  // Ajouter depuis product-groups.json
  productGroups.forEach((group) => {
    const key = `${group.slug}-${group.tecdocProductId}`;
    // Remplacer /produit/ par /pieces-detachees/ dans l'URL
    const updatedGroup = {
      ...group,
      url: group.url.replace('/produit/', '/pieces-detachees/'),
    };
    allGroups.set(key, updatedGroup);
  });

  // Ajouter depuis other-types (ne pas écraser si existe déjà)
  otherTypesGroups.forEach((group) => {
    const key = `${group.slug}-${group.tecdocProductId}`;
    if (!allGroups.has(key)) {
      allGroups.set(key, group);
    }
  });

  console.log(`✅ Total: ${allGroups.size} groupes uniques à importer\n`);

  // 4. Importer dans la base de données
  console.log('💾 Importation dans la base de données...\n');

  let imported = 0;
  let categoriesCreated = 0;
  let relationsCreated = 0;

  for (const group of allGroups.values()) {
    try {
      // Vérifier si un groupe avec ce slug existe déjà
      let productGroup = await db.productGroup.findUnique({
        where: {
          slug: group.slug,
        },
      });

      if (!productGroup) {
        // Vérifier si le displayId est déjà utilisé
        let finalDisplayId = group.displayId;
        let existingWithDisplayId = await db.productGroup.findUnique({
          where: { displayId: finalDisplayId },
        });

        // Si le displayId existe déjà, générer un nouveau
        if (existingWithDisplayId) {
          // Utiliser slug + tecdocProductId pour créer un displayId unique
          finalDisplayId = `${group.slug}-${group.tecdocProductId}`.substring(0, 20);
          // Vérifier à nouveau
          existingWithDisplayId = await db.productGroup.findUnique({
            where: { displayId: finalDisplayId },
          });
          if (existingWithDisplayId) {
            // Dernier recours : utiliser un timestamp
            finalDisplayId = `${group.slug}-${Date.now()}`.substring(0, 20);
          }
        }

        // Créer un nouveau groupe
        productGroup = await db.productGroup.create({
          data: {
            productName: group.productName,
            slug: group.slug,
            displayId: finalDisplayId,
            tecdocProductId: group.tecdocProductId,
            url: `/pieces-detachees/${group.slug}-${finalDisplayId}`,
          },
        });
      } else {
        // Mettre à jour si nécessaire (sans changer le displayId)
        productGroup = await db.productGroup.update({
          where: { id: productGroup.id },
          data: {
            productName: group.productName,
            tecdocProductId: group.tecdocProductId,
          },
        });
      }

      imported++;

      // Créer les catégories et les relations
      for (const cat of group.categories) {
        if (!cat.categoryId || cat.categoryId === 0) {
          continue;
        }

        // Créer la catégorie finale (dernier élément du path)
        const finalSlug = cat.path[cat.path.length - 1];
        const categoryPath = cat.path.join('/');

        // Créer les catégories et les relations (skip pour l'instant si le modèle n'existe pas)
        // Les catégories seront créées dans une étape séparée
        // On skip silencieusement pour éviter les erreurs
      }

      if (imported % 100 === 0) {
        process.stdout.write(`\r   Importés: ${imported}/${allGroups.size} groupes...`);
      }
    } catch (error) {
      console.error(`\n❌ Erreur avec ${group.productName}:`, error);
    }
  }

  console.log(`\n\n✅ Importation terminée !`);
  console.log(`   - Groupes de produits: ${imported}`);
  console.log(`   - Catégories créées: ${categoriesCreated}`);
  console.log(`   - Relations créées: ${relationsCreated}`);

  await db.$disconnect();
}

importProductGroups().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});

