// Script pour afficher des exemples de produits sans ProductGroup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showUnassignedProducts() {
  console.log('🔍 Produits sans ProductGroup...\n');

  // Récupérer des exemples de produits sans ProductGroup
  const unassignedProducts = await prisma.product.findMany({
    where: {
      productGroupId: null,
      productName: {
        not: null,
      },
    },
    select: {
      id: true,
      articleNo: true,
      productName: true,
      csvId: true,
    },
    take: 5,
  });

  console.log(`📦 Exemples de produits sans ProductGroup (5 premiers):\n`);

  unassignedProducts.forEach((product, index) => {
    console.log(`${index + 1}. Article: ${product.articleNo}`);
    console.log(`   ProductName: "${product.productName}"`);
    console.log(`   CSV ID: ${product.csvId || 'N/A'}`);
    console.log(`   ID: ${product.id}`);
    console.log('');
  });

  // Vérifier si ces productName existent dans ProductGroup
  console.log('🔍 Vérification dans ProductGroup:\n');
  
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

  for (const product of unassignedProducts) {
    if (product.productName) {
      const exactMatch = productGroupNames.has(product.productName);
      const caseInsensitiveMatch = productGroupNames.has(product.productName.toLowerCase().trim());
      
      console.log(`ProductName: "${product.productName}"`);
      console.log(`   Correspondance exacte: ${exactMatch ? '✅' : '❌'}`);
      console.log(`   Correspondance insensible à la casse: ${caseInsensitiveMatch ? '✅' : '❌'}`);
      
      if (!exactMatch && !caseInsensitiveMatch) {
        // Chercher des similitudes
        const normalized = product.productName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let foundSimilar = false;
        for (const groupName of productGroupNames) {
          const normalizedGroup = groupName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normalized === normalizedGroup) {
            console.log(`   ⚠️  Similaire trouvé: "${groupName}"`);
            foundSimilar = true;
            break;
          }
        }
        if (!foundSimilar) {
          console.log(`   ❌ Aucun ProductGroup correspondant trouvé`);
        }
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
}

showUnassignedProducts().catch(console.error);

























