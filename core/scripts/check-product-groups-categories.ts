import { db } from '../lib/db';

async function checkProductGroupsCategories() {
  console.log('🔍 Vérification des associations groupes de produits ↔ catégories...\n');

  // Récupérer tous les groupes de produits
  const allProductGroups = await db.productGroup.findMany({
    include: {
      categories: {
        include: {
          category: {
            select: {
              name: true,
              level: true,
              parent: {
                select: {
                  name: true,
                  level: true,
                  parent: {
                    select: {
                      name: true,
                      level: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`📦 Total groupes de produits: ${allProductGroups.length}\n`);

  // Compter ceux avec et sans catégories
  const withCategories = allProductGroups.filter(pg => pg.categories.length > 0);
  const withoutCategories = allProductGroups.filter(pg => pg.categories.length === 0);

  console.log(`✅ Groupes avec catégories: ${withCategories.length}`);
  console.log(`❌ Groupes sans catégories: ${withoutCategories.length}\n`);

  // Afficher quelques exemples de groupes avec catégories
  if (withCategories.length > 0) {
    console.log('📁 Exemples de groupes avec catégories:\n');
    for (const pg of withCategories.slice(0, 5)) {
      console.log(`   ${pg.productName}`);
      console.log(`   URL: ${pg.url}`);
      console.log(`   Catégories associées: ${pg.categories.length}`);
      for (const rel of pg.categories.slice(0, 3)) {
        const cat = rel.category;
        let path = cat.name;
        if (cat.parent) {
          path = `${cat.parent.name} > ${path}`;
          if (cat.parent.parent) {
            path = `${cat.parent.parent.name} > ${path}`;
          }
        }
        console.log(`     - ${path} (niveau ${cat.level})`);
      }
      if (pg.categories.length > 3) {
        console.log(`     ... et ${pg.categories.length - 3} autres`);
      }
      console.log('');
    }
  }

  // Afficher les groupes sans catégories
  if (withoutCategories.length > 0) {
    console.log(`\n⚠️  Groupes sans catégories (${withoutCategories.length}):\n`);
    for (const pg of withoutCategories.slice(0, 10)) {
      console.log(`   - ${pg.productName} (${pg.slug})`);
    }
    if (withoutCategories.length > 10) {
      console.log(`   ... et ${withoutCategories.length - 10} autres`);
    }
  }

  // Statistiques par niveau de catégorie
  console.log('\n📊 Répartition par niveau de catégorie:\n');
  const levelStats = new Map<number, number>();
  
  for (const pg of withCategories) {
    for (const rel of pg.categories) {
      const level = rel.category.level;
      levelStats.set(level, (levelStats.get(level) || 0) + 1);
    }
  }

  for (const [level, count] of Array.from(levelStats.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`   Niveau ${level}: ${count} associations`);
  }

  // Vérifier les catégories avec le plus de produits
  console.log('\n🏆 Top 10 catégories avec le plus de groupes de produits:\n');
  const categoryStats = new Map<number, { name: string; count: number }>();

  for (const pg of withCategories) {
    for (const rel of pg.categories) {
      const catId = rel.category.id;
      const existing = categoryStats.get(catId);
      if (existing) {
        existing.count++;
      } else {
        categoryStats.set(catId, {
          name: rel.category.name,
          count: 1,
        });
      }
    }
  }

  const topCategories = Array.from(categoryStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const cat of topCategories) {
    console.log(`   ${cat.name}: ${cat.count} groupes de produits`);
  }

  await db.$disconnect();
}

checkProductGroupsCategories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});































