import { db } from '../lib/db';

async function showProductGroupsArborescence() {
  console.log('🌳 Arborescence de plusieurs groupes de produits...\n');

  // Récupérer plusieurs groupes de produits avec leurs catégories
  const productGroups = await db.productGroup.findMany({
    where: {
      categories: {
        some: {},
      },
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
    },
    take: 20, // Prendre 20 exemples
    orderBy: {
      productName: 'asc',
    },
  });

  console.log(`📦 ${productGroups.length} groupes de produits analysés\n`);

  for (const pg of productGroups) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 ${pg.productName}`);
    console.log(`   URL: ${pg.url}`);
    console.log(`   Catégories: ${pg.categories.length}\n`);

    // Afficher chaque chemin de catégorie
    for (let i = 0; i < pg.categories.length; i++) {
      const rel = pg.categories[i];
      const cat = rel.category;
      
      // Construire le chemin complet
      const path: string[] = [];
      let current: any = cat;
      
      while (current) {
        path.unshift(current.name);
        current = current.parent;
      }

      console.log(`   Chemin ${i + 1}: ${path.join(' > ')}`);
      console.log(`   └── Catégorie finale: ${cat.name} (niveau ${cat.level})`);
      console.log(`       URL: ${cat.url}`);
    }
  }

  // Afficher aussi quelques statistiques
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 Statistiques:\n');

  const allPaths = new Set<string>();
  for (const pg of productGroups) {
    for (const rel of pg.categories) {
      const cat = rel.category;
      const path: string[] = [];
      let current: any = cat;
      while (current) {
        path.unshift(current.name);
        current = current.parent;
      }
      allPaths.add(path.join(' > '));
    }
  }

  console.log(`   - Groupes analysés: ${productGroups.length}`);
  console.log(`   - Chemins uniques: ${allPaths.size}`);
  console.log(`   - Moyenne de catégories par groupe: ${(productGroups.reduce((sum, pg) => sum + pg.categories.length, 0) / productGroups.length).toFixed(1)}`);

  await db.$disconnect();
}

showProductGroupsArborescence().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























