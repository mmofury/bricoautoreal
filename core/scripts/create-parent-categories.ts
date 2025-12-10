import { db } from '../lib/db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createParentCategories() {
  console.log('🌳 Création des catégories parentes...\n');

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

  // Collecter tous les chemins uniques et créer les catégories parentes
  const parentCategories = new Map<string, { slug: string; level: number; parentSlug?: string }>();

  for (const group of productGroupsData) {
    for (const cat of group.categories) {
      if (!cat.categoryId || cat.categoryId === 0) continue;
      
      // Pour chaque élément du chemin (sauf le dernier qui a déjà un categoryId)
      for (let i = 0; i < cat.path.length - 1; i++) {
        const parentSlug = slugify(cat.path[i]);
        const level = i + 1;
        const key = `${parentSlug}-${level}`;
        
        if (!parentCategories.has(key)) {
          parentCategories.set(key, {
            slug: parentSlug,
            level,
            parentSlug: i > 0 ? slugify(cat.path[i - 1]) : undefined,
          });
        }
      }
    }
  }

  console.log(`📦 ${parentCategories.size} catégories parentes à créer\n`);

  // Récupérer toutes les catégories existantes
  const existingCategories = await db.tecDocCategory.findMany({
    select: {
      id: true,
      slug: true,
      level: true,
    },
  });

  const existingSlugs = new Set(existingCategories.map(c => c.slug));
  const slugToId = new Map(existingCategories.map(c => [c.slug, c.id]));

  let created = 0;
  let updated = 0;

  // Trier par niveau pour créer d'abord les parents
  const sortedParents = Array.from(parentCategories.values()).sort((a, b) => a.level - b.level);

  for (const parent of sortedParents) {
    // Vérifier si la catégorie existe déjà
    if (existingSlugs.has(parent.slug)) {
      // Mettre à jour le niveau si nécessaire
      const existing = existingCategories.find(c => c.slug === parent.slug);
      if (existing && existing.level !== parent.level) {
        // Trouver le parent
        let parentId: number | null = null;
        if (parent.parentSlug) {
          const parentCategory = existingCategories.find(c => c.slug === parent.parentSlug);
          if (parentCategory) {
            parentId = parentCategory.id;
          }
        }

        await db.tecDocCategory.update({
          where: { id: existing.id },
          data: {
            level: parent.level,
            parentId,
          },
        });
        updated++;
      }
      continue;
    }

    // Créer la nouvelle catégorie parente
    try {
      // Trouver le parent
      let parentId: number | null = null;
      if (parent.parentSlug) {
        const parentCategory = existingCategories.find(c => c.slug === parent.parentSlug);
        if (parentCategory) {
          parentId = parentCategory.id;
        }
      }

      // Générer un displayId unique (négatif pour les catégories virtuelles)
      const displayId = `parent-${parent.slug}-${parent.level}`;
      const url = `/categorie/${parent.slug}-${displayId}`;

      const newCategory = await db.tecDocCategory.create({
        data: {
          name: parent.slug,
          slug: parent.slug,
          displayId,
          tecdocCategoryId: null, // Pas d'ID TecDoc pour les parents virtuels
          level: parent.level,
          parentId,
          url,
        },
      });

      // Ajouter à la liste des existantes
      existingCategories.push({
        id: newCategory.id,
        slug: newCategory.slug,
        level: newCategory.level,
      });
      existingSlugs.add(newCategory.slug);
      slugToId.set(newCategory.slug, newCategory.id);
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Doublon, skip
        continue;
      }
      console.error(`❌ Erreur avec catégorie parente ${parent.slug}:`, error.message);
    }
  }

  console.log(`\n✅ Création terminée !`);
  console.log(`   - Catégories parentes créées: ${created}`);
  console.log(`   - Catégories mises à jour: ${updated}`);

  await db.$disconnect();
}

createParentCategories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























