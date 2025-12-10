import { db } from '../lib/db';

async function checkMoteurHierarchy() {
  console.log('🔍 Vérification de la hiérarchie Moteur...\n');

  // Chercher "Moteur"
  const moteur = await db.tecDocCategory.findFirst({
    where: {
      OR: [
        { slug: 'moteur' },
        { tecdocCategoryId: 100002 },
      ],
    },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
      },
    },
  });

  if (!moteur) {
    console.log('❌ Catégorie "Moteur" non trouvée');
    await db.$disconnect();
    return;
  }

  console.log(`✅ ${moteur.name} (niveau ${moteur.level}, ID: ${moteur.id})\n`);

  function printTree(cat: any, indent: string = '') {
    console.log(`${indent}├── ${cat.name} (niveau ${cat.level})`);
    console.log(`${indent}│   URL: ${cat.url}`);
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        printTree(child, indent + '│   ');
      }
    }
  }

  for (const child of moteur.children) {
    printTree(child);
    console.log('');
  }

  // Chercher spécifiquement "Distribution moteur"
  const distribution = await db.tecDocCategory.findFirst({
    where: {
      slug: 'distribution-moteur',
    },
    include: {
      parent: true,
      children: {
        include: {
          productGroups: {
            include: {
              productGroup: {
                select: {
                  productName: true,
                  slug: true,
                },
              },
            },
            take: 5,
          },
        },
      },
    },
  });

  if (distribution) {
    console.log(`\n📦 Distribution moteur:`);
    console.log(`   Niveau: ${distribution.level}`);
    console.log(`   Parent: ${distribution.parent?.name || 'Aucun'}`);
    console.log(`   Enfants: ${distribution.children.length}`);
    if (distribution.children.length > 0) {
      console.log(`   Exemples d'enfants:`);
      for (const child of distribution.children.slice(0, 3)) {
        console.log(`     - ${child.name} (niveau ${child.level})`);
      }
    }
  }

  await db.$disconnect();
}

checkMoteurHierarchy().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























