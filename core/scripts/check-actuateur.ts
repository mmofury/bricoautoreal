import { db } from '../lib/db';

async function checkActuateur() {
  console.log('🔍 Recherche de "Actuateur, arbre excentrique (levée variable)"...\n');

  // Chercher par tecdocProductId ou slug
  const actuateur = await db.productGroup.findFirst({
    where: {
      OR: [
        { slug: 'actuateur-arbre-excentrique-levee-variable' },
        { tecdocProductId: 3813 },
      ],
    },
    include: {
      categories: {
        include: {
          category: {
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
  });

  if (!actuateur) {
    console.log('❌ Groupe de produit non trouvé');
    await db.$disconnect();
    return;
  }

  console.log(`✅ ${actuateur.productName}`);
  console.log(`   Slug: ${actuateur.slug}`);
  console.log(`   URL: ${actuateur.url}`);
  console.log(`   Catégories associées: ${actuateur.categories.length}\n`);

  for (const rel of actuateur.categories) {
    const cat = rel.category;
    console.log(`📁 ${cat.name} (niveau ${cat.level})`);
    console.log(`   URL: ${cat.url}`);
    if (cat.parent) {
      console.log(`   Parent: ${cat.parent.name} (niveau ${cat.parent.level})`);
      if (cat.parent.parent) {
        console.log(`   Grand-parent: ${cat.parent.parent.name} (niveau ${cat.parent.parent.level})`);
      }
    } else {
      console.log(`   Parent: Aucun`);
    }
    console.log('');
  }

  // Chercher aussi la catégorie "actuateur-arbre-excentrique-levee-variable"
  const catActuateur = await db.tecDocCategory.findFirst({
    where: {
      OR: [
        { slug: 'actuateur-arbre-excentrique-levee-variable' },
        { tecdocCategoryId: 100003 },
      ],
    },
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
      children: true,
    },
  });

  if (catActuateur) {
    console.log(`\n📦 Catégorie "actuateur-arbre-excentrique-levee-variable":`);
    console.log(`   Niveau: ${catActuateur.level}`);
    console.log(`   Parent: ${catActuateur.parent?.name || 'Aucun'}`);
    console.log(`   Enfants: ${catActuateur.children.length}`);
  }

  await db.$disconnect();
}

checkActuateur().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});

