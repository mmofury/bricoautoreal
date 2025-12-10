import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryNode {
  name: string;
  categoryId: number | null;
  level: number;
  children: CategoryNode[];
  productId?: number;
}

function parseArborescence(arbo: any, level: number = 1): CategoryNode[] {
  const result: CategoryNode[] = [];
  
  for (const [key, value] of Object.entries(arbo)) {
    const node = value as any;
    const categoryNode: CategoryNode = {
      name: key,
      categoryId: node.categoryId || null,
      level: node.level || level,
      children: node.children ? parseArborescence(node.children, level + 1) : [],
      productId: node.productId,
    };
    result.push(categoryNode);
  }
  
  return result;
}

async function importFullHierarchy() {
  console.log('🌳 Import de la hiérarchie complète des catégories...\n');

  // Lire product-groups.json
  const fs = await import('fs');
  const path = await import('path');
  const productGroupsPath = path.join(process.cwd(), 'product-groups.json');
  const productGroupsContent = fs.readFileSync(productGroupsPath, 'utf-8');
  const productGroupsData: Array<{
    productName: string;
    slug: string;
    tecdocProductId: number;
    categories: Array<{
      path: string[];
      categoryId: number;
      level: number;
    }>;
  }> = JSON.parse(productGroupsContent);

  // Lire aussi les fichiers tecdoc-results pour avoir l'arborescence complète
  const tecdocResultsPath = path.join(process.cwd(), 'tecdoc-results');
  const tecdocFiles = fs.readdirSync(tecdocResultsPath).filter(f => f.endsWith('.json'));

  console.log(`📂 ${tecdocFiles.length} fichiers TecDoc à analyser\n`);

  // Map pour stocker toutes les catégories (par chemin complet)
  const allCategories = new Map<string, {
    name: string;
    slug: string;
    categoryId: number | null;
    level: number;
    path: string[];
    parentPath?: string[];
  }>();

  // Parcourir tous les fichiers TecDoc pour extraire l'arborescence complète
  for (const file of tecdocFiles) {
    const filePath = path.join(tecdocResultsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.arborescence) continue;

    // Fonction récursive pour extraire tous les nœuds
    function extractNodes(arbo: any, currentPath: string[] = [], currentLevel: number = 1) {
      for (const [key, value] of Object.entries(arbo)) {
        const node = value as any;
        const nodePath = [...currentPath, key];
        const nodeSlug = slugify(key);
        const pathKey = nodePath.join('|');

        // Créer la catégorie (même si categoryId est null)
        if (!allCategories.has(pathKey)) {
          allCategories.set(pathKey, {
            name: key,
            slug: nodeSlug,
            categoryId: node.categoryId || null,
            level: node.level || currentLevel,
            path: nodePath,
            parentPath: currentPath.length > 0 ? currentPath : undefined,
          });
        }

        // Continuer récursivement
        if (node.children && Object.keys(node.children).length > 0) {
          extractNodes(node.children, nodePath, currentLevel + 1);
        }
      }
    }

    extractNodes(data.arborescence);
  }

  console.log(`📦 ${allCategories.size} catégories uniques trouvées (avec intermédiaires)\n`);

  // Créer un Map pour stocker les IDs de catégories créées (par pathKey)
  const createdCategoryIds = new Map<string, number>();

  // Trier les catégories par niveau et profondeur du chemin
  const sortedCategories = Array.from(allCategories.entries()).sort((a, b) => {
    // D'abord par niveau
    if (a[1].level !== b[1].level) return a[1].level - b[1].level;
    // Puis par longueur du chemin (parents avant enfants)
    return a[1].path.length - b[1].path.length;
  });

  console.log('📂 Création des catégories avec hiérarchie complète...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [pathKey, catData] of sortedCategories) {
    const displayId = catData.categoryId 
      ? String(catData.categoryId) 
      : `parent-${catData.slug}-${catData.level}`;
    const categoryUrl = `/categorie/${catData.slug}-${displayId}`;

    // Trouver le parent
    let parentId: number | null = null;
    if (catData.parentPath && catData.parentPath.length > 0) {
      const parentPathKey = catData.parentPath.join('|');
      parentId = createdCategoryIds.get(parentPathKey) || null;
    }

    // Vérifier si la catégorie existe déjà
    let existingCategory;
    if (catData.categoryId) {
      existingCategory = await db.tecDocCategory.findFirst({
        where: {
          tecdocCategoryId: catData.categoryId,
        },
      });
    } else {
      // Pour les catégories sans categoryId, chercher par slug et niveau
      existingCategory = await db.tecDocCategory.findFirst({
        where: {
          slug: catData.slug,
          level: catData.level,
        },
      });
    }

    if (existingCategory) {
      // Mettre à jour avec le parent si nécessaire
      if (existingCategory.parentId !== parentId || existingCategory.level !== catData.level) {
        await db.tecDocCategory.update({
          where: { id: existingCategory.id },
          data: {
            parentId,
            level: catData.level,
          },
        });
        updated++;
      } else {
        skipped++;
      }
      createdCategoryIds.set(pathKey, existingCategory.id);
    } else {
      // Créer la nouvelle catégorie
      try {
        const newCategory = await db.tecDocCategory.create({
          data: {
            name: catData.name,
            slug: catData.slug,
            displayId,
            tecdocCategoryId: catData.categoryId,
            level: catData.level,
            parentId,
            url: categoryUrl,
          },
        });
        createdCategoryIds.set(pathKey, newCategory.id);
        created++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Doublon, chercher à nouveau
          const found = await db.tecDocCategory.findFirst({
            where: {
              OR: [
                { slug: catData.slug },
                { displayId },
              ],
            },
          });
          if (found) {
            createdCategoryIds.set(pathKey, found.id);
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
          console.error(`❌ Erreur avec catégorie ${catData.name}:`, error.message);
        }
      }
    }
  }

  console.log(`\n✅ Import terminé !`);
  console.log(`   - Catégories créées: ${created}`);
  console.log(`   - Catégories mises à jour: ${updated}`);
  console.log(`   - Catégories inchangées: ${skipped}`);
  console.log(`   - Total catégories: ${createdCategoryIds.size}`);

  await db.$disconnect();
}

importFullHierarchy().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























