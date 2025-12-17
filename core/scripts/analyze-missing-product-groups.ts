// Script pour analyser pourquoi certains productName ne trouvent pas de ProductGroup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMissingProductGroups() {
  console.log('🔍 Analyse des productName non trouvés...\n');

  // Récupérer tous les ProductGroup
  const allProductGroups = await prisma.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });

  const productGroupMap = new Map<string, number>();
  const productGroupNames = new Set<string>();
  
  allProductGroups.forEach(group => {
    productGroupMap.set(group.productName, group.id);
    productGroupNames.add(group.productName);
  });

  console.log(`📦 ProductGroup dans la DB: ${allProductGroups.length}\n`);

  // Récupérer les produits sans ProductGroup qui ont un productName
  const productsWithoutGroup = await prisma.product.findMany({
    where: {
      productGroupId: null,
      productName: {
        not: null,
      },
    },
    select: {
      id: true,
      productName: true,
    },
    take: 10000, // Limiter pour l'analyse
  });

  console.log(`📦 Produits sans ProductGroup (échantillon de ${productsWithoutGroup.length}):\n`);

  const notFound = new Map<string, number>(); // productName -> count
  const foundButNotAssigned: string[] = [];

  for (const product of productsWithoutGroup) {
    if (product.productName) {
      if (!productGroupNames.has(product.productName)) {
        const count = notFound.get(product.productName) || 0;
        notFound.set(product.productName, count + 1);
      } else {
        // Trouvé mais pas assigné - peut-être un problème de casse ou d'espaces
        foundButNotAssigned.push(product.productName);
      }
    }
  }

  console.log(`❌ ProductName non trouvés: ${notFound.size}`);
  console.log(`✅ ProductName trouvés mais non assignés: ${foundButNotAssigned.length}\n`);

  // Afficher les productName non trouvés les plus fréquents
  if (notFound.size > 0) {
    console.log('📋 Top 30 productName non trouvés (par fréquence):');
    const sorted = Array.from(notFound.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    sorted.forEach(([name, count], index) => {
      console.log(`   ${String(index + 1).padStart(2)}. "${name}" (${count} produits)`);
    });
    console.log('');
  }

  // Vérifier les différences de casse/espaces
  console.log('🔍 Vérification des différences de casse/espaces...\n');
  
  const caseInsensitiveMap = new Map<string, string>(); // lowercase -> original
  productGroupNames.forEach(name => {
    const lower = name.toLowerCase().trim();
    if (!caseInsensitiveMap.has(lower)) {
      caseInsensitiveMap.set(lower, name);
    }
  });

  let caseInsensitiveMatches = 0;
  const caseInsensitiveNotFound: string[] = [];

  for (const product of productsWithoutGroup.slice(0, 1000)) {
    if (product.productName) {
      const lower = product.productName.toLowerCase().trim();
      if (caseInsensitiveMap.has(lower)) {
        caseInsensitiveMatches++;
      } else {
        caseInsensitiveNotFound.push(product.productName);
      }
    }
  }

  console.log(`   Correspondances avec casse insensible: ${caseInsensitiveMatches} / 1000`);
  console.log(`   Toujours non trouvés: ${caseInsensitiveNotFound.length}\n`);

  if (caseInsensitiveNotFound.length > 0 && caseInsensitiveNotFound.length <= 20) {
    console.log('📋 ProductName toujours non trouvés (même avec casse insensible):');
    caseInsensitiveNotFound.forEach((name, index) => {
      console.log(`   ${index + 1}. "${name}"`);
    });
  }

  // Vérifier les productName uniques dans les produits
  const uniqueProductNames = new Set<string>();
  const sampleProducts = await prisma.product.findMany({
    where: {
      productName: {
        not: null,
      },
    },
    select: {
      productName: true,
    },
    take: 50000,
  });

  sampleProducts.forEach(p => {
    if (p.productName) {
      uniqueProductNames.add(p.productName);
    }
  });

  console.log(`\n📊 Statistiques:`);
  console.log(`   ProductName uniques dans les produits (échantillon 50k): ${uniqueProductNames.size}`);
  console.log(`   ProductGroup dans la DB: ${allProductGroups.length}`);
  console.log(`   Différence: ${uniqueProductNames.size - allProductGroups.length}\n`);

  // Vérifier combien de productName des produits existent dans ProductGroup
  let matches = 0;
  for (const productName of uniqueProductNames) {
    if (productGroupNames.has(productName)) {
      matches++;
    }
  }

  console.log(`   Correspondances exactes: ${matches} / ${uniqueProductNames.size} (${((matches / uniqueProductNames.size) * 100).toFixed(2)}%)`);
  console.log(`   Non trouvés: ${uniqueProductNames.size - matches} (${(((uniqueProductNames.size - matches) / uniqueProductNames.size) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
}

analyzeMissingProductGroups().catch(console.error);

























