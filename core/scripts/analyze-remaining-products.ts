// Script pour analyser les produits restants sans ProductGroup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRemainingProducts() {
  console.log('🔍 Analyse des produits restants sans ProductGroup...\n');

  const totalProducts = await prisma.product.count();
  const productsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });
  const productsWithoutGroup = totalProducts - productsWithGroup;

  console.log(`📊 Statistiques:`);
  console.log(`   Total produits: ${totalProducts}`);
  console.log(`   Avec ProductGroup: ${productsWithGroup} (${((productsWithGroup / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   Sans ProductGroup: ${productsWithoutGroup} (${((productsWithoutGroup / totalProducts) * 100).toFixed(2)}%)\n`);

  // Analyser les produits sans ProductGroup
  const productsWithoutGroupSample = await prisma.product.findMany({
    where: {
      productGroupId: null,
    },
    select: {
      productName: true,
    },
    take: 10000,
  });

  const withProductName = productsWithoutGroupSample.filter(p => p.productName !== null);
  const withoutProductName = productsWithoutGroupSample.filter(p => p.productName === null);

  console.log(`📋 Échantillon de ${productsWithoutGroupSample.length} produits sans ProductGroup:`);
  console.log(`   Avec productName: ${withProductName.length} (${((withProductName.length / productsWithoutGroupSample.length) * 100).toFixed(2)}%)`);
  console.log(`   Sans productName: ${withoutProductName.length} (${((withoutProductName.length / productsWithoutGroupSample.length) * 100).toFixed(2)}%)\n`);

  // Compter les productName uniques sans ProductGroup
  const uniqueProductNames = new Set<string>();
  withProductName.forEach(p => {
    if (p.productName) {
      uniqueProductNames.add(p.productName);
    }
  });

  console.log(`📦 ProductName uniques sans ProductGroup (échantillon): ${uniqueProductNames.size}\n`);

  // Vérifier combien de ces productName ont un ProductGroup dans la DB
  const allProductGroups = await prisma.productGroup.findMany({
    select: {
      productName: true,
    },
  });

  const productGroupNames = new Set<string>();
  allProductGroups.forEach(g => {
    productGroupNames.add(g.productName);
    productGroupNames.add(g.productName.toLowerCase().trim());
  });

  let foundInDB = 0;
  let notFoundInDB = 0;
  const notFoundNames: string[] = [];

  for (const productName of uniqueProductNames) {
    const exactMatch = productGroupNames.has(productName);
    const caseInsensitiveMatch = productGroupNames.has(productName.toLowerCase().trim());
    
    if (exactMatch || caseInsensitiveMatch) {
      foundInDB++;
    } else {
      notFoundInDB++;
      notFoundNames.push(productName);
    }
  }

  console.log(`🔍 Correspondances:`);
  console.log(`   ProductName trouvés dans ProductGroup (mais non assignés): ${foundInDB}`);
  console.log(`   ProductName non trouvés dans ProductGroup: ${notFoundInDB}\n`);

  if (notFoundNames.length > 0) {
    console.log(`📋 Exemples de productName sans ProductGroup (premiers 30):`);
    notFoundNames.slice(0, 30).forEach((name, index) => {
      console.log(`   ${String(index + 1).padStart(2)}. ${name}`);
    });
    if (notFoundNames.length > 30) {
      console.log(`   ... et ${notFoundNames.length - 30} autres`);
    }
  }

  // Statistiques sur les produits avec catégories
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

  console.log(`\n✅ Produits avec catégories InterCars: ${productsWithCategories} / ${totalProducts} (${((productsWithCategories / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
}

analyzeRemainingProducts().catch(console.error);

























