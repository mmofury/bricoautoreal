// Script pour supprimer les tables TecDocCategory, ProductGroupCategory et ProductGroup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteInterCarsTables() {
  console.log('🗑️  Suppression des tables InterCars...\n');

  // 1. Mettre productGroupId à null dans Product (pour éviter les erreurs de foreign key)
  console.log('1️⃣  Suppression des références productGroupId dans Product...');
  const productsUpdated = await prisma.product.updateMany({
    where: {
      productGroupId: {
        not: null,
      },
    },
    data: {
      productGroupId: null,
    },
  });
  console.log(`   ✅ ${productsUpdated.count} produits mis à jour\n`);

  // 2. Supprimer ProductGroupCategory
  console.log('2️⃣  Suppression de ProductGroupCategory...');
  const deletedRelations = await prisma.productGroupCategory.deleteMany({});
  console.log(`   ✅ ${deletedRelations.count} relations supprimées\n`);

  // 3. Supprimer ProductGroup
  console.log('3️⃣  Suppression de ProductGroup...');
  try {
    const countBefore = await prisma.productGroup.count();
    console.log(`   📊 ProductGroup à supprimer: ${countBefore}`);
    
    if (countBefore > 0) {
      // Essayer avec Prisma d'abord
      console.log(`   ⏳ Suppression en cours... (cela peut prendre du temps)`);
      const deletedGroups = await prisma.productGroup.deleteMany({});
      console.log(`   ✅ ${deletedGroups.count} ProductGroup supprimés\n`);
    } else {
      console.log(`   ✅ Aucun ProductGroup à supprimer\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Erreur lors de la suppression de ProductGroup:`, error.message);
    console.error(`   Code d'erreur: ${error.code}`);
    console.log(`   🔄 Tentative avec SQL brut...`);
    
    // Essayer avec SQL brut
    try {
      await prisma.$executeRaw`DELETE FROM product_groups`;
      const countAfter = await prisma.productGroup.count();
      console.log(`   ✅ Suppression SQL réussie. ProductGroup restants: ${countAfter}\n`);
    } catch (sqlError: any) {
      console.error(`   ❌ Erreur SQL:`, sqlError.message);
      throw error;
    }
  }

  // 4. Supprimer TecDocCategory
  console.log('4️⃣  Suppression de TecDocCategory...');
  try {
    const countBefore = await prisma.tecDocCategory.count();
    console.log(`   📊 TecDocCategory à supprimer: ${countBefore}`);
    
    if (countBefore > 0) {
      // Essayer avec Prisma d'abord
      console.log(`   ⏳ Suppression en cours... (cela peut prendre du temps)`);
      const deletedCategories = await prisma.tecDocCategory.deleteMany({});
      console.log(`   ✅ ${deletedCategories.count} catégories supprimées\n`);
    } else {
      console.log(`   ✅ Aucune TecDocCategory à supprimer\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Erreur lors de la suppression de TecDocCategory:`, error.message);
    console.error(`   Code d'erreur: ${error.code}`);
    console.log(`   🔄 Tentative avec SQL brut...`);
    
    // Essayer avec SQL brut
    try {
      await prisma.$executeRaw`DELETE FROM tecdoc_categories`;
      const countAfter = await prisma.tecDocCategory.count();
      console.log(`   ✅ Suppression SQL réussie. TecDocCategory restants: ${countAfter}\n`);
    } catch (sqlError: any) {
      console.error(`   ❌ Erreur SQL:`, sqlError.message);
      throw error;
    }
  }

  // Vérification finale
  const remainingRelations = await prisma.productGroupCategory.count();
  const remainingGroups = await prisma.productGroup.count();
  const remainingCategories = await prisma.tecDocCategory.count();
  const productsWithGroup = await prisma.product.count({
    where: {
      productGroupId: {
        not: null,
      },
    },
  });

  console.log('📊 Vérification finale:');
  console.log(`   ProductGroupCategory restants: ${remainingRelations}`);
  console.log(`   ProductGroup restants: ${remainingGroups}`);
  console.log(`   TecDocCategory restants: ${remainingCategories}`);
  console.log(`   Produits avec productGroupId: ${productsWithGroup}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

deleteInterCarsTables().catch(console.error);

