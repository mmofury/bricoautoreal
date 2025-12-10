// Script pour traduire uniquement les labels manquants
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: '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',
});

async function translateMissingOnly() {
  console.log('🇫🇷 Traduction des labels manquants uniquement...\n');

  // Récupérer les labels manquants par niveau
  const missingLevel2 = await prisma.interCarsHierarchy.findMany({
    where: {
      level2LabelFr: null,
    },
    select: { level2Label: true, level2Id: true },
  });

  const missingLevel3 = await prisma.interCarsHierarchy.findMany({
    where: {
      level3LabelFr: null,
    },
    select: { level3Label: true, level3Id: true },
  });

  const missingLevel4 = await prisma.interCarsHierarchy.findMany({
    where: {
      level4LabelFr: null,
      level4Label: { not: null },
    },
    select: { level4Label: true, level4Id: true },
  });

  // Dédupliquer
  const uniqueLevel2 = new Map<string, string>();
  missingLevel2.forEach(item => {
    if (!uniqueLevel2.has(item.level2Label)) {
      uniqueLevel2.set(item.level2Label, item.level2Id);
    }
  });

  const uniqueLevel3 = new Map<string, string>();
  missingLevel3.forEach(item => {
    if (!uniqueLevel3.has(item.level3Label)) {
      uniqueLevel3.set(item.level3Label, item.level3Id);
    }
  });

  const uniqueLevel4 = new Map<string, string>();
  missingLevel4.forEach(item => {
    if (item.level4Label && !uniqueLevel4.has(item.level4Label)) {
      uniqueLevel4.set(item.level4Label, item.level4Id!);
    }
  });

  console.log(`📦 Labels manquants à traduire:`);
  console.log(`   Level 2: ${uniqueLevel2.size} labels uniques`);
  console.log(`   Level 3: ${uniqueLevel3.size} labels uniques`);
  console.log(`   Level 4: ${uniqueLevel4.size} labels uniques\n`);

  // Fonction pour traduire un batch
  const translateBatch = async (labels: string[], level: string) => {
    if (labels.length === 0) return new Map<string, string>();

    const prompt = `Tu es un expert en pièces automobiles. Traduis ces termes techniques de pièces auto de l'anglais vers le français avec PRÉCISION ABSOLUE.

RÈGLES STRICTES:
1. Traduis CHAQUE terme COMPLET, pas juste un mot
2. Conserve EXACTEMENT la structure originale (virgules, ordre des mots)
3. Réponds UNIQUEMENT avec les traductions séparées par des virgules, dans le même ordre
4. Pas d'explication, pas de guillemets, juste les traductions

Termes à traduire: ${labels.join(', ')}

Traductions:`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en traduction de termes techniques automobiles français. Tu traduis chaque terme COMPLET avec précision en conservant la structure originale.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const translations = response.choices[0]?.message?.content
        ?.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0) || [];

      const translationMap = new Map<string, string>();
      for (let i = 0; i < Math.min(labels.length, translations.length); i++) {
        let cleanTranslation = translations[i].replace(/^["']|["']$/g, '').trim();
        translationMap.set(labels[i], cleanTranslation);
      }

      return translationMap;
    } catch (error: any) {
      console.error(`   ❌ Erreur traduction ${level}: ${error.message}`);
      return new Map<string, string>();
    }
  };

  const batchSize = 15;
  let translated = 0;

  // Traduire Level 2
  if (uniqueLevel2.size > 0) {
    console.log('2️⃣  Traduction Level 2...');
    const labels = Array.from(uniqueLevel2.keys());
    for (let i = 0; i < labels.length; i += batchSize) {
      const batch = labels.slice(i, i + batchSize);
      const translations = await translateBatch(batch, 'Level 2');

      for (const label of batch) {
        const translation = translations.get(label);
        if (translation) {
          const level2Id = uniqueLevel2.get(label)!;
          await prisma.interCarsHierarchy.updateMany({
            where: { level2Id },
            data: { level2LabelFr: translation },
          });
          translated++;
        }
      }

      console.log(`   ${Math.min(i + batchSize, labels.length)}/${labels.length} traités`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Traduire Level 3
  if (uniqueLevel3.size > 0) {
    console.log('\n3️⃣  Traduction Level 3...');
    const labels = Array.from(uniqueLevel3.keys());
    for (let i = 0; i < labels.length; i += batchSize) {
      const batch = labels.slice(i, i + batchSize);
      const translations = await translateBatch(batch, 'Level 3');

      for (const label of batch) {
        const translation = translations.get(label);
        if (translation) {
          const level3Id = uniqueLevel3.get(label)!;
          await prisma.interCarsHierarchy.updateMany({
            where: { level3Id },
            data: { level3LabelFr: translation },
          });
          translated++;
        }
      }

      console.log(`   ${Math.min(i + batchSize, labels.length)}/${labels.length} traités`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Traduire Level 4
  if (uniqueLevel4.size > 0) {
    console.log('\n4️⃣  Traduction Level 4...');
    const labels = Array.from(uniqueLevel4.keys());
    for (let i = 0; i < labels.length; i += batchSize) {
      const batch = labels.slice(i, i + batchSize);
      const translations = await translateBatch(batch, 'Level 4');

      for (const label of batch) {
        const translation = translations.get(label);
        if (translation) {
          const level4Id = uniqueLevel4.get(label)!;
          await prisma.interCarsHierarchy.updateMany({
            where: { level4Id },
            data: { level4LabelFr: translation },
          });
          translated++;
        }
      }

      console.log(`   ${Math.min(i + batchSize, labels.length)}/${labels.length} traités`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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

  console.log('\n📊 Résultats finaux:');
  console.log(`   Labels traduits: ${translated}`);
  console.log(`   Total hiérarchies avec traductions: ${withTranslations} / ${totalHierarchies}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

translateMissingOnly().catch(console.error);

