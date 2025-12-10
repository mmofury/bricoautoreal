// Script pour traduire les catégories InterCars en français avec OpenAI
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: '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',
});

async function translateInterCarsToFrench() {
  console.log('🇫🇷 Retraduction complète des catégories InterCars en français...\n');

  // Récupérer TOUS les labels uniques par niveau (même ceux déjà traduits pour les retraduire)
  console.log('📦 Récupération de tous les labels uniques à traduire...\n');

  // Level 1 - Utiliser groupBy pour obtenir les labels uniques
  const level1Groups = await prisma.interCarsHierarchy.groupBy({
    by: ['level1Label', 'level1Id'],
  });
  const level1Labels = level1Groups.map(g => ({ level1Label: g.level1Label, level1Id: g.level1Id }));

  // Level 2
  const level2Groups = await prisma.interCarsHierarchy.groupBy({
    by: ['level2Label', 'level2Id'],
  });
  const level2Labels = level2Groups.map(g => ({ level2Label: g.level2Label, level2Id: g.level2Id }));

  // Level 3
  const level3Groups = await prisma.interCarsHierarchy.groupBy({
    by: ['level3Label', 'level3Id'],
  });
  const level3Labels = level3Groups.map(g => ({ level3Label: g.level3Label, level3Id: g.level3Id }));

  // Level 4
  const level4Groups = await prisma.interCarsHierarchy.groupBy({
    by: ['level4Label', 'level4Id'],
    where: { level4Label: { not: null } },
  });
  const level4Labels = level4Groups
    .filter(g => g.level4Label)
    .map(g => ({ level4Label: g.level4Label!, level4Id: g.level4Id! }));

  console.log(`   Level 1: ${level1Labels.length} labels uniques`);
  console.log(`   Level 2: ${level2Labels.length} labels uniques`);
  console.log(`   Level 3: ${level3Labels.length} labels uniques`);
  console.log(`   Level 4: ${level4Labels.length} labels uniques\n`);

  let translated = 0;
  let errors = 0;

  // Fonction pour traduire un batch de labels
  const translateBatch = async (labels: string[], level: string) => {
    if (labels.length === 0) return new Map<string, string>();

    const prompt = `Tu es un expert en pièces automobiles. Traduis ces termes techniques de pièces auto de l'anglais vers le français avec PRÉCISION ABSOLUE.

RÈGLES STRICTES:
1. Traduis CHAQUE terme COMPLET, pas juste un mot
2. Conserve EXACTEMENT la structure originale (virgules, ordre des mots)
3. Traductions correctes:
   - "Seal, oil filter" → "Joint, filtre à huile" (PAS "Ralentisseur")
   - "Housing, oil filter" → "Boîtier, filtre à huile" (PAS "Filtres")
   - "Gasket, oil filter housing" → "Joint, boîtier de filtre à huile"
   - "Seal Ring, oil drain plug" → "Bague d'étanchéité, bouchon de vidange d'huile" (PAS "différentiel")
   - "Cap, oil filter housing" → "Bouchon, boîtier de filtre à huile"
4. Réponds UNIQUEMENT avec les traductions séparées par des virgules, dans le même ordre
5. Pas d'explication, pas de guillemets, juste les traductions

Termes à traduire: ${labels.join(', ')}

Traductions:`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Modèle plus précis mais économique
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en traduction de termes techniques automobiles français. Tu traduis chaque terme COMPLET avec précision en conservant la structure originale. Tu ne traduis JAMAIS juste un mot si le terme en contient plusieurs.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.1, // Très déterministe
      });

      const translations = response.choices[0]?.message?.content
        ?.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0) || [];

      const translationMap = new Map<string, string>();
      for (let i = 0; i < Math.min(labels.length, translations.length); i++) {
        // Nettoyer la traduction (enlever les guillemets si présents)
        let cleanTranslation = translations[i].replace(/^["']|["']$/g, '').trim();
        translationMap.set(labels[i], cleanTranslation);
      }

      return translationMap;
    } catch (error: any) {
      console.error(`   ❌ Erreur traduction ${level}: ${error.message}`);
      return new Map<string, string>();
    }
  };

  // Traduire Level 1 par batch de 15 (batch plus petit pour plus de précision)
  console.log('1️⃣  Retraduction Level 1...');
  const batchSize = 15;
  for (let i = 0; i < level1Labels.length; i += batchSize) {
    const batch = level1Labels.slice(i, i + batchSize);
    const labels = batch.map(l => l.level1Label);
    const translations = await translateBatch(labels, 'Level 1');

    for (const label of batch) {
      const translation = translations.get(label.level1Label);
      if (translation) {
        await prisma.interCarsHierarchy.updateMany({
          where: { level1Id: label.level1Id },
          data: { level1LabelFr: translation },
        });
        translated++;
      }
    }

    console.log(`   ${Math.min(i + batchSize, level1Labels.length)}/${level1Labels.length} traités`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pause pour éviter les limites
  }

  // Traduire Level 2
  console.log('\n2️⃣  Retraduction Level 2...');
  for (let i = 0; i < level2Labels.length; i += batchSize) {
    const batch = level2Labels.slice(i, i + batchSize);
    const labels = batch.map(l => l.level2Label);
    const translations = await translateBatch(labels, 'Level 2');

    for (const label of batch) {
      const translation = translations.get(label.level2Label);
      if (translation) {
        await prisma.interCarsHierarchy.updateMany({
          where: { level2Id: label.level2Id },
          data: { level2LabelFr: translation },
        });
        translated++;
      }
    }

    console.log(`   ${Math.min(i + batchSize, level2Labels.length)}/${level2Labels.length} traités`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Traduire Level 3
  console.log('\n3️⃣  Retraduction Level 3...');
  for (let i = 0; i < level3Labels.length; i += batchSize) {
    const batch = level3Labels.slice(i, i + batchSize);
    const labels = batch.map(l => l.level3Label);
    const translations = await translateBatch(labels, 'Level 3');

    for (const label of batch) {
      const translation = translations.get(label.level3Label);
      if (translation) {
        await prisma.interCarsHierarchy.updateMany({
          where: { level3Id: label.level3Id },
          data: { level3LabelFr: translation },
        });
        translated++;
      }
    }

    console.log(`   ${Math.min(i + batchSize, level3Labels.length)}/${level3Labels.length} traités`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Traduire Level 4
  console.log('\n4️⃣  Retraduction Level 4...');
  for (let i = 0; i < level4Labels.length; i += batchSize) {
    const batch = level4Labels.slice(i, i + batchSize);
    const labels = batch.map(l => l.level4Label!).filter(l => l);
    const translations = await translateBatch(labels, 'Level 4');

    for (const label of batch) {
      if (!label.level4Label) continue;
      const translation = translations.get(label.level4Label);
      if (translation) {
        await prisma.interCarsHierarchy.updateMany({
          where: { level4Id: label.level4Id },
          data: { level4LabelFr: translation },
        });
        translated++;
      }
    }

    console.log(`   ${Math.min(i + batchSize, level4Labels.length)}/${level4Labels.length} traités`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Statistiques finales
  const totalHierarchies = await prisma.interCarsHierarchy.count();
  const withTranslations = await prisma.interCarsHierarchy.count({
    where: {
      level1LabelFr: { not: null },
      level2LabelFr: { not: null },
      level3LabelFr: { not: null },
    },
  });

  console.log('📊 Résultats finaux:');
  console.log(`   Hiérarchies traduites: ${translated}`);
  console.log(`   Erreurs: ${errors}`);
  console.log(`   Total hiérarchies avec traductions: ${withTranslations} / ${totalHierarchies}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

translateInterCarsToFrench().catch(console.error);

