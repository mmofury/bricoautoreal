import { db } from '../lib/db';

async function listLevel1Categories() {
  console.log('📁 Liste des catégories de niveau 1 (premier niveau)...\n');

  const level1Categories = await db.tecDocCategory.findMany({
    where: {
      level: 1,
    },
    include: {
      children: {
        select: {
          name: true,
          slug: true,
          level: true,
        },
        orderBy: {
          name: 'asc',
        },
      },
      productGroups: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`📊 Total: ${level1Categories.length} catégories de niveau 1\n`);

  for (const cat of level1Categories) {
    const productCount = cat.productGroups.length;
    const childrenCount = cat.children.length;
    console.log(`📁 ${cat.name}`);
    console.log(`   URL: ${cat.url}`);
    console.log(`   Enfants: ${childrenCount} sous-catégories`);
    console.log(`   Produits directs: ${productCount}`);
    
    if (cat.children.length > 0) {
      console.log(`   Exemples de sous-catégories:`);
      for (const child of cat.children.slice(0, 5)) {
        console.log(`     - ${child.name} (niveau ${child.level})`);
      }
      if (cat.children.length > 5) {
        console.log(`     ... et ${cat.children.length - 5} autres`);
      }
    }
    console.log('');
  }

  // Statistiques
  console.log('\n📊 Statistiques:\n');
  const totalChildren = level1Categories.reduce((sum, cat) => sum + cat.children.length, 0);
  const totalProducts = level1Categories.reduce((sum, cat) => sum + cat.productGroups.length, 0);
  
  console.log(`   - Total catégories niveau 1: ${level1Categories.length}`);
  console.log(`   - Total sous-catégories (niveau 2+): ${totalChildren}`);
  console.log(`   - Total produits directs: ${totalProducts}`);

  await db.$disconnect();
}

listLevel1Categories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























