// Script pour lier les produits à l'arborescence TecDocCategory via InterCarsCategory
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkProductsToArborescence() {
  console.log('🔗 Liaison des produits à l\'arborescence TecDocCategory...\n');

  // 1. Vérifier l'état actuel
  const totalProducts = await prisma.product.count();
  const productsWithInterCars = await prisma.product.count({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
  });
  const totalInterCarsCategories = await prisma.interCarsCategory.count();
  const totalTecDocCategories = await prisma.tecDocCategory.count();

  console.log('📊 État actuel:');
  console.log(`   Produits avec catégories InterCars: ${productsWithInterCars.toLocaleString()}`);
  console.log(`   Catégories InterCars: ${totalInterCarsCategories}`);
  console.log(`   Catégories TecDocCategory: ${totalTecDocCategories}\n`);

  // 2. Récupérer toutes les correspondances InterCarsCategory avec leurs genericArticleId
  console.log('📦 Chargement des correspondances InterCarsCategory...');
  const interCarsCategories = await prisma.interCarsCategory.findMany({
    select: {
      id: true,
      genericArticleId: true,
      productName: true,
    },
  });

  console.log(`   ✅ ${interCarsCategories.length} correspondances chargées\n`);

  // 3. Pour chaque genericArticleId, trouver la catégorie TecDocCategory correspondante
  console.log('🔍 Recherche des correspondances genericArticleId → TecDocCategory...\n');
  
  let matched = 0;
  let notMatched = 0;
  const matchedMap = new Map<string, number>(); // genericArticleId -> tecDocCategoryId
  const notMatchedSet = new Set<string>();

  for (const interCarsCat of interCarsCategories) {
    // Chercher la catégorie TecDocCategory avec ce displayId
    const tecDocCategory = await prisma.tecDocCategory.findUnique({
      where: {
        displayId: interCarsCat.genericArticleId,
      },
    });

    if (tecDocCategory) {
      matchedMap.set(interCarsCat.genericArticleId, tecDocCategory.id);
      matched++;
    } else {
      notMatchedSet.add(interCarsCat.genericArticleId);
      notMatched++;
    }
  }

  console.log(`   ✅ ${matched} genericArticleId trouvés dans TecDocCategory`);
  console.log(`   ❌ ${notMatched} genericArticleId non trouvés\n`);

  if (notMatched > 0) {
    console.log('📋 Exemples de genericArticleId non trouvés (10 premiers):');
    const examples = Array.from(notMatchedSet).slice(0, 10);
    for (const example of examples) {
      console.log(`   - ${example}`);
    }
    console.log('');
  }

  // 4. Créer les relations Product → TecDocCategory
  console.log('🔗 Création des relations Product → TecDocCategory...\n');

  // Récupérer toutes les relations ProductInterCarsCategory
  const productInterCarsRelations = await prisma.productInterCarsCategory.findMany({
    include: {
      interCarsCategory: {
        select: {
          genericArticleId: true,
        },
      },
    },
  });

  console.log(`   📦 ${productInterCarsRelations.length} relations ProductInterCarsCategory à traiter\n`);

  let relationsCreated = 0;
  let relationsSkipped = 0;
  const batchSize = 1000;

  // Grouper par productId pour éviter les doublons
  const productCategoryMap = new Map<number, Set<number>>(); // productId -> Set<tecDocCategoryId>

  for (const relation of productInterCarsRelations) {
    const genericArticleId = relation.interCarsCategory.genericArticleId;
    const tecDocCategoryId = matchedMap.get(genericArticleId);

    if (tecDocCategoryId) {
      if (!productCategoryMap.has(relation.productId)) {
        productCategoryMap.set(relation.productId, new Set());
      }
      productCategoryMap.get(relation.productId)!.add(tecDocCategoryId);
    }
  }

  console.log(`   📊 ${productCategoryMap.size} produits uniques avec catégories TecDocCategory\n`);

  // Créer les relations par batch
  const products = Array.from(productCategoryMap.entries());
  let processed = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const relationsToCreate = [];

    for (const [productId, categoryIds] of batch) {
      for (const categoryId of categoryIds) {
        relationsToCreate.push({
          productId,
          tecDocCategoryId: categoryId,
        });
      }
    }

    if (relationsToCreate.length > 0) {
      try {
        await prisma.productTecDocCategory.createMany({
          data: relationsToCreate,
          skipDuplicates: true,
        });
        relationsCreated += relationsToCreate.length;
      } catch (error: any) {
        // Si erreur, créer une par une
        for (const relation of relationsToCreate) {
          try {
            await prisma.productTecDocCategory.create({
              data: relation,
            });
            relationsCreated++;
          } catch (e: any) {
            if (e.code !== 'P2002') {
              console.error(`   ⚠️  Erreur: ${e.message}`);
            }
            relationsSkipped++;
          }
        }
      }
    }

    processed += batch.length;
    if (processed % 10000 === 0 || processed === products.length) {
      console.log(`   Progression: ${processed}/${products.length} produits traités, ${relationsCreated.toLocaleString()} relations créées`);
    }
  }

  // Vérification finale
  const finalRelations = await prisma.productTecDocCategory.count();
  const productsWithTecDocCategories = await prisma.product.count({
    where: {
      tecDocCategories: {
        some: {},
      },
    },
  });

  console.log('\n📊 Résultats finaux:');
  console.log(`   Relations Product → TecDocCategory créées: ${relationsCreated.toLocaleString()}`);
  console.log(`   Total relations dans la DB: ${finalRelations.toLocaleString()}`);
  console.log(`   Produits avec catégories TecDocCategory: ${productsWithTecDocCategories.toLocaleString()} / ${totalProducts.toLocaleString()} (${((productsWithTecDocCategories / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

linkProductsToArborescence().catch(console.error);
























