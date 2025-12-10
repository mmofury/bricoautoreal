// Script pour créer l'arborescence complète dans la DB à partir de db-product-groups-arborescences.json
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface Match {
  productGroupId: number;
  productName: string;
  matchType: 'tecdoc-id' | 'name-similarity';
  categoryId: number;
  categoryName: string;
  categoryPath: string[];
  arborescence: string;
  similarity?: number;
}

interface ArborescenceResults {
  metadata: {
    generatedAt: string;
    totalProductGroups: number;
    exactMatches: number;
    similarityMatches: number;
    unmatched: number;
  };
  results: {
    [arboName: string]: {
      matches: Match[];
      unmatched: Array<{ productGroupId: number; productName: string }>;
    };
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

async function buildArborescenceFromMatches() {
  console.log('🚀 Construction de l\'arborescence complète dans la DB...\n');

  // Charger le fichier de matches
  const matchesFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('db-product-groups-arborescences-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (matchesFiles.length === 0) {
    console.error('❌ Aucun fichier db-product-groups-arborescences-*.json trouvé!');
    return;
  }

  const latestFile = matchesFiles[0];
  console.log(`📂 Chargement: ${latestFile}`);
  const data: ArborescenceResults = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), latestFile), 'utf-8')
  );

  // Pour chaque arborescence, construire la hiérarchie complète
  for (const [arboName, result] of Object.entries(data.results)) {
    console.log(`\n📊 Traitement de ${arboName}...`);
    console.log(`   ${result.matches.length} matches à traiter`);

    // Map pour stocker les catégories créées (par categoryId et chemin)
    const createdCategories = new Map<string, number>(); // key: `${categoryId}-${path.join('/')}` -> dbId
    const categoryIdToDbId = new Map<number, number>(); // tecdocCategoryId -> dbId

    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let relationsCreated = 0;
    let relationsSkipped = 0;

    // Trier les matches par profondeur (créer d'abord les parents)
    const sortedMatches = result.matches.sort((a, b) => {
      return a.categoryPath.length - b.categoryPath.length;
    });

    // Traiter chaque match pour créer l'arborescence complète
    for (const match of sortedMatches) {
      const { categoryPath, categoryId, categoryName } = match;

      // Créer toutes les catégories du chemin (du niveau 1 au niveau N)
      let parentDbId: number | null = null;

      for (let i = 0; i < categoryPath.length; i++) {
        const currentCategoryName = categoryPath[i];
        const currentLevel = i + 1;
        const currentPath = categoryPath.slice(0, i + 1);
        const pathKey = currentPath.join('/');

        // Déterminer le tecdocCategoryId pour ce niveau
        // Si c'est le dernier niveau, utiliser le categoryId du match
        // Sinon, on n'a pas d'ID TecDoc pour les niveaux intermédiaires
        const isLastLevel = i === categoryPath.length - 1;
        const tecdocCategoryId = isLastLevel ? categoryId : null;

        // Clé unique pour cette catégorie
        const categoryKey = tecdocCategoryId 
          ? `${tecdocCategoryId}-${pathKey}`
          : `no-id-${pathKey}`;

        // Vérifier si la catégorie existe déjà
        let categoryDbId = createdCategories.get(categoryKey);

        if (!categoryDbId) {
          // Chercher si une catégorie avec ce tecdocCategoryId existe déjà
          if (tecdocCategoryId) {
            const existing = await prisma.tecdocCategory.findUnique({
              where: { tecdocCategoryId },
            });
            if (existing) {
              categoryDbId = existing.id;
              createdCategories.set(categoryKey, categoryDbId);
              categoryIdToDbId.set(tecdocCategoryId, categoryDbId);
              
              // Mettre à jour le parent si nécessaire
              if (parentDbId && existing.parentId !== parentDbId) {
                await prisma.tecdocCategory.update({
                  where: { id: categoryDbId },
                  data: { parentId: parentDbId },
                });
                categoriesUpdated++;
              }
              
              parentDbId = categoryDbId;
              continue; // Catégorie déjà créée, passer au suivant
            }
          }

          // Créer la catégorie
          const slug = slugify(currentCategoryName);
          const displayId = tecdocCategoryId ? String(tecdocCategoryId) : `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const categoryUrl = `/categorie/${slug}-${displayId}`;

          // Vérifier si le slug existe déjà
          let finalSlug = slug;
          let slugCounter = 1;
          while (await prisma.tecdocCategory.findUnique({ where: { slug: finalSlug } })) {
            finalSlug = `${slug}-${slugCounter}`;
            slugCounter++;
          }

          const category = await prisma.tecdocCategory.upsert({
            where: tecdocCategoryId 
              ? { tecdocCategoryId }
              : { slug: finalSlug },
            update: {
              name: currentCategoryName,
              level: currentLevel,
              parentId: parentDbId,
              // Ne pas écraser le tecdocCategoryId s'il existe déjà
              ...(tecdocCategoryId && { tecdocCategoryId }),
            },
            create: {
              name: currentCategoryName,
              slug: finalSlug,
              displayId,
              tecdocCategoryId,
              level: currentLevel,
              parentId: parentDbId,
              url: categoryUrl,
            },
          });

          categoryDbId = category.id;
          createdCategories.set(categoryKey, categoryDbId);
          if (tecdocCategoryId) {
            categoryIdToDbId.set(tecdocCategoryId, categoryDbId);
          }

          categoriesCreated++;
        } else {
          // Mettre à jour le parent si nécessaire
          if (parentDbId && categoryDbId) {
            await prisma.tecdocCategory.update({
              where: { id: categoryDbId },
              data: { parentId: parentDbId },
            });
            categoriesUpdated++;
          }
        }

        parentDbId = categoryDbId;
      }

      // Créer la relation ProductGroupCategory pour le dernier niveau
      if (parentDbId) {
        try {
          await prisma.productGroupCategory.upsert({
            where: {
              productGroupId_tecdocCategoryId: {
                productGroupId: match.productGroupId,
                tecdocCategoryId: parentDbId,
              },
            },
            update: {},
            create: {
              productGroupId: match.productGroupId,
              tecdocCategoryId: parentDbId,
            },
          });
          relationsCreated++;
        } catch (error) {
          relationsSkipped++;
        }
      }
    }

    console.log(`   ✅ Catégories créées: ${categoriesCreated}`);
    console.log(`   🔄 Catégories mises à jour: ${categoriesUpdated}`);
    console.log(`   🔗 Relations créées: ${relationsCreated}`);
    console.log(`   ⏭️  Relations ignorées: ${relationsSkipped}`);
  }

  // Statistiques finales
  const totalCategories = await prisma.tecdocCategory.count();
  const totalRelations = await prisma.productGroupCategory.count();

  console.log('\n📊 Statistiques finales:');
  console.log(`   📁 Total catégories dans la DB: ${totalCategories}`);
  console.log(`   🔗 Total relations ProductGroupCategory: ${totalRelations}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

buildArborescenceFromMatches().catch(console.error);

