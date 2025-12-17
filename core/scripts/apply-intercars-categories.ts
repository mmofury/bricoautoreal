// Script pour appliquer les catégories InterCars à tous les produits
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyInterCarsCategories() {
  console.log('🚀 Application des catégories InterCars à tous les produits...\n');

  // Récupérer toutes les correspondances InterCarsCategory groupées par productName
  console.log('📦 Chargement des correspondances InterCarsCategory...');
  const interCarsCategories = await prisma.interCarsCategory.findMany({
    orderBy: {
      productName: 'asc',
    },
  });

  console.log(`   ✅ ${interCarsCategories.length} correspondances chargées\n`);

  // Grouper par productName
  const categoriesByProductName = new Map<string, number[]>();

  for (const cat of interCarsCategories) {
    if (!cat.productName) continue;
    
    if (!categoriesByProductName.has(cat.productName)) {
      categoriesByProductName.set(cat.productName, []);
    }
    
    categoriesByProductName.get(cat.productName)!.push(cat.id);
  }

  console.log(`📊 ${categoriesByProductName.size} productName uniques avec catégories InterCars\n`);

  // Statistiques
  let totalRelationsCreated = 0;
  let totalProductsProcessed = 0;
  let processed = 0;
  const batchSize = 100; // Traiter par batch de 100 productName

  const productNames = Array.from(categoriesByProductName.keys());
  const totalProductNames = productNames.length;

  console.log('🔄 Création des relations ProductInterCarsCategory...\n');

  // Traiter par batch
  for (let i = 0; i < productNames.length; i += batchSize) {
    const batch = productNames.slice(i, i + batchSize);
    
    for (const productName of batch) {
      processed++;
      const categoryIds = categoriesByProductName.get(productName) || [];

      // Trouver tous les produits avec ce productName
      const products = await prisma.product.findMany({
        where: {
          productName: productName,
        },
        select: {
          id: true,
        },
      });

      if (products.length === 0) {
        continue;
      }

      totalProductsProcessed += products.length;

      // Créer les relations pour chaque produit
      const relationsToCreate = [];
      for (const product of products) {
        for (const categoryId of categoryIds) {
          relationsToCreate.push({
            productId: product.id,
            interCarsCategoryId: categoryId,
          });
        }
      }

      // Insérer les relations par batch
      if (relationsToCreate.length > 0) {
        try {
          await prisma.productInterCarsCategory.createMany({
            data: relationsToCreate,
            skipDuplicates: true, // Ignorer les doublons
          });
          totalRelationsCreated += relationsToCreate.length;
        } catch (error: any) {
          // Si erreur de batch, insérer une par une
          for (const relation of relationsToCreate) {
            try {
              await prisma.productInterCarsCategory.create({
                data: relation,
              });
              totalRelationsCreated++;
            } catch (e: any) {
              // Ignorer les doublons
              if (e.code !== 'P2002') {
                console.error(`   ⚠️  Erreur: ${e.message}`);
              }
            }
          }
        }
      }

      // Afficher la progression
      if (processed % 100 === 0 || products.length > 1000) {
        console.log(`[${processed}/${totalProductNames}] ${productName}: ${products.length} produits, ${categoryIds.length} catégorie(s) → ${relationsToCreate.length} relations`);
      }
    }

    // Afficher le progrès global
    if ((i + batchSize) % 500 === 0 || i + batchSize >= productNames.length) {
      console.log(`\n📊 Progression: ${processed}/${totalProductNames} productName traités`);
      console.log(`   Produits traités: ${totalProductsProcessed.toLocaleString()}`);
      console.log(`   Relations créées: ${totalRelationsCreated.toLocaleString()}\n`);
    }
  }

  // Vérification finale
  const finalRelations = await prisma.productInterCarsCategory.count();
  const productsWithCategories = await prisma.product.count({
    where: {
      interCarsCategories: {
        some: {},
      },
    },
  });
  const totalProducts = await prisma.product.count();

  console.log('\n📊 Résultats finaux:');
  console.log(`   ProductName traités: ${processed}`);
  console.log(`   Produits traités: ${totalProductsProcessed.toLocaleString()}`);
  console.log(`   Relations créées: ${totalRelationsCreated.toLocaleString()}`);
  console.log(`   Total relations dans la DB: ${finalRelations.toLocaleString()}`);
  console.log(`   Produits avec catégories InterCars: ${productsWithCategories.toLocaleString()} / ${totalProducts.toLocaleString()} (${((productsWithCategories / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

applyInterCarsCategories().catch(console.error);

























