// Script pour créer les ProductGroup manquants pour les productName qui n'existent pas
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createMissingProductGroups() {
  console.log('🚀 Création des ProductGroup manquants...\n');

  // Récupérer tous les ProductGroup existants
  const existingGroups = await prisma.productGroup.findMany({
    select: {
      productName: true,
    },
  });

  const existingNames = new Set<string>();
  existingGroups.forEach(group => {
    existingNames.add(group.productName);
    existingNames.add(group.productName.toLowerCase().trim());
  });

  console.log(`📦 ProductGroup existants: ${existingGroups.length}\n`);

  // Récupérer les productName uniques des produits qui n'ont pas de ProductGroup
  console.log('📂 Récupération des productName uniques sans ProductGroup...');
  
  const productsWithoutGroup = await prisma.product.findMany({
    where: {
      productGroupId: null,
      productName: {
        not: null,
      },
    },
    select: {
      productName: true,
    },
    distinct: ['productName'],
  });

  console.log(`📦 ProductName uniques sans ProductGroup: ${productsWithoutGroup.length}\n`);

  // Filtrer ceux qui n'existent pas déjà (même avec casse insensible)
  const toCreate: string[] = [];
  
  for (const product of productsWithoutGroup) {
    if (product.productName) {
      const exactMatch = existingNames.has(product.productName);
      const caseInsensitiveMatch = existingNames.has(product.productName.toLowerCase().trim());
      
      if (!exactMatch && !caseInsensitiveMatch) {
        toCreate.push(product.productName);
      }
    }
  }

  console.log(`📦 ProductGroup à créer: ${toCreate.length}\n`);

  if (toCreate.length === 0) {
    console.log('✅ Tous les ProductGroup existent déjà !\n');
    await prisma.$disconnect();
    return;
  }

  // Créer les ProductGroup manquants
  console.log('🔄 Création des ProductGroup...\n');
  
  let created = 0;
  const batchSize = 100;

  for (let i = 0; i < toCreate.length; i += batchSize) {
    const batch = toCreate.slice(i, i + batchSize);
    
    for (const productName of batch) {
      try {
        const slug = slugify(productName);
        const displayId = `PG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await prisma.productGroup.create({
          data: {
            productName: productName,
            slug: slug,
            displayId: displayId,
            url: `/produit/${slug}-${displayId}`,
          },
        });
        
        created++;
        
        if (created % 50 === 0) {
          process.stdout.write(`\r   Créés: ${created} / ${toCreate.length}`);
        }
      } catch (error: any) {
        // Ignorer les erreurs de contrainte unique (slug ou productName)
        if (error.code !== 'P2002') {
          console.error(`\n❌ Erreur pour "${productName}":`, error.message);
        }
      }
    }
  }

  console.log(`\n\n✅ ${created} ProductGroup créés\n`);

  // Maintenant, réassigner les ProductGroup aux produits
  console.log('🔄 Réassignation des ProductGroup aux produits...\n');
  
  const allProductGroups = await prisma.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });

  const productGroupMap = new Map<string, number>();
  const productGroupMapCaseInsensitive = new Map<string, { id: number; originalName: string }>();
  
  allProductGroups.forEach(group => {
    productGroupMap.set(group.productName, group.id);
    const lower = group.productName.toLowerCase().trim();
    if (!productGroupMapCaseInsensitive.has(lower)) {
      productGroupMapCaseInsensitive.set(lower, { id: group.id, originalName: group.productName });
    }
  });

  let assigned = 0;
  let processed = 0;
  let skip = 0;

  while (true) {
    const products = await prisma.product.findMany({
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
      take: 1000,
      skip: skip,
    });

    if (products.length === 0) {
      break;
    }

    for (const product of products) {
      processed++;
      
      if (product.productName) {
        let groupId = productGroupMap.get(product.productName);
        
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
        }
      }

      if (processed % 1000 === 0) {
        process.stdout.write(`\r   Traités: ${processed} | Assignés: ${assigned}`);
      }
    }

    skip += 1000;
  }

  console.log(`\n\n✅ ${assigned} produits assignés à leur ProductGroup\n`);

  // Statistiques finales
  const finalProductsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });

  const totalProducts = await prisma.product.count();

  console.log(`📊 Statistiques finales:`);
  console.log(`   Produits avec ProductGroup: ${finalProductsWithGroup} / ${totalProducts} (${((finalProductsWithGroup / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

createMissingProductGroups().catch(console.error);
























