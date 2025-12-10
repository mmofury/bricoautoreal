// Script pour expliquer la structure de la hiérarchie InterCars
// Utiliser: dotenv -e ../.env.local -- tsx scripts/explain-hierarchy-structure.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function explainHierarchyStructure() {
  console.log('📊 Explication de la structure InterCarsHierarchy\n');

  // Nombre total de lignes (hiérarchies complètes)
  const totalHierarchies = await prisma.interCarsHierarchy.count();
  console.log(`📦 Nombre total de lignes dans InterCarsHierarchy: ${totalHierarchies}`);
  console.log(`   → Chaque ligne = une hiérarchie complète pour un genericArticleId\n`);

  // Nombre de catégories uniques par niveau
  const uniqueLevel1 = await prisma.interCarsHierarchy.groupBy({
    by: ['level1Id'],
    _count: true,
  });

  const uniqueLevel2 = await prisma.interCarsHierarchy.groupBy({
    by: ['level2Id'],
    _count: true,
  });

  const uniqueLevel3 = await prisma.interCarsHierarchy.groupBy({
    by: ['level3Id'],
    _count: true,
  });

  const uniqueLevel4 = await prisma.interCarsHierarchy.groupBy({
    by: ['level4Id'],
    where: {
      level4Id: { not: null },
    },
    _count: true,
  });

  console.log(`📊 Catégories UNIQUES par niveau:\n`);
  console.log(`   Level 1: ${uniqueLevel1.length} catégories uniques`);
  console.log(`   Level 2: ${uniqueLevel2.length} catégories uniques`);
  console.log(`   Level 3: ${uniqueLevel3.length} catégories uniques`);
  console.log(`   Level 4: ${uniqueLevel4.length} catégories uniques\n`);

  // Exemples : combien de hiérarchies partagent le même level1Id
  console.log(`📋 Exemples : Combien de hiérarchies partagent le même niveau ?\n`);

  // Top 5 des level1 les plus utilisés
  const topLevel1 = uniqueLevel1
    .sort((a, b) => b._count - a._count)
    .slice(0, 5);

  for (const level1 of topLevel1) {
    const sample = await prisma.interCarsHierarchy.findFirst({
      where: { level1Id: level1.level1Id },
      select: { level1LabelFr: true },
    });
    console.log(`   Level 1 "${sample?.level1LabelFr || level1.level1Id}":`);
    console.log(`   → ${level1._count} hiérarchies passent par cette catégorie\n`);
  }

  // Exemple concret : prenons une catégorie level1 et voyons ses enfants
  const exampleLevel1 = await prisma.interCarsHierarchy.findFirst({
    where: { level1LabelFr: { contains: 'Filtres' } },
  });

  if (exampleLevel1) {
    console.log(`🔍 Exemple concret avec "${exampleLevel1.level1LabelFr}":\n`);
    
    const hierarchiesWithSameLevel1 = await prisma.interCarsHierarchy.findMany({
      where: { level1Id: exampleLevel1.level1Id },
      take: 10,
      select: {
        genericArticleId: true,
        level1LabelFr: true,
        level2LabelFr: true,
        level3LabelFr: true,
      },
    });

    console.log(`   ${hierarchiesWithSameLevel1.length} exemples de hiérarchies qui partagent ce Level 1:\n`);
    for (const h of hierarchiesWithSameLevel1) {
      console.log(`   - ${h.genericArticleId}: ${h.level1LabelFr} > ${h.level2LabelFr} > ${h.level3LabelFr}`);
    }
    console.log('');

    // Compter combien de level2 différents partagent ce level1
    const level2Children = await prisma.interCarsHierarchy.groupBy({
      by: ['level2Id'],
      where: { level1Id: exampleLevel1.level1Id },
      _count: true,
    });

    console.log(`   → Ce Level 1 a ${level2Children.length} enfants Level 2 différents\n`);
  }

  console.log(`\n💡 Explication:\n`);
  console.log(`   - 5750 lignes = 5750 genericArticleId différents (produits/génériques différents)`);
  console.log(`   - Chaque ligne = un chemin complet Level 1 → Level 2 → Level 3 → (Level 4)`);
  console.log(`   - Plusieurs lignes peuvent partager le même Level 1`);
  console.log(`   - C'est pourquoi on génère 5750 URLs pour chaque niveau (une par ligne)`);
  console.log(`   - Mais la navigation (childrenLevel2, etc.) stocke les relations uniques parent→enfants\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

explainHierarchyStructure().catch(console.error);










