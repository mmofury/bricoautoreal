// Script pour générer les URLs individuelles par niveau et la navigation hiérarchique
// Utiliser: dotenv -e ../.env.local -- tsx scripts/generate-intercars-level-urls.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateLevelUrl(labelFr: string | null, level: number): string | null {
  if (!labelFr) return null;
  const slug = slugify(labelFr);
  if (!slug) return null;
  return `/pieces-detachees/${slug}-${level}`;
}

interface NavigationChild {
  id: string;
  label: string;
  labelFr: string | null;
  url: string | null;
}

async function generateLevelUrlsAndNavigation() {
  console.log('🔗 Génération des URLs par niveau et navigation hiérarchique InterCars...\n');

  // Récupérer toutes les hiérarchies
  const hierarchies = await prisma.interCarsHierarchy.findMany({
    orderBy: {
      level1Label: 'asc',
    },
  });

  console.log(`📦 ${hierarchies.length} hiérarchies à traiter\n`);

  // Étape 1: Générer les URLs pour chaque niveau
  console.log('📝 Étape 1: Génération des URLs par niveau...\n');
  
  let updated = 0;
  for (const hierarchy of hierarchies) {
    const level1Url = generateLevelUrl(hierarchy.level1LabelFr, 1);
    const level2Url = generateLevelUrl(hierarchy.level2LabelFr, 2);
    const level3Url = generateLevelUrl(hierarchy.level3LabelFr, 3);
    const level4Url = hierarchy.level4LabelFr ? generateLevelUrl(hierarchy.level4LabelFr, 4) : null;

    try {
      await prisma.interCarsHierarchy.update({
        where: { id: hierarchy.id },
        data: {
          level1Url,
          level2Url,
          level3Url,
          level4Url,
        },
      });
      updated++;
      
      if (updated % 500 === 0) {
        console.log(`   ✅ ${updated} hiérarchies mises à jour...`);
      }
    } catch (error: any) {
      console.error(`   ❌ Erreur pour ${hierarchy.genericArticleId}: ${error.message}`);
    }
  }

  console.log(`✅ ${updated} URLs de niveaux générées\n`);

  // Étape 2: Construire la navigation hiérarchique
  console.log('🔗 Étape 2: Construction de la navigation hiérarchique...\n');

  // Construire les maps de navigation
  // Level 1 -> Level 2
  const level1ToLevel2 = new Map<string, Map<string, NavigationChild>>();
  // Level 2 -> Level 3
  const level2ToLevel3 = new Map<string, Map<string, NavigationChild>>();
  // Level 3 -> Level 4
  const level3ToLevel4 = new Map<string, Map<string, NavigationChild>>();

  for (const hierarchy of hierarchies) {
    // Navigation Level 1 -> Level 2
    if (!level1ToLevel2.has(hierarchy.level1Id)) {
      level1ToLevel2.set(hierarchy.level1Id, new Map());
    }
    const level2Map = level1ToLevel2.get(hierarchy.level1Id)!;
    if (!level2Map.has(hierarchy.level2Id)) {
      const level2Url = generateLevelUrl(hierarchy.level2LabelFr, 2);
      level2Map.set(hierarchy.level2Id, {
        id: hierarchy.level2Id,
        label: hierarchy.level2Label,
        labelFr: hierarchy.level2LabelFr,
        url: level2Url,
      });
    }

    // Navigation Level 2 -> Level 3
    if (!level2ToLevel3.has(hierarchy.level2Id)) {
      level2ToLevel3.set(hierarchy.level2Id, new Map());
    }
    const level3Map = level2ToLevel3.get(hierarchy.level2Id)!;
    if (!level3Map.has(hierarchy.level3Id)) {
      const level3Url = generateLevelUrl(hierarchy.level3LabelFr, 3);
      level3Map.set(hierarchy.level3Id, {
        id: hierarchy.level3Id,
        label: hierarchy.level3Label,
        labelFr: hierarchy.level3LabelFr,
        url: level3Url,
      });
    }

    // Navigation Level 3 -> Level 4 (si level4 existe)
    if (hierarchy.level4Id) {
      if (!level3ToLevel4.has(hierarchy.level3Id)) {
        level3ToLevel4.set(hierarchy.level3Id, new Map());
      }
      const level4Map = level3ToLevel4.get(hierarchy.level3Id)!;
      if (!level4Map.has(hierarchy.level4Id)) {
        const level4Url = generateLevelUrl(hierarchy.level4LabelFr, 4);
        level4Map.set(hierarchy.level4Id, {
          id: hierarchy.level4Id,
          label: hierarchy.level4Label!,
          labelFr: hierarchy.level4LabelFr,
          url: level4Url,
        });
      }
    }
  }

  console.log(`   📊 Navigation Level 1 -> Level 2: ${level1ToLevel2.size} parents`);
  console.log(`   📊 Navigation Level 2 -> Level 3: ${level2ToLevel3.size} parents`);
  console.log(`   📊 Navigation Level 3 -> Level 4: ${level3ToLevel4.size} parents\n`);

  // Étape 3: Mettre à jour les hiérarchies avec la navigation
  console.log('💾 Étape 3: Mise à jour des hiérarchies avec la navigation...\n');

  updated = 0;
  for (const hierarchy of hierarchies) {
    // Récupérer les enfants pour chaque niveau
    const childrenLevel2 = level1ToLevel2.get(hierarchy.level1Id)
      ? Array.from(level1ToLevel2.get(hierarchy.level1Id)!.values())
      : [];

    const childrenLevel3 = level2ToLevel3.get(hierarchy.level2Id)
      ? Array.from(level2ToLevel3.get(hierarchy.level2Id)!.values())
      : [];

    const childrenLevel4 = hierarchy.level3Id && level3ToLevel4.has(hierarchy.level3Id)
      ? Array.from(level3ToLevel4.get(hierarchy.level3Id)!.values())
      : [];

    try {
      await prisma.interCarsHierarchy.update({
        where: { id: hierarchy.id },
        data: {
          childrenLevel2: childrenLevel2.length > 0 ? JSON.stringify(childrenLevel2) : null,
          childrenLevel3: childrenLevel3.length > 0 ? JSON.stringify(childrenLevel3) : null,
          childrenLevel4: childrenLevel4.length > 0 ? JSON.stringify(childrenLevel4) : null,
        },
      });
      updated++;
      
      if (updated % 500 === 0) {
        console.log(`   ✅ ${updated} hiérarchies mises à jour avec navigation...`);
      }
    } catch (error: any) {
      console.error(`   ❌ Erreur pour ${hierarchy.genericArticleId}: ${error.message}`);
    }
  }

  console.log(`✅ ${updated} hiérarchies mises à jour avec navigation\n`);

  // Afficher des exemples
  console.log('📋 Exemples d\'URLs générées:\n');
  
  const examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level1Url: { not: null },
    },
    take: 3,
  });

  for (const example of examples) {
    console.log(`   ${example.genericArticleId}:`);
    console.log(`   Level 1: ${example.level1LabelFr} → ${example.level1Url}`);
    console.log(`   Level 2: ${example.level2LabelFr} → ${example.level2Url}`);
    console.log(`   Level 3: ${example.level3LabelFr} → ${example.level3Url}`);
    if (example.level4Url) {
      console.log(`   Level 4: ${example.level4LabelFr} → ${example.level4Url}`);
    }
    if (example.childrenLevel2) {
      try {
        const children = JSON.parse(example.childrenLevel2) as NavigationChild[];
        console.log(`   Navigation Level 1 → Level 2: ${children.length} enfants`);
      } catch (e) {
        // Ignore parse errors
      }
    }
    console.log('');
  }

  // Statistiques
  const withLevel1Url = await prisma.interCarsHierarchy.count({
    where: { level1Url: { not: null } },
  });
  const withLevel2Url = await prisma.interCarsHierarchy.count({
    where: { level2Url: { not: null } },
  });
  const withLevel3Url = await prisma.interCarsHierarchy.count({
    where: { level3Url: { not: null } },
  });
  const withLevel4Url = await prisma.interCarsHierarchy.count({
    where: { level4Url: { not: null } },
  });

  console.log(`📊 Statistiques:\n`);
  console.log(`   URLs Level 1: ${withLevel1Url} / ${hierarchies.length}`);
  console.log(`   URLs Level 2: ${withLevel2Url} / ${hierarchies.length}`);
  console.log(`   URLs Level 3: ${withLevel3Url} / ${hierarchies.length}`);
  console.log(`   URLs Level 4: ${withLevel4Url} / ${hierarchies.length}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

generateLevelUrlsAndNavigation().catch(console.error);

