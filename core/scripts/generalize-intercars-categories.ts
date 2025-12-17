// Script pour généraliser les catégories InterCars à tous les produits
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generalizeInterCarsCategories() {
  console.log('🚀 Généralisation des catégories InterCars à tous les produits...\n');

  // Récupérer toutes les correspondances InterCarsCategory groupées par productName
  console.log('📦 Chargement des correspondances InterCarsCategory...');
  const interCarsCategories = await prisma.interCarsCategory.findMany({
    orderBy: {
      productName: 'asc',
    },
  });

  console.log(`   ✅ ${interCarsCategories.length} correspondances chargées\n`);

  // Grouper par productName
  const categoriesByProductName = new Map<string, Array<{
    genericArticleId: string;
    categoryName: string;
    isPrimary: boolean;
    csvId: string;
  }>>();

  for (const cat of interCarsCategories) {
    if (!cat.productName) continue;
    
    if (!categoriesByProductName.has(cat.productName)) {
      categoriesByProductName.set(cat.productName, []);
    }
    
    categoriesByProductName.get(cat.productName)!.push({
      genericArticleId: cat.genericArticleId,
      categoryName: cat.categoryName || '',
      isPrimary: cat.isPrimary,
      csvId: cat.csvId,
    });
  }

  console.log(`📊 ${categoriesByProductName.size} productName uniques avec catégories InterCars\n`);

  // Pour chaque productName, trouver tous les produits et leur assigner les catégories
  let totalProducts = 0;
  let productsWithCategories = 0;
  let categoriesAssigned = 0;
  let processed = 0;

  console.log('🔄 Traitement des produits...\n');

  for (const [productName, categories] of categoriesByProductName.entries()) {
    processed++;
    
    // Trouver tous les produits avec ce productName
    const products = await prisma.product.findMany({
      where: {
        productName: productName,
      },
      select: {
        id: true,
        articleNo: true,
        productName: true,
      },
    });

    if (products.length === 0) {
      continue;
    }

    totalProducts += products.length;
    productsWithCategories += products.length;

    // Afficher la progression pour les productName avec beaucoup de produits
    if (products.length > 100 || processed % 100 === 0) {
      console.log(`[${processed}/${categoriesByProductName.size}] ${productName}: ${products.length} produits, ${categories.length} catégorie(s) InterCars`);
    }

    // Pour chaque catégorie, créer une entrée dans une table de correspondance
    // Pour l'instant, on va juste compter et afficher les statistiques
    categoriesAssigned += categories.length * products.length;
  }

  console.log(`\n📊 Statistiques:`);
  console.log(`   ProductName traités: ${processed}`);
  console.log(`   Total produits concernés: ${totalProducts.toLocaleString()}`);
  console.log(`   Produits avec catégories InterCars: ${productsWithCategories.toLocaleString()}`);
  console.log(`   Correspondances à créer: ${categoriesAssigned.toLocaleString()}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de productName avec le plus de produits:\n');
  const productCounts = new Map<string, number>();
  
  for (const [productName, categories] of categoriesByProductName.entries()) {
    const count = await prisma.product.count({
      where: {
        productName: productName,
      },
    });
    productCounts.set(productName, count);
  }

  const sortedProductNames = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [productName, count] of sortedProductNames) {
    const categories = categoriesByProductName.get(productName) || [];
    const primaryCategories = categories.filter(c => c.isPrimary);
    console.log(`   ${productName}: ${count.toLocaleString()} produits, ${categories.length} catégorie(s) (${primaryCategories.length} primary)`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Analyse terminée!');
  console.log('💡 Pour créer les correspondances, utilisez le script avec l\'option --apply');
}

generalizeInterCarsCategories().catch(console.error);

























