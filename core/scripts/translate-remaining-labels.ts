// Script pour traduire les labels restants manquants
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: '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',
});

async function translateRemainingLabels() {
  console.log('🇫🇷 Traduction des labels restants manquants...\n');

  // Labels à traduire (identifiés par l'analyse)
  const labelsToTranslate = {
    level2: ['Lighting', 'Filters', 'Automotive chemicals'],
    level3: ['Hydraulic filter', 'Side mirror', 'Sleeve', 'Lighting', 'Clutch'],
    level4: ['Switch', 'Spring, throttle control linkage', 'Cutter', 'Clamp'],
  };

  // Fonction pour traduire un batch
  const translateBatch = async (labels: string[]) => {
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
        max_tokens: 500,
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
      console.error(`   ❌ Erreur traduction: ${error.message}`);
      return new Map<string, string>();
    }
  };

  let translated = 0;

  // Traduire Level 2
  if (labelsToTranslate.level2.length > 0) {
    console.log('2️⃣  Traduction Level 2...');
    const translations = await translateBatch(labelsToTranslate.level2);
    
    for (const label of labelsToTranslate.level2) {
      const translation = translations.get(label);
      if (translation) {
        const result = await prisma.interCarsHierarchy.updateMany({
          where: { level2Label: label },
          data: { level2LabelFr: translation },
        });
        translated += result.count;
        console.log(`   ✅ "${label}" → "${translation}" (${result.count} hiérarchies mises à jour)`);
      } else {
        console.log(`   ❌ Pas de traduction pour "${label}"`);
      }
    }
  }

  // Traduire Level 3
  if (labelsToTranslate.level3.length > 0) {
    console.log('\n3️⃣  Traduction Level 3...');
    const translations = await translateBatch(labelsToTranslate.level3);
    
    for (const label of labelsToTranslate.level3) {
      const translation = translations.get(label);
      if (translation) {
        const result = await prisma.interCarsHierarchy.updateMany({
          where: { level3Label: label },
          data: { level3LabelFr: translation },
        });
        translated += result.count;
        console.log(`   ✅ "${label}" → "${translation}" (${result.count} hiérarchies mises à jour)`);
      } else {
        console.log(`   ❌ Pas de traduction pour "${label}"`);
      }
    }
  }

  // Traduire Level 4
  if (labelsToTranslate.level4.length > 0) {
    console.log('\n4️⃣  Traduction Level 4...');
    const translations = await translateBatch(labelsToTranslate.level4);
    
    // Corrections manuelles pour les traductions incorrectes
    const corrections: Record<string, string> = {
      'Spring, throttle control linkage': 'Ressort, liaison de commande de gaz',
      'Cutter': 'Coupeur',
      'Clamp': 'Pince',
    };
    
    for (const label of labelsToTranslate.level4) {
      let translation = translations.get(label);
      // Appliquer la correction si nécessaire
      if (corrections[label]) {
        translation = corrections[label];
        console.log(`   🔧 Correction appliquée pour "${label}"`);
      }
      
      if (translation) {
        const result = await prisma.interCarsHierarchy.updateMany({
          where: { level4Label: label },
          data: { level4LabelFr: translation },
        });
        translated += result.count;
        console.log(`   ✅ "${label}" → "${translation}" (${result.count} hiérarchies mises à jour)`);
      } else {
        console.log(`   ❌ Pas de traduction pour "${label}"`);
      }
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
  console.log(`   Hiérarchies mises à jour: ${translated}`);
  console.log(`   Total hiérarchies avec traductions: ${withTranslations} / ${totalHierarchies}\n`);

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

translateRemainingLabels().catch(console.error);

