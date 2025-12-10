// Script pour comparer ProductSample et ProductGroup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareSamplesVsGroups() {
  console.log('🔍 Comparaison entre ProductSample et ProductGroup...\n');

  // Compter ProductSample
  const totalSamples = await prisma.productSample.count();
  console.log(`📦 Total ProductSample: ${totalSamples}`);

  // Compter ProductGroup
  const totalGroups = await prisma.productGroup.count();
  console.log(`📦 Total ProductGroup: ${totalGroups}\n`);

  // Vérifier combien de ProductSample ont un csvId
  const samplesWithCsvId = await prisma.productSample.count({
    where: {
      csvId: {
        not: null,
      },
    },
  });
  console.log(`📋 ProductSample avec csvId: ${samplesWithCsvId}`);

  // Vérifier combien de ProductSample ont été traités (ont un ProductGroup correspondant)
  const samplesWithGroup = await prisma.productSample.findMany({
    where: {
      csvId: {
        not: null,
      },
    },
    select: {
      productName: true,
      csvId: true,
    },
  });

  const groupsByName = new Map<string, boolean>();
  const allGroups = await prisma.productGroup.findMany({
    select: {
      productName: true,
    },
  });

  allGroups.forEach(group => {
    groupsByName.set(group.productName, true);
  });

  let samplesMatched = 0;
  const unmatchedSamples: string[] = [];

  samplesWithGroup.forEach(sample => {
    if (groupsByName.has(sample.productName)) {
      samplesMatched++;
    } else {
      unmatchedSamples.push(sample.productName);
    }
  });

  console.log(`✅ ProductSample qui ont un ProductGroup correspondant: ${samplesMatched} / ${samplesWithGroup.length}`);
  console.log(`❌ ProductSample sans ProductGroup: ${unmatchedSamples.length}\n`);

  // Afficher quelques exemples de ProductSample sans ProductGroup
  if (unmatchedSamples.length > 0) {
    console.log('📋 Exemples de ProductSample sans ProductGroup (premiers 10):');
    unmatchedSamples.slice(0, 10).forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    if (unmatchedSamples.length > 10) {
      console.log(`   ... et ${unmatchedSamples.length - 10} autres`);
    }
    console.log('');
  }

  // Vérifier les ProductGroup qui n'ont pas de ProductSample correspondant
  const groupsWithoutSample: string[] = [];
  const allSampleNames = new Set<string>();
  const allSamples = await prisma.productSample.findMany({
    select: {
      productName: true,
    },
  });
  allSamples.forEach(sample => {
    allSampleNames.add(sample.productName);
  });

  allGroups.forEach(group => {
    if (!allSampleNames.has(group.productName)) {
      groupsWithoutSample.push(group.productName);
    }
  });

  console.log(`📦 ProductGroup sans ProductSample correspondant: ${groupsWithoutSample.length}`);
  if (groupsWithoutSample.length > 0 && groupsWithoutSample.length <= 20) {
    console.log('📋 Liste des ProductGroup sans ProductSample:');
    groupsWithoutSample.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
  } else if (groupsWithoutSample.length > 20) {
    console.log('📋 Exemples de ProductGroup sans ProductSample (premiers 10):');
    groupsWithoutSample.slice(0, 10).forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log(`   ... et ${groupsWithoutSample.length - 10} autres`);
  }

  // Statistiques sur les ProductGroup avec catégories
  console.log('\n📊 Statistiques ProductGroup:');
  const groupsWithCategories = await prisma.productGroup.count({
    where: {
      categories: {
        some: {},
      },
    },
  });
  console.log(`   Avec catégories: ${groupsWithCategories} / ${totalGroups}`);
  console.log(`   Sans catégories: ${totalGroups - groupsWithCategories} / ${totalGroups}`);

  await prisma.$disconnect();
}

compareSamplesVsGroups().catch(console.error);
























