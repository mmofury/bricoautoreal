import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMissingTranslations() {
  console.log('🔍 Analyse des traductions manquantes...\n');

  // Récupérer toutes les hiérarchies
  const allHierarchies = await prisma.interCarsHierarchy.findMany({
    select: {
      id: true,
      genericArticleId: true,
      level1Label: true,
      level1LabelFr: true,
      level2Label: true,
      level2LabelFr: true,
      level3Label: true,
      level3LabelFr: true,
      level4Label: true,
      level4LabelFr: true,
    },
  });

  console.log(`📦 Total hiérarchies: ${allHierarchies.length}\n`);

  // Analyser les manquantes
  const missingLevel1 = allHierarchies.filter(h => !h.level1LabelFr && h.level1Label);
  const missingLevel2 = allHierarchies.filter(h => !h.level2LabelFr && h.level2Label);
  const missingLevel3 = allHierarchies.filter(h => !h.level3LabelFr && h.level3Label);
  const missingLevel4 = allHierarchies.filter(h => !h.level4LabelFr && h.level4Label);

  console.log('📊 Traductions manquantes par niveau:');
  console.log(`   Level 1: ${missingLevel1.length} (sur ${allHierarchies.filter(h => h.level1Label).length} avec label)`);
  console.log(`   Level 2: ${missingLevel2.length} (sur ${allHierarchies.filter(h => h.level2Label).length} avec label)`);
  console.log(`   Level 3: ${missingLevel3.length} (sur ${allHierarchies.filter(h => h.level3Label).length} avec label)`);
  console.log(`   Level 4: ${missingLevel4.length} (sur ${allHierarchies.filter(h => h.level4Label).length} avec label)\n`);

  // Exemples de manquantes
  if (missingLevel1.length > 0) {
    console.log('📋 Exemples Level 1 manquants (10 premiers):');
    missingLevel1.slice(0, 10).forEach(h => {
      console.log(`   - ${h.level1Label} [${h.genericArticleId}]`);
    });
    console.log();
  }

  if (missingLevel2.length > 0) {
    console.log('📋 Exemples Level 2 manquants (10 premiers):');
    missingLevel2.slice(0, 10).forEach(h => {
      console.log(`   - ${h.level2Label} [${h.genericArticleId}]`);
    });
    console.log();
  }

  if (missingLevel3.length > 0) {
    console.log('📋 Exemples Level 3 manquants (10 premiers):');
    missingLevel3.slice(0, 10).forEach(h => {
      console.log(`   - ${h.level3Label} [${h.genericArticleId}]`);
    });
    console.log();
  }

  if (missingLevel4.length > 0) {
    console.log('📋 Exemples Level 4 manquants (10 premiers):');
    missingLevel4.slice(0, 10).forEach(h => {
      console.log(`   - ${h.level4Label} [${h.genericArticleId}]`);
    });
    console.log();
  }

  // Vérifier les labels uniques qui n'ont pas été traduits
  const uniqueLevel1Labels = [...new Set(missingLevel1.map(h => h.level1Label))];
  const uniqueLevel2Labels = [...new Set(missingLevel2.map(h => h.level2Label))];
  const uniqueLevel3Labels = [...new Set(missingLevel3.map(h => h.level3Label))];
  const uniqueLevel4Labels = [...new Set(missingLevel4.map(h => h.level4Label!))];

  console.log('📊 Labels uniques non traduits:');
  console.log(`   Level 1: ${uniqueLevel1Labels.length} labels uniques`);
  console.log(`   Level 2: ${uniqueLevel2Labels.length} labels uniques`);
  console.log(`   Level 3: ${uniqueLevel3Labels.length} labels uniques`);
  console.log(`   Level 4: ${uniqueLevel4Labels.length} labels uniques\n`);

  if (uniqueLevel1Labels.length > 0) {
    console.log('📋 Labels Level 1 non traduits:');
    uniqueLevel1Labels.forEach(label => console.log(`   - "${label}"`));
    console.log();
  }

  if (uniqueLevel2Labels.length > 0) {
    console.log('📋 Labels Level 2 non traduits:');
    uniqueLevel2Labels.forEach(label => console.log(`   - "${label}"`));
    console.log();
  }

  if (uniqueLevel3Labels.length > 0) {
    console.log('📋 Labels Level 3 non traduits:');
    uniqueLevel3Labels.forEach(label => console.log(`   - "${label}"`));
    console.log();
  }

  if (uniqueLevel4Labels.length > 0) {
    console.log('📋 Labels Level 4 non traduits:');
    uniqueLevel4Labels.forEach(label => console.log(`   - "${label}"`));
    console.log();
  }

  await prisma.$disconnect();
}

analyzeMissingTranslations().catch(console.error);























