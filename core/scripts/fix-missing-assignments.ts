// Script pour corriger les assignations manquantes (correspondance améliorée)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, ' ') // Remplacer tout ce qui n'est pas alphanumérique par un espace
    .replace(/\s+/g, ' ') // Normaliser les espaces multiples
    .trim();
}

async function fixMissingAssignments() {
  console.log('🔧 Correction des assignations manquantes...\n');

  // Charger tous les ProductGroup avec normalisation
  const allProductGroups = await prisma.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });

  console.log(`📦 ProductGroup chargés: ${allProductGroups.length}\n`);

  // Créer plusieurs index pour la correspondance
  const exactMap = new Map<string, number>();
  const caseInsensitiveMap = new Map<string, { id: number; originalName: string }>();
  const normalizedMap = new Map<string, { id: number; originalName: string }>();

  allProductGroups.forEach(group => {
    // Index exact
    exactMap.set(group.productName, group.id);
    
    // Index insensible à la casse
    const lower = group.productName.toLowerCase().trim();
    if (!caseInsensitiveMap.has(lower)) {
      caseInsensitiveMap.set(lower, { id: group.id, originalName: group.productName });
    }
    
    // Index normalisé (sans accents, espaces normalisés)
    const normalized = normalizeString(group.productName);
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, { id: group.id, originalName: group.productName });
    }
  });

  console.log(`✅ Index créés:`);
  console.log(`   Correspondance exacte: ${exactMap.size}`);
  console.log(`   Correspondance insensible à la casse: ${caseInsensitiveMap.size}`);
  console.log(`   Correspondance normalisée: ${normalizedMap.size}\n`);

  // Récupérer les produits sans ProductGroup
  let processed = 0;
  let assigned = 0;
  let notFound = 0;
  const notFoundNames = new Set<string>();
  let skip = 0;

  console.log('🔄 Traitement des produits sans ProductGroup...\n');

  const totalToProcess = await prisma.product.count({
    where: {
      productGroupId: null,
      productName: {
        not: null,
      },
    },
  });

  console.log(`📦 Produits à traiter: ${totalToProcess}\n`);

  let lastId = 0;
  
  while (true) {
    const products = await prisma.product.findMany({
      where: {
        id: {
          gt: lastId,
        },
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
      orderBy: {
        id: 'asc',
      },
    });

    if (products.length === 0) {
      break;
    }

    for (const product of products) {
      processed++;
      lastId = product.id;
      
      if (!product.productName) continue;

      // Essayer correspondance exacte
      let groupId = exactMap.get(product.productName);
      
      // Essayer correspondance insensible à la casse
      if (!groupId) {
        const lower = product.productName.toLowerCase().trim();
        const match = caseInsensitiveMap.get(lower);
        if (match) {
          groupId = match.id;
        }
      }
      
      // Essayer correspondance normalisée
      if (!groupId) {
        const normalized = normalizeString(product.productName);
        const match = normalizedMap.get(normalized);
        if (match) {
          groupId = match.id;
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

      if (processed % 10000 === 0) {
        const remaining = await prisma.product.count({
          where: {
            productGroupId: null,
            productName: {
              not: null,
            },
          },
        });
        process.stdout.write(`\r   Traités: ${processed} | Assignés: ${assigned} | Non trouvés: ${notFound} | Restants: ${remaining}`);
      }
    }
  }
  
  console.log(`\n   ✅ Tous les produits ont été traités !`);

  console.log(`\n\n📊 Résultats:`);
  console.log(`   ✅ Produits traités: ${processed}`);
  console.log(`   ✅ ProductGroup assignés: ${assigned}`);
  console.log(`   ❌ ProductGroup non trouvés: ${notFound} (${((notFound / processed) * 100).toFixed(2)}%)\n`);

  if (notFoundNames.size > 0) {
    console.log(`⚠️  Exemples de productName sans ProductGroup (premiers 20):`);
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

  const totalProducts = await prisma.product.count();
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

  console.log(`\n✅ Vérification finale:`);
  console.log(`   Produits avec ProductGroup: ${finalProductsWithGroup} / ${totalProducts} (${((finalProductsWithGroup / totalProducts) * 100).toFixed(2)}%)`);
  console.log(`   Produits avec catégories InterCars: ${productsWithCategories} / ${totalProducts} (${((productsWithCategories / totalProducts) * 100).toFixed(2)}%)\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

fixMissingAssignments().catch(console.error);

