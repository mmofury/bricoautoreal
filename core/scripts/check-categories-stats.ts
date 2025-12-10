import { db } from '../lib/db';

async function checkStats() {
  console.log('📊 Statistiques des catégories et relations...\n');

  const categoriesCount = await db.tecDocCategory.count();
  const productGroupsCount = await db.productGroup.count();
  const relationsCount = await db.productGroupCategory.count();

  console.log(`✅ Catégories: ${categoriesCount}`);
  console.log(`✅ Groupes de produits: ${productGroupsCount}`);
  console.log(`✅ Relations produits ↔ catégories: ${relationsCount}\n`);

  // Exemple de catégorie avec ses produits
  const sampleCategory = await db.tecDocCategory.findFirst({
    include: {
      productGroups: {
        include: {
          productGroup: {
            select: {
              productName: true,
              slug: true,
              url: true,
            },
          },
        },
        take: 5,
      },
    },
  });

  if (sampleCategory) {
    console.log(`\n📦 Exemple - Catégorie: ${sampleCategory.name}`);
    console.log(`   URL: ${sampleCategory.url}`);
    console.log(`   Produits associés: ${sampleCategory.productGroups.length}`);
    if (sampleCategory.productGroups.length > 0) {
      console.log(`   Exemples:`);
      sampleCategory.productGroups.forEach((rel) => {
        console.log(`     - ${rel.productGroup.productName} (${rel.productGroup.url})`);
      });
    }
  }

  await db.$disconnect();
}

checkStats().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























