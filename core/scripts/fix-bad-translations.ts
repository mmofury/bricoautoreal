// Script pour corriger les mauvaises traductions
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: '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',
});

async function fixBadTranslations() {
  console.log('🔧 Correction des mauvaises traductions...\n');

  // Trouver les traductions suspectes (trop courtes, mots incorrects, etc.)
  const suspicious = await prisma.interCarsHierarchy.findMany({
    where: {
      OR: [
        { level3LabelFr: 'Ralentisseur' },
        { level3LabelFr: 'Filtres' },
        { level3LabelFr: 'Joint' },
        { level3LabelFr: 'Boîtier' },
        { level3LabelFr: 'différentiel' },
        { level4LabelFr: 'Ralentisseur' },
        { level4LabelFr: 'Filtres' },
        { level4LabelFr: 'Joint' },
        { level4LabelFr: 'Boîtier' },
        { level4LabelFr: 'différentiel' },
      ],
    },
  });

  console.log(`📦 ${suspicious.length} traductions suspectes trouvées\n`);

  for (const item of suspicious) {
    // Retraduire avec un prompt plus précis
    const labelsToRetranslate: { label: string; field: string }[] = [];

    if (item.level3LabelFr && ['Ralentisseur', 'Filtres', 'Joint', 'Boîtier', 'différentiel'].includes(item.level3LabelFr)) {
      labelsToRetranslate.push({ label: item.level3Label, field: 'level3LabelFr' });
    }
    if (item.level4LabelFr && ['Ralentisseur', 'Filtres', 'Joint', 'Boîtier', 'différentiel'].includes(item.level4LabelFr)) {
      labelsToRetranslate.push({ label: item.level4Label!, field: 'level4LabelFr' });
    }

    for (const { label, field } of labelsToRetranslate) {
      const prompt = `Traduis ce terme technique de pièce automobile de l'anglais vers le français avec PRÉCISION. Conserve la structure originale.

Terme: "${label}"

Traduction française (juste le terme traduit, rien d'autre):`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en traduction de termes techniques automobiles. Tu traduis avec précision en conservant la structure. Exemples: "Seal, oil filter" → "Joint, filtre à huile", "Housing" → "Boîtier", "Gasket" → "Joint", "Seal Ring" → "Bague d\'étanchéité".',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: 0.1,
        });

        const translation = response.choices[0]?.message?.content?.trim();
        if (translation) {
          await prisma.interCarsHierarchy.update({
            where: { id: item.id },
            data: { [field]: translation },
          });
          console.log(`   ✅ ${item.genericArticleId} - ${field}: "${item[field as keyof typeof item]}" → "${translation}"`);
        }
      } catch (error: any) {
        console.error(`   ❌ Erreur pour ${item.genericArticleId}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Terminé!');
}

fixBadTranslations().catch(console.error);

