import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Génère des images avec DALL-E pour les catégories level 2
 */
async function generateAIImagesForCategories() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY doit être défini dans les variables d\'environnement');
  }

  console.log('🚀 Début de la génération d\'images IA pour les catégories level 2...\n');

  // Récupérer toutes les catégories level 2 uniques
  const hierarchies = await prisma.interCarsHierarchy.findMany({
    select: {
      level2Id: true,
      level2Label: true,
      level2LabelFr: true,
    },
    distinct: ['level2Id'],
  });

  // Récupérer les catégories qui ont déjà des images
  const existingImages = await prisma.interCarsLevel2Image.findMany({
    where: {
      imageUrl: {
        not: null,
      },
    },
    select: {
      level2Id: true,
    },
  });

  const existingLevel2Ids = new Set(existingImages.map(img => img.level2Id));

  // Filtrer pour ne garder que celles sans images
  const categoriesWithoutImages = hierarchies.filter(h => !existingLevel2Ids.has(h.level2Id));

  console.log(`📦 Trouvé ${categoriesWithoutImages.length} catégories sans images\n`);

  let processed = 0;
  let success = 0;
  let errors = 0;

  // Traiter par batch pour éviter de surcharger l'API
  const batchSize = 5; // DALL-E a des limites de rate
  const delayBetweenBatches = 2000; // 2 secondes entre les batches

  for (let i = 0; i < categoriesWithoutImages.length; i += batchSize) {
    const batch = categoriesWithoutImages.slice(i, i + batchSize);
    
    console.log(`📦 Traitement du batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(categoriesWithoutImages.length / batchSize)}...`);

    await Promise.all(
      batch.map(async (category) => {
        try {
          const categoryName = category.level2LabelFr || category.level2Label;
          
          // Créer un prompt pour DALL-E
          const prompt = `Professional product photography of an automotive spare part: ${categoryName}. Clean white background, high quality, detailed, realistic, automotive parts catalog style, 135x90 aspect ratio`;

          console.log(`   🎨 Génération pour: ${categoryName}...`);

          // Générer l'image avec DALL-E
          const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            size: '1024x1024', // DALL-E 3 ne supporte que 1024x1024
            quality: 'standard',
            n: 1,
          });

          const imageUrl = response.data[0]?.url;

          if (imageUrl) {
            // Stocker l'URL de l'image (upsert car l'entrée peut ne pas exister)
            await prisma.interCarsLevel2Image.upsert({
              where: {
                level2Id: category.level2Id,
              },
              update: {
                imageUrl: imageUrl,
                updatedAt: new Date(),
              },
              create: {
                level2Id: category.level2Id,
                imageUrl: imageUrl,
              },
            });

            success++;
            console.log(`   ✅ Image générée pour: ${categoryName}`);
          } else {
            throw new Error('Aucune URL retournée par DALL-E');
          }

          processed++;
        } catch (error: any) {
          errors++;
          console.error(`   ❌ Erreur pour ${category.level2Id}:`, error.message);
          
          // Si c'est une erreur de rate limit, attendre plus longtemps
          if (error.status === 429) {
            console.log('   ⏳ Rate limit atteint, attente de 60 secondes...');
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
        }
      })
    );

    // Délai entre les batches pour éviter les rate limits
    if (i + batchSize < categoriesWithoutImages.length) {
      console.log(`   ⏳ Attente de ${delayBetweenBatches}ms avant le prochain batch...\n`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }

    console.log(`   ✅ Batch terminé. Total: ${processed}/${categoriesWithoutImages.length} (${success} succès, ${errors} erreurs)\n`);
  }

  console.log('\n✨ Génération terminée !');
  console.log(`📊 Statistiques:`);
  console.log(`   - Total traité: ${processed}`);
  console.log(`   - Succès: ${success}`);
  console.log(`   - Erreurs: ${errors}`);
  console.log(`\n💰 Coût estimé: ~$${(success * 0.04).toFixed(2)} (DALL-E 3: $0.04/image)`);
}

// Exécuter le script
generateAIImagesForCategories()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

