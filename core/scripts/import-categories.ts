import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function importCategories() {
  console.log('🚀 Démarrage de l\'importation des catégories...\n');

  // Récupérer tous les groupes de produits avec leurs catégories
  const productGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
      slug: true,
    },
  });

  console.log(`📦 ${productGroups.length} groupes de produits trouvés\n`);

  // Lire product-groups.json pour récupérer les chemins de catégories
  const fs = await import('fs');
  const path = await import('path');
  const productGroupsPath = path.join(process.cwd(), 'product-groups.json');
  const productGroupsContent = fs.readFileSync(productGroupsPath, 'utf-8');
  const productGroupsData: Array<{
    productName: string;
    slug: string;
    categories: Array<{
      path: string[];
      categoryId: number;
      level: number;
    }>;
  }> = JSON.parse(productGroupsContent);

  // Créer un Map pour retrouver rapidement les groupes
  const groupsMap = new Map(
    productGroups.map((g) => [g.slug, g])
  );

  console.log('📂 Création des catégories...\n');

  const categoriesCreated = new Map<string, number>(); // slug -> categoryId DB
  let totalRelations = 0;
  let skippedRelations = 0;

  for (const groupData of productGroupsData) {
    const dbGroup = groupsMap.get(groupData.slug);
    if (!dbGroup) {
      continue; // Groupe non trouvé en DB, skip
    }

    // Pour chaque catégorie de ce groupe
    for (const cat of groupData.categories) {
      if (!cat.categoryId || cat.categoryId === 0) {
        continue;
      }

      // Le dernier élément du path est la catégorie finale
      const finalSlug = cat.path[cat.path.length - 1];
      const categoryDisplayId = String(cat.categoryId);
      const categoryUrl = `/categorie/${finalSlug}-${categoryDisplayId}`;

      // Vérifier si la catégorie existe déjà
      let categoryDbId = categoriesCreated.get(`${finalSlug}-${cat.categoryId}`);

      if (!categoryDbId) {
        // Chercher dans la base
        // Prisma convertit TecDocCategory en tecDocCategory (camelCase avec D majuscule)
        const existingCategory = await db.tecDocCategory.findFirst({
          where: {
            tecdocCategoryId: cat.categoryId,
          },
        });

        if (existingCategory) {
          categoryDbId = existingCategory.id;
          categoriesCreated.set(`${finalSlug}-${cat.categoryId}`, categoryDbId);
        } else {
          // Créer la catégorie
          try {
            const newCategory = await db.tecDocCategory.create({
              data: {
                name: cat.path[cat.path.length - 1], // Nom de la catégorie finale
                slug: finalSlug,
                displayId: categoryDisplayId,
                tecdocCategoryId: cat.categoryId,
                level: cat.level,
                url: categoryUrl,
              },
            });
            categoryDbId = newCategory.id;
            categoriesCreated.set(`${finalSlug}-${cat.categoryId}`, categoryDbId);
          } catch (error: any) {
            if (error.code === 'P2002') {
              // Doublon sur slug ou displayId, chercher à nouveau
              const found = await db.tecDocCategory.findFirst({
                where: {
                  OR: [
                    { slug: finalSlug },
                    { displayId: categoryDisplayId },
                  ],
                },
              });
              if (found) {
                categoryDbId = found.id;
                categoriesCreated.set(`${finalSlug}-${cat.categoryId}`, categoryDbId);
              } else {
                console.error(`❌ Erreur avec catégorie ${finalSlug} (${cat.categoryId}):`, error.message);
                continue;
              }
            } else {
              console.error(`❌ Erreur avec catégorie ${finalSlug} (${cat.categoryId}):`, error);
              continue;
            }
          }
        }
      }

        // Créer la relation ProductGroupCategory
        if (categoryDbId) {
          try {
            await db.productGroupCategory.create({
              data: {
                productGroupId: dbGroup.id,
                tecdocCategoryId: categoryDbId,
              },
            });
            totalRelations++;
          } catch (error: any) {
            // Ignorer les doublons (unique constraint)
            if (error.code === 'P2002') {
              skippedRelations++;
            } else {
              console.error(`❌ Erreur relation ${dbGroup.slug} -> ${finalSlug}:`, error.message);
            }
          }
        }
    }
  }

  console.log(`\n✅ Importation terminée !`);
  console.log(`   - Catégories créées/trouvées: ${categoriesCreated.size}`);
  console.log(`   - Relations créées: ${totalRelations}`);
  console.log(`   - Relations ignorées (doublons): ${skippedRelations}`);

  await db.$disconnect();
}

importCategories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});

