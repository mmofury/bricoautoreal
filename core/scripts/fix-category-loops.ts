import { db } from '../lib/db';

async function fixCategoryLoops() {
  console.log('🔧 Correction des boucles dans la hiérarchie des catégories...\n');

  // Trouver toutes les catégories qui se référencent elles-mêmes
  const selfReferencing = await db.tecDocCategory.findMany({
    where: {
      parentId: {
        equals: db.tecDocCategory.fields.id,
      },
    },
  });

  // Correction: utiliser une requête SQL brute car Prisma ne supporte pas cette comparaison directement
  const allCategories = await db.tecDocCategory.findMany({
    include: {
      parent: true,
    },
  });

  const selfRef = allCategories.filter(cat => cat.parentId === cat.id);

  console.log(`📦 Catégories qui se référencent elles-mêmes: ${selfRef.length}\n`);

  if (selfRef.length === 0) {
    console.log('✅ Aucune boucle détectée!');
    await db.$disconnect();
    return;
  }

  for (const cat of selfRef) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Catégorie problématique: ${cat.name} (ID: ${cat.id})`);
    console.log(`   - TecDoc Category ID: ${cat.tecdocCategoryId || 'null'}`);
    console.log(`   - Niveau: ${cat.level}`);
    console.log(`   - Parent ID actuel: ${cat.parentId} (BOUCLE!)`);

    // Chercher un parent approprié basé sur le tecdocCategoryId
    // Pour "accoudoir" (100860), on cherche "Accessoires" (100733) ou "Équipement intérieur" (100341)
    let newParentId: number | null = null;

    if (cat.tecdocCategoryId === 100860) {
      // "Accoudoir" devrait être sous "Accessoires" (100733) ou "Équipement intérieur" (100341)
      const accessoires = await db.tecDocCategory.findFirst({
        where: {
          tecdocCategoryId: 100733,
        },
      });
      const equipement = await db.tecDocCategory.findFirst({
        where: {
          tecdocCategoryId: 100341,
        },
      });

      // Préférer "Accessoires" car c'est le premier chemin dans l'arborescence
      if (accessoires) {
        newParentId = accessoires.id;
        console.log(`   ✅ Nouveau parent trouvé: ${accessoires.name} (ID: ${accessoires.id})`);
      } else if (equipement) {
        newParentId = equipement.id;
        console.log(`   ✅ Nouveau parent trouvé: ${equipement.name} (ID: ${equipement.id})`);
      } else {
        // Si aucun parent n'est trouvé, mettre à null (catégorie de niveau 1)
        newParentId = null;
        console.log(`   ⚠️  Aucun parent trouvé, sera mis à null (niveau 1)`);
      }
    } else {
      // Pour les autres catégories, on met simplement à null (niveau 1)
      newParentId = null;
      console.log(`   ⚠️  Catégorie inconnue, sera mise à niveau 1 (parent = null)`);
    }

    // Mettre à jour la catégorie
    if (newParentId !== cat.id) {
      await db.tecDocCategory.update({
        where: { id: cat.id },
        data: {
          parentId: newParentId,
          level: newParentId ? 2 : 1, // Ajuster le niveau si nécessaire
        },
      });
      console.log(`   ✅ Catégorie corrigée: parentId = ${newParentId || 'null'}, level = ${newParentId ? 2 : 1}`);
    }
  }

  // Vérifier qu'il n'y a plus de boucles
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 Vérification finale...\n');

  const allCategoriesAfter = await db.tecDocCategory.findMany({
    include: {
      parent: true,
    },
  });

  const remainingLoops = allCategoriesAfter.filter(cat => cat.parentId === cat.id);
  
  if (remainingLoops.length === 0) {
    console.log('✅ Toutes les boucles ont été corrigées!');
  } else {
    console.log(`⚠️  Il reste ${remainingLoops.length} boucles:`);
    remainingLoops.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
  }

  await db.$disconnect();
}

fixCategoryLoops().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























