import { db } from '../lib/db';

async function debugAccoudoirHierarchy() {
  console.log('🔍 Analyse de la hiérarchie "accoudoir"...\n');

  // Trouver toutes les catégories avec "accoudoir" dans le nom
  const accoudoirCategories = await db.tecDocCategory.findMany({
    where: {
      name: {
        contains: 'accoudoir',
      },
    },
    include: {
      parent: {
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
      children: true,
    },
    orderBy: {
      level: 'asc',
    },
  });

  console.log(`📦 Nombre de catégories "accoudoir": ${accoudoirCategories.length}\n`);

  for (const cat of accoudoirCategories) {
    console.log(`${'='.repeat(80)}`);
    console.log(`📁 Catégorie: ${cat.name}`);
    console.log(`   - ID: ${cat.id}`);
    console.log(`   - TecDoc Category ID: ${cat.tecdocCategoryId || 'null'}`);
    console.log(`   - Niveau: ${cat.level}`);
    console.log(`   - Slug: ${cat.slug}`);
    console.log(`   - Display ID: ${cat.displayId}`);
    console.log(`   - URL: ${cat.url}`);
    console.log(`   - Parent ID: ${cat.parentId || 'null'}`);
    
    if (cat.parent) {
      console.log(`   - Parent: ${cat.parent.name} (ID: ${cat.parent.id})`);
    } else {
      console.log(`   - Parent: aucun (niveau 1)`);
    }

    // Construire le chemin complet vers la racine
    const path: string[] = [];
    let current: any = cat;
    const visited = new Set<number>();

    while (current) {
      if (visited.has(current.id)) {
        console.log(`\n   ⚠️  BOUCLE DÉTECTÉE! Catégorie ${current.id} déjà visitée`);
        break;
      }
      visited.add(current.id);
      path.unshift(current.name);
      current = current.parent;
    }

    console.log(`\n   Chemin complet: ${path.join(' > ')}`);
    console.log(`   Longueur du chemin: ${path.length} niveaux`);

    if (cat.children.length > 0) {
      console.log(`\n   Enfants (${cat.children.length}):`);
      cat.children.forEach((child) => {
        console.log(`     - ${child.name} (ID: ${child.id}, niveau: ${child.level})`);
      });
    }
    console.log('');
  }

  // Vérifier s'il y a des boucles ou des répétitions
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 Recherche de problèmes de hiérarchie...\n');

  // Vérifier les catégories qui se référencent elles-mêmes
  const selfReferencing = accoudoirCategories.filter(cat => cat.parentId === cat.id);
  if (selfReferencing.length > 0) {
    console.log(`⚠️  Catégories qui se référencent elles-mêmes: ${selfReferencing.length}`);
    selfReferencing.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
  }

  // Vérifier les répétitions dans les noms
  const names = accoudoirCategories.map(cat => cat.name.toLowerCase());
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Noms de catégories en double: ${new Set(duplicates).size}`);
    const uniqueDuplicates = Array.from(new Set(duplicates));
    uniqueDuplicates.forEach(name => {
      const cats = accoudoirCategories.filter(cat => cat.name.toLowerCase() === name);
      console.log(`   - "${name}" apparaît ${cats.length} fois:`);
      cats.forEach(cat => {
        console.log(`     * ID: ${cat.id}, Niveau: ${cat.level}, Parent ID: ${cat.parentId || 'null'}`);
      });
    });
  }

  await db.$disconnect();
}

debugAccoudoirHierarchy().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});





























