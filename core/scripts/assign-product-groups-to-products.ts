// Script pour assigner les ProductGroup aux produits en fonction de leur productName
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignProductGroupsToProducts() {
  console.log('🚀 Assignation des ProductGroup aux produits...\n');

  // Compter les produits
  const totalProducts = await prisma.product.count();
  console.log(`📦 Total produits: ${totalProducts}`);

  // Compter les produits avec productGroupId
  const productsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });
  console.log(`📦 Produits avec ProductGroup: ${productsWithGroup}`);
  console.log(`📦 Produits sans ProductGroup: ${totalProducts - productsWithGroup}\n`);

  // Récupérer tous les ProductGroup indexés par productName (exact et insensible à la casse)
  console.log('📂 Chargement des ProductGroup...');
  const allProductGroups = await prisma.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });

  const productGroupMap = new Map<string, number>(); // Exact match
  const productGroupMapCaseInsensitive = new Map<string, { id: number; originalName: string }>(); // Case insensitive
  
  allProductGroups.forEach(group => {
    productGroupMap.set(group.productName, group.id);
    const lower = group.productName.toLowerCase().trim();
    if (!productGroupMapCaseInsensitive.has(lower)) {
      productGroupMapCaseInsensitive.set(lower, { id: group.id, originalName: group.productName });
    }
  });

  console.log(`✅ ${allProductGroups.length} ProductGroup chargés\n`);

  // Traiter les produits par batch
  const batchSize = 1000;
  let processed = 0;
  let assigned = 0;
  let notFound = 0;
  const notFoundNames = new Set<string>();

  console.log(`🔄 Traitement des produits par batch de ${batchSize}...\n`);

  let skip = 0;
  while (true) {
    const products = await prisma.product.findMany({
      where: {
        productGroupId: null, // Seulement ceux sans ProductGroup
        productName: {
          not: null,
        },
      },
      select: {
        id: true,
        productName: true,
      },
      take: batchSize,
      skip: skip,
    });

    if (products.length === 0) {
      break;
    }

    // Assigner les ProductGroup
    for (const product of products) {
      processed++;
      
      if (product.productName) {
        // Essayer d'abord correspondance exacte
        let groupId = productGroupMap.get(product.productName);
        
        // Si pas trouvé, essayer correspondance insensible à la casse
        if (!groupId) {
          const lower = product.productName.toLowerCase().trim();
          const caseInsensitiveMatch = productGroupMapCaseInsensitive.get(lower);
          if (caseInsensitiveMatch) {
            groupId = caseInsensitiveMatch.id;
          }
        }
        
        if (groupId) {
          await prisma.product.update({
            where: { id: product.id },
            data: { productGroupId: groupId },
          });
          assigned++;
        } else {
          notFound++;
          notFoundNames.add(product.productName);
        }
      }

      if (processed % 1000 === 0) {
        process.stdout.write(`\r   Traités: ${processed} | Assignés: ${assigned} | Non trouvés: ${notFound}`);
      }
    }

    skip += batchSize;
  }

  console.log('\n\n📊 Résultats:');
  console.log(`   ✅ Produits traités: ${processed}`);
  console.log(`   ✅ ProductGroup assignés: ${assigned}`);
  console.log(`   ❌ ProductGroup non trouvés: ${notFound} (${((notFound / processed) * 100).toFixed(2)}%)\n`);

  if (notFoundNames.size > 0) {
    console.log(`⚠️  Exemples de productName sans ProductGroup correspondant (premiers 20):`);
    Array.from(notFoundNames).slice(0, 20).forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    if (notFoundNames.size > 20) {
      console.log(`   ... et ${notFoundNames.size - 20} autres`);
    }
  }

  // Vérification finale
  const finalProductsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });

  console.log(`\n✅ Vérification finale:`);
  console.log(`   Produits avec ProductGroup: ${finalProductsWithGroup} / ${totalProducts} (${((finalProductsWithGroup / totalProducts) * 100).toFixed(2)}%)`);

  // Calculer combien de produits ont maintenant accès aux catégories
  const productsWithCategories = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
      productGroup: {
        categories: {
          some: {},
        },
      },
    },
  });

  console.log(`   Produits avec catégories (via ProductGroup): ${productsWithCategories} (${((productsWithCategories / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

assignProductGroupsToProducts().catch(console.error);

