// Script pour générer les URLs hiérarchiques InterCars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateInterCarsUrls() {
  console.log('🔗 Génération des URLs hiérarchiques InterCars...\n');

  // Récupérer toutes les hiérarchies
  const hierarchies = await prisma.interCarsHierarchy.findMany({
    orderBy: {
      level1Label: 'asc',
    },
  });

  console.log(`📦 ${hierarchies.length} hiérarchies à traiter\n`);

  let updated = 0;

  for (const hierarchy of hierarchies) {
    // Générer les slugs pour chaque niveau
    const level1Slug = slugify(hierarchy.level1Label);
    const level2Slug = slugify(hierarchy.level2Label);
    const level3Slug = slugify(hierarchy.level3Label);
    const level4Slug = hierarchy.level4Label ? slugify(hierarchy.level4Label) : null;

    // Générer l'URL complète
    let url: string;
    if (level4Slug) {
      // URL à 4 niveaux
      url = `/${level1Slug}/${level2Slug}/${level3Slug}/${level4Slug}`;
    } else {
      // URL à 3 niveaux
      url = `/${level1Slug}/${level2Slug}/${level3Slug}`;
    }

    // Mettre à jour la hiérarchie avec l'URL
    try {
      await prisma.interCarsHierarchy.update({
        where: { id: hierarchy.id },
        data: { url },
      });
      updated++;
    } catch (error: any) {
      console.error(`   ❌ Erreur pour ${hierarchy.genericArticleId}: ${error.message}`);
    }
  }

  console.log(`✅ ${updated} URLs générées\n`);

  // Afficher des exemples
  console.log('📋 Exemples d\'URLs générées:\n');
  
  const examples = await prisma.interCarsHierarchy.findMany({
    where: {
      level4Id: { not: null },
    },
    take: 5,
  });

  for (const example of examples) {
    console.log(`   ${example.genericArticleId}:`);
    console.log(`   ${example.url}`);
    console.log(`   ${example.level1Label} > ${example.level2Label} > ${example.level3Label} > ${example.level4Label}\n`);
  }

  // Statistiques
  const withUrl = await prisma.interCarsHierarchy.count({
    where: { url: { not: null } },
  });

  console.log(`📊 URLs générées: ${withUrl} / ${hierarchies.length}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

generateInterCarsUrls().catch(console.error);

























