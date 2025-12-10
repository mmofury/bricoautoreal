// Script pour afficher les catégories d'un ProductGroup spécifique
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showProductGroupCategories(productGroupName: string) {
  console.log(`🔍 Catégories pour le ProductGroup: "${productGroupName}"\n`);

  const productGroup = await prisma.productGroup.findUnique({
    where: {
      productName: productGroupName,
    },
    include: {
      categories: {
        include: {
          category: {
            include: {
              parent: {
                include: {
                  parent: {
                    include: {
                      parent: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      products: {
        select: {
          id: true,
          articleNo: true,
        },
        take: 5,
      },
    },
  });

  if (!productGroup) {
    console.log(`❌ ProductGroup "${productGroupName}" non trouvé\n`);
    await prisma.$disconnect();
    return;
  }

  console.log(`📦 ProductGroup: ${productGroup.productName}`);
  console.log(`   Slug: ${productGroup.slug}`);
  console.log(`   URL: ${productGroup.url}`);
  console.log(`   Produits: ${productGroup.products.length} (affichage des 5 premiers)\n`);

  if (productGroup.products.length > 0) {
    console.log('   Exemples de produits:');
    productGroup.products.forEach((product, index) => {
      console.log(`      ${index + 1}. ${product.articleNo}`);
    });
    console.log('');
  }

  console.log(`📁 Catégories (${productGroup.categories.length}):\n`);

  if (productGroup.categories.length === 0) {
    console.log('   Aucune catégorie associée\n');
  } else {
    productGroup.categories.forEach((rel, index) => {
      const cat = rel.category;
      console.log(`   ${index + 1}. ${cat.name}`);
      console.log(`      DisplayId: ${cat.displayId}`);
      console.log(`      Niveau: ${cat.level}`);
      console.log(`      Slug: ${cat.slug}`);
      console.log(`      URL: ${cat.url}`);
      
      // Afficher le chemin complet
      const path: string[] = [];
      let current: any = cat;
      while (current) {
        path.unshift(current.name);
        current = current.parent;
      }
      console.log(`      Chemin: ${path.join(' > ')}`);
      
      // Vérifier si c'est une catégorie InterCars
      const isInterCars = cat.displayId.startsWith('GenericArticle_') || 
                         cat.displayId.startsWith('SalesClassificationNode_');
      if (isInterCars) {
        console.log(`      ✅ Catégorie InterCars`);
      }
      console.log('');
    });
  }

  // Séparer les catégories InterCars des autres
  const interCarsCategories = productGroup.categories.filter(rel => {
    const displayId = rel.category.displayId;
    return displayId.startsWith('GenericArticle_') || 
           displayId.startsWith('SalesClassificationNode_');
  });

  const otherCategories = productGroup.categories.filter(rel => {
    const displayId = rel.category.displayId;
    return !displayId.startsWith('GenericArticle_') && 
           !displayId.startsWith('SalesClassificationNode_');
  });

  console.log(`\n📊 Résumé:`);
  console.log(`   Total catégories: ${productGroup.categories.length}`);
  console.log(`   Catégories InterCars: ${interCarsCategories.length}`);
  console.log(`   Autres catégories: ${otherCategories.length}\n`);

  await prisma.$disconnect();
}

// Récupérer le nom du ProductGroup depuis les arguments
const productGroupName = process.argv[2];

if (!productGroupName) {
  console.log('Usage: tsx scripts/show-productgroup-categories.ts "Nom du ProductGroup"');
  console.log('\nExemple:');
  console.log('  tsx scripts/show-productgroup-categories.ts "Batterie de démarrage"');
  process.exit(1);
}

showProductGroupCategories(productGroupName).catch(console.error);
























