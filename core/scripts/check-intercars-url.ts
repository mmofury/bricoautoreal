// Script pour vérifier une URL InterCars spécifique
// Utiliser: dotenv -e ../.env.local -- tsx scripts/check-intercars-url.ts "filtre-huile-moteur-rectangulaire-4"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseInterCarsUrl(slugSegments: string[]): { slug: string; level: number } | null {
  const fullSlug = slugSegments.join('/');
  const match = fullSlug.match(/^(.+)-([1-4])$/);
  
  if (!match) {
    return null;
  }

  const [, slug, levelStr] = match;
  const level = parseInt(levelStr, 10);

  if (isNaN(level) || level < 1 || level > 4) {
    return null;
  }

  return { slug, level };
}

async function checkUrl(slug: string) {
  console.log(`\n🔍 Vérification de l'URL: ${slug}\n`);

  const slugSegments = slug.split('/').filter(Boolean);
  console.log('Segments:', slugSegments);

  const parsed = parseInterCarsUrl(slugSegments);
  
  if (!parsed) {
    console.log('❌ Impossible de parser l\'URL');
    return;
  }

  console.log(`✅ Parsé: slug="${parsed.slug}", level=${parsed.level}\n`);

  const expectedUrl = `/pieces-detachees/${parsed.slug}-${parsed.level}`;
  console.log(`URL attendue: ${expectedUrl}\n`);

  // Chercher dans la base de données
  let hierarchy;
  switch (parsed.level) {
    case 1:
      hierarchy = await prisma.interCarsHierarchy.findFirst({
        where: { level1Url: expectedUrl },
      });
      break;
    case 2:
      hierarchy = await prisma.interCarsHierarchy.findFirst({
        where: { level2Url: expectedUrl },
      });
      break;
    case 3:
      hierarchy = await prisma.interCarsHierarchy.findFirst({
        where: { level3Url: expectedUrl },
      });
      break;
    case 4:
      hierarchy = await prisma.interCarsHierarchy.findFirst({
        where: { level4Url: expectedUrl },
      });
      break;
  }

  if (!hierarchy) {
    console.log('❌ Aucune hiérarchie trouvée avec cette URL\n');
    
    // Chercher avec un LIKE pour voir si quelque chose ressemble
    console.log('🔍 Recherche d\'URLs similaires...\n');
    const similar = await prisma.interCarsHierarchy.findMany({
      where: {
        OR: [
          { level1Url: { contains: parsed.slug } },
          { level2Url: { contains: parsed.slug } },
          { level3Url: { contains: parsed.slug } },
          { level4Url: { contains: parsed.slug } },
        ],
      },
      take: 5,
      select: {
        level1Url: true,
        level2Url: true,
        level3Url: true,
        level4Url: true,
        level1LabelFr: true,
        level2LabelFr: true,
        level3LabelFr: true,
        level4LabelFr: true,
      },
    });

    if (similar.length > 0) {
      console.log('URLs similaires trouvées:');
      similar.forEach((h, i) => {
        console.log(`\n${i + 1}.`);
        if (h.level1Url) console.log(`   Level 1: ${h.level1LabelFr} -> ${h.level1Url}`);
        if (h.level2Url) console.log(`   Level 2: ${h.level2LabelFr} -> ${h.level2Url}`);
        if (h.level3Url) console.log(`   Level 3: ${h.level3LabelFr} -> ${h.level3Url}`);
        if (h.level4Url) console.log(`   Level 4: ${h.level4LabelFr} -> ${h.level4Url}`);
      });
    } else {
      console.log('Aucune URL similaire trouvée');
    }
  } else {
    console.log('✅ Hiérarchie trouvée!\n');
    console.log(`Level ${parsed.level} Label:`, 
      parsed.level === 1 ? hierarchy.level1LabelFr :
      parsed.level === 2 ? hierarchy.level2LabelFr :
      parsed.level === 3 ? hierarchy.level3LabelFr :
      hierarchy.level4LabelFr
    );
  }
}

const slug = process.argv[2] || 'filtre-huile-moteur-rectangulaire-4';
checkUrl(slug)
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









