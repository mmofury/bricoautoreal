import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryPath {
  path: string[];
  categoryId: number;
  level: number;
}

async function importCategoriesWithHierarchy() {
  console.log('🚀 Démarrage de l\'importation des catégories avec hiérarchie...\n');

  // Lire product-groups.json
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

  // Collecter tous les chemins de catégories uniques
  const categoryPathsMap = new Map<string, CategoryPath>();

  for (const group of productGroupsData) {
    for (const cat of group.categories) {
      if (!cat.categoryId || cat.categoryId === 0) continue;
      
      const key = `${cat.categoryId}-${cat.path.join('/')}`;
      if (!categoryPathsMap.has(key)) {
        categoryPathsMap.set(key, {
          path: cat.path,
          categoryId: cat.categoryId,
          level: cat.level,
        });
      }
    }
  }

  console.log(`📦 ${categoryPathsMap.size} chemins de catégories uniques trouvés\n`);

  // Créer un Map pour stocker les catégories créées (par categoryId TecDoc)
  const createdCategories = new Map<number, number>(); // tecdocCategoryId -> dbId

  // Trier les catégories par niveau (créer d'abord les parents)
  const sortedCategories = Array.from(categoryPathsMap.values()).sort((a, b) => {
    // D'abord par niveau (1, 2, 3...)
    if (a.level !== b.level) return a.level - b.level;
    // Puis par longueur du chemin (parents avant enfants)
    return a.path.length - b.path.length;
  });

  console.log('📂 Création des catégories avec hiérarchie...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const catPath of sortedCategories) {
    const finalSlug = catPath.path[catPath.path.length - 1];
    const categoryDisplayId = String(catPath.categoryId);
    const categoryUrl = `/categorie/${finalSlug}-${categoryDisplayId}`;

    // Déterminer le parent
    let parentId: number | null = null;
    
    if (catPath.path.length > 1) {
      // Chercher le parent dans le chemin (l'élément avant le dernier)
      const parentPath = catPath.path.slice(0, -1);
      const parentSlug = parentPath[parentPath.length - 1];
      
      // Chercher une catégorie parente qui correspond
      // On cherche par le slug du parent dans le chemin
      const parentCategory = await db.tecDocCategory.findFirst({
        where: {
          slug: parentSlug,
          level: catPath.level - 1,
        },
      });
      
      if (parentCategory) {
        parentId = parentCategory.id;
      } else {
        // Si le parent n'est pas trouvé, chercher par tecdocCategoryId dans les chemins précédents
        // On va créer les parents manquants si nécessaire
        // Pour l'instant, on skip et on créera les parents d'abord
        console.log(`⚠️  Parent non trouvé pour ${finalSlug}, création sans parent pour l'instant`);
      }
    }

    // Vérifier si la catégorie existe déjà
    const existing = await db.tecDocCategory.findFirst({
      where: {
        tecdocCategoryId: catPath.categoryId,
      },
    });

    if (existing) {
      // Mettre à jour avec le parent si nécessaire
      if (existing.parentId !== parentId) {
        await db.tecDocCategory.update({
          where: { id: existing.id },
          data: { parentId },
        });
        updated++;
      } else {
        skipped++;
      }
      createdCategories.set(catPath.categoryId, existing.id);
    } else {
      // Créer la nouvelle catégorie
      try {
        const newCategory = await db.tecDocCategory.create({
          data: {
            name: finalSlug,
            slug: finalSlug,
            displayId: categoryDisplayId,
            tecdocCategoryId: catPath.categoryId,
            level: catPath.level,
            parentId,
            url: categoryUrl,
          },
        });
        createdCategories.set(catPath.categoryId, newCategory.id);
        created++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Doublon, chercher à nouveau
          const found = await db.tecDocCategory.findFirst({
            where: {
              OR: [
                { slug: finalSlug },
                { displayId: categoryDisplayId },
                { tecdocCategoryId: catPath.categoryId },
              ],
            },
          });
          if (found) {
            createdCategories.set(catPath.categoryId, found.id);
            if (found.parentId !== parentId) {
              await db.tecDocCategory.update({
                where: { id: found.id },
                data: { parentId },
              });
              updated++;
            } else {
              skipped++;
            }
          }
        } else {
          console.error(`❌ Erreur avec catégorie ${finalSlug} (${catPath.categoryId}):`, error.message);
        }
      }
    }
  }

  // Deuxième passe : corriger les relations parent-enfant
  console.log('\n🔗 Correction des relations parent-enfant...\n');
  
  let relationsFixed = 0;
  
  for (const catPath of sortedCategories) {
    if (catPath.path.length <= 1) continue; // Pas de parent
    
    const categoryDbId = createdCategories.get(catPath.categoryId);
    if (!categoryDbId) continue;
    
    // Trouver le parent dans le chemin
    const parentPath = catPath.path.slice(0, -1);
    const parentSlug = parentPath[parentPath.length - 1];
    
    // Chercher le parent par son slug et son niveau
    const parentCategory = await db.tecDocCategory.findFirst({
      where: {
        slug: parentSlug,
        level: { lte: catPath.level - 1 },
      },
      orderBy: {
        level: 'desc', // Prendre le parent le plus proche
      },
    });
    
    if (parentCategory) {
      const category = await db.tecDocCategory.findUnique({
        where: { id: categoryDbId },
      });
      
      if (category && category.parentId !== parentCategory.id) {
        await db.tecDocCategory.update({
          where: { id: categoryDbId },
          data: { parentId: parentCategory.id },
        });
        relationsFixed++;
      }
    }
  }

  console.log(`\n✅ Importation terminée !`);
  console.log(`   - Catégories créées: ${created}`);
  console.log(`   - Catégories mises à jour: ${updated}`);
  console.log(`   - Catégories inchangées: ${skipped}`);
  console.log(`   - Relations parent-enfant corrigées: ${relationsFixed}`);

  await db.$disconnect();
}

importCategoriesWithHierarchy().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});































