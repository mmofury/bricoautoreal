import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Génère et stocke les images des catégories level 2 dans la base de données
 */
async function generateLevel2CategoryImages() {
  console.log('🚀 Début de la génération des images pour les catégories level 2...\n');

  // Récupérer toutes les catégories level 2 uniques
  const level2Categories = await prisma.interCarsHierarchy.findMany({
    select: {
      level2Id: true,
      level2Label: true,
      level2LabelFr: true,
    },
    distinct: ['level2Id'],
  });

  console.log(`📦 Trouvé ${level2Categories.length} catégories level 2\n`);

  let processed = 0;
  let withImages = 0;
  let withoutImages = 0;

  // Utiliser une requête SQL brute pour être beaucoup plus rapide
  console.log(`🔄 Génération des images avec requête SQL optimisée...\n`);

  // Requête SQL pour récupérer la première image de chaque catégorie level 2
  const result = await prisma.$queryRaw<Array<{ level2Id: string; imageUrl: string | null }>>`
    SELECT DISTINCT
      h.level2_id as level2Id,
      (
        SELECT pi.image_url
        FROM products p
        INNER JOIN product_intercars_categories pic ON p.id = pic.product_id
        INNER JOIN intercars_categories ic ON pic.intercars_category_id = ic.id
        INNER JOIN intercars_hierarchy ih ON ic.hierarchy_id = ih.id
        INNER JOIN product_images pi ON p.id = pi.product_id
        WHERE ih.level2_id = h.level2_id
          AND pi.image_url IS NOT NULL
        ORDER BY p.id ASC
        LIMIT 1
      ) as imageUrl
    FROM intercars_hierarchy h
    WHERE h.level2_id IS NOT NULL
    GROUP BY h.level2_id
  `;

  console.log(`📊 ${result.length} catégories trouvées avec requête SQL\n`);

  // Traiter par batch pour les insertions
  const batchSize = 100;
  for (let i = 0; i < result.length; i += batchSize) {
    const batch = result.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (item) => {
        try {
          await prisma.interCarsLevel2Image.upsert({
            where: {
              level2Id: item.level2Id,
            },
            update: {
              imageUrl: item.imageUrl,
              updatedAt: new Date(),
            },
            create: {
              level2Id: item.level2Id,
              imageUrl: item.imageUrl,
            },
          });

          processed++;
          if (item.imageUrl) {
            withImages++;
          } else {
            withoutImages++;
          }
        } catch (error) {
          console.error(`❌ Erreur pour la catégorie ${item.level2Id}:`, error);
          processed++;
          withoutImages++;
        }
      })
    );

    console.log(`✅ ${Math.min(i + batchSize, result.length)}/${result.length} catégories traitées (${withImages} avec images, ${withoutImages} sans images)`);
  }

  console.log('\n✨ Génération terminée !');
  console.log(`📊 Statistiques:`);
  console.log(`   - Total traité: ${processed}`);
  console.log(`   - Avec images: ${withImages}`);
  console.log(`   - Sans images: ${withoutImages}`);
}

// Exécuter le script
generateLevel2CategoryImages()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

