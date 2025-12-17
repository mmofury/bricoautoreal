import { db } from '../lib/db';

async function analyzeAccoudoir() {
  console.log('🔍 Analyse des groupes de produits "Accoudoir"...\n');

  // Récupérer tous les groupes de produits contenant "Accoudoir"
  const accoudoirs = await db.productGroup.findMany({
    where: {
      productName: {
        contains: 'Accoudoir',
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
    orderBy: {
      tecdocProductId: 'asc',
    },
  });

  console.log(`📦 Nombre total de groupes "Accoudoir": ${accoudoirs.length}\n`);

  if (accoudoirs.length === 0) {
    console.log('❌ Aucun groupe "Accoudoir" trouvé.');
    await db.$disconnect();
    return;
  }

  // Grouper par tecdocProductId pour voir les doublons
  const byTecDocId = new Map<number, typeof accoudoirs>();
  for (const pg of accoudoirs) {
    if (!byTecDocId.has(pg.tecdocProductId)) {
      byTecDocId.set(pg.tecdocProductId, []);
    }
    byTecDocId.get(pg.tecdocProductId)!.push(pg);
  }

  console.log(`📊 Groupes uniques (par tecdocProductId): ${byTecDocId.size}\n`);

  // Afficher chaque groupe
  for (let i = 0; i < accoudoirs.length; i++) {
    const pg = accoudoirs[i];
    console.log(`${'='.repeat(80)}`);
    console.log(`📦 Groupe ${i + 1}:`);
    console.log(`   - ID: ${pg.id}`);
    console.log(`   - Nom: ${pg.productName}`);
    console.log(`   - TecDoc Product ID: ${pg.tecdocProductId}`);
    console.log(`   - Slug: ${pg.slug}`);
    console.log(`   - Display ID: ${pg.displayId}`);
    console.log(`   - URL: ${pg.url}`);
    console.log(`   - Nombre de catégories: ${pg.categories.length}\n`);

    if (pg.categories.length === 0) {
      console.log('   ⚠️  Aucune catégorie associée!\n');
    } else {
      // Afficher chaque chemin de catégorie
      for (let j = 0; j < pg.categories.length; j++) {
        const rel = pg.categories[j];
        const cat = rel.category;

        // Construire le chemin complet
        const path: string[] = [];
        let current: any = cat;

        while (current) {
          path.unshift(current.name);
          current = current.parent;
        }

        console.log(`   Chemin ${j + 1}: ${path.join(' > ')}`);
        console.log(`   └── Catégorie finale: ${cat.name} (niveau ${cat.level}, ID: ${cat.id})`);
        console.log(`       URL: ${cat.url}\n`);
      }
    }
  }

  // Statistiques
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 Statistiques:\n');
  console.log(`   - Groupes totaux: ${accoudoirs.length}`);
  console.log(`   - Groupes uniques (tecdocProductId): ${byTecDocId.size}`);
  console.log(`   - Groupes avec catégories: ${accoudoirs.filter(pg => pg.categories.length > 0).length}`);
  console.log(`   - Groupes sans catégories: ${accoudoirs.filter(pg => pg.categories.length === 0).length}`);
  
  const totalCategories = accoudoirs.reduce((sum, pg) => sum + pg.categories.length, 0);
  console.log(`   - Total de relations catégories: ${totalCategories}`);
  console.log(`   - Moyenne de catégories par groupe: ${(totalCategories / accoudoirs.length).toFixed(1)}`);

  // Vérifier les doublons
  if (accoudoirs.length > byTecDocId.size) {
    console.log(`\n⚠️  ATTENTION: Il y a ${accoudoirs.length - byTecDocId.size} doublons potentiels!`);
    console.log('\n   Groupes avec le même tecdocProductId:');
    for (const [tecdocId, groups] of byTecDocId.entries()) {
      if (groups.length > 1) {
        console.log(`\n   tecdocProductId ${tecdocId} (${groups.length} occurrences):`);
        groups.forEach((g, idx) => {
          console.log(`     ${idx + 1}. ID: ${g.id}, Slug: ${g.slug}, URL: ${g.url}`);
        });
      }
    }
  }

  await db.$disconnect();
}

analyzeAccoudoir().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























