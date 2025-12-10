import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRemainingHierarchies() {
  console.log('🔍 Analyse des hiérarchies sans traductions complètes...\n');

  // Trouver les hiérarchies qui n'ont pas toutes les traductions
  const incomplete = await prisma.interCarsHierarchy.findMany({
    where: {
      OR: [
        { level1LabelFr: null },
        { level2LabelFr: null },
        { level3LabelFr: null },
        { level4LabelFr: null, level4Label: { not: null } },
      ],
    },
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

  console.log(`📦 Total hiérarchies incomplètes: ${incomplete.length}\n`);

  // Analyser par type de problème
  const missingLevel1 = incomplete.filter(h => !h.level1LabelFr && h.level1Label);
  const missingLevel2 = incomplete.filter(h => !h.level2LabelFr && h.level2Label);
  const missingLevel3 = incomplete.filter(h => !h.level3LabelFr && h.level3Label);
  const missingLevel4 = incomplete.filter(h => !h.level4LabelFr && h.level4Label);
  const hasLevel4ButNoLabel = incomplete.filter(h => h.level4Label && !h.level4LabelFr);

  console.log('📊 Répartition des problèmes:');
  console.log(`   Level 1 manquant: ${missingLevel1.length}`);
  console.log(`   Level 2 manquant: ${missingLevel2.length}`);
  console.log(`   Level 3 manquant: ${missingLevel3.length}`);
  console.log(`   Level 4 manquant (avec label): ${missingLevel4.length}`);
  console.log(`   Level 4 avec label mais sans traduction: ${hasLevel4ButNoLabel.length}\n`);

  // Afficher des exemples
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

  // Afficher toutes les hiérarchies incomplètes avec détails
  console.log('📋 Toutes les hiérarchies incomplètes:');
  incomplete.forEach((h, index) => {
    console.log(`\n${index + 1}. ${h.genericArticleId}:`);
    console.log(`   Level 1: ${h.level1Label} ${h.level1LabelFr ? '✅' : '❌'}`);
    console.log(`   Level 2: ${h.level2Label} ${h.level2LabelFr ? '✅' : '❌'}`);
    console.log(`   Level 3: ${h.level3Label} ${h.level3LabelFr ? '✅' : '❌'}`);
    if (h.level4Label) {
      console.log(`   Level 4: ${h.level4Label} ${h.level4LabelFr ? '✅' : '❌'}`);
    } else {
      console.log(`   Level 4: (pas de level4)`);
    }
  });

  // Vérifier si ce sont des labels uniques qui n'ont pas été traduits
  const uniqueLevel1Labels = [...new Set(missingLevel1.map(h => h.level1Label))];
  const uniqueLevel2Labels = [...new Set(missingLevel2.map(h => h.level2Label))];
  const uniqueLevel3Labels = [...new Set(missingLevel3.map(h => h.level3Label))];
  const uniqueLevel4Labels = [...new Set(missingLevel4.map(h => h.level4Label!))];

  console.log('\n📊 Labels uniques non traduits:');
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

analyzeRemainingHierarchies().catch(console.error);























