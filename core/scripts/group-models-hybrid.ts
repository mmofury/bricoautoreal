import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Model {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
}

interface ManufacturerEntry {
  manufacturerId: number;
  manufacturerName: string;
  countModels: number;
  models: Model[];
}

interface ModelsFile {
  countManufacturers: number;
  processed: number;
  results: ManufacturerEntry[];
}

interface ModelGroup {
  manufacturerId: number;
  manufacturerName: string;
  groupKey: string;
  displayName: string;
  confidence: 'rule' | 'ai';
  models: Model[];
}

interface OutputFile {
  generatedAt: string;
  manufacturer: string;
  countGroups: number;
  groups: ModelGroup[];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const modelsFile = path.join(compatibilityDir, 'models.json');

/**
 * Extraction intelligente du préfixe de base d'un modèle
 */
function extractModelBase(modelName: string): string | null {
  // Enlever les parenthèses et leur contenu, puis normaliser
  const cleaned = modelName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const upperName = cleaned.toUpperCase();
  
  // Pattern 0: Noms qui commencent par "/" (ex: "/8" → "/8")
  if (upperName.startsWith('/')) {
    const slashMatch = upperName.match(/^(\/\d+)/);
    if (slashMatch) {
      return slashMatch[1];
    }
    // Sinon, prendre tout jusqu'au premier espace
    const slashWordMatch = upperName.match(/^(\/[A-Z0-9]+)/);
    if (slashWordMatch) {
      return slashWordMatch[1];
    }
  }
  
  // Mots génériques qui nécessitent le mot suivant
  const genericWords = ['CLASSE', 'SERIE', 'SERIES', 'CLASS'];
  
  // Pattern 1: Mot générique + mot suivant (ex: "CLASSE S", "CLASSE C")
  for (const generic of genericWords) {
    if (upperName.startsWith(generic + ' ')) {
      const rest = upperName.substring(generic.length + 1).trim();
      const nextWordMatch = rest.match(/^([A-Z0-9]+)/);
      if (nextWordMatch) {
        return `${generic} ${nextWordMatch[1]}`;
      }
    }
  }
  
  // Pattern 2: Nombre pur ou lettre(s)+nombre
  const numericMatch = upperName.match(/^(\d+|[A-Z]?\d+)$/);
  if (numericMatch) {
    return numericMatch[1];
  }
  
  // Pattern 3: Premier mot complet (inclut les noms commençant par caractères spéciaux)
  const firstWordMatch = upperName.match(/^([A-Z0-9\/][A-Z0-9\/]*)/);
  if (firstWordMatch) {
    return firstWordMatch[1];
  }
  
  // Pattern 4: Nombre au début
  const leadingNumberMatch = upperName.match(/^(\d+)/);
  if (leadingNumberMatch) {
    return leadingNumberMatch[1];
  }
  
  return null;
}

/**
 * Groupement déterministe basé sur des règles strictes
 * Retourne les modèles groupés et ceux qui restent à grouper avec l'IA
 */
function groupWithRules(models: Model[]): { grouped: Map<string, ModelGroup>; ungrouped: Model[] } {
  const grouped = new Map<string, ModelGroup>();
  const groupedModelIds = new Set<number>();
  
  // Phase 1: Groupement par préfixe exact
  for (const model of models) {
    const base = extractModelBase(model.modelName);
    if (!base) {
      continue; // On laisse à l'IA
    }
    
    if (!grouped.has(base)) {
      grouped.set(base, {
        manufacturerId: 0,
        manufacturerName: '',
        groupKey: base,
        displayName: base,
        confidence: 'rule',
        models: [],
      });
    }
    
    grouped.get(base)!.models.push(model);
    groupedModelIds.add(model.modelId);
  }
  
  // Modèles qui n'ont pas pu être groupés avec les règles
  const ungrouped = models.filter((m) => !groupedModelIds.has(m.modelId));
  
  return { grouped, ungrouped };
}

/**
 * Utilise l'IA uniquement pour les modèles ambigus
 */
async function groupWithAI(models: Model[], manufacturerName: string): Promise<ModelGroup[]> {
  if (models.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY doit être défini dans les variables d\'environnement');
  }

  // Utiliser gpt-4o-mini qui est beaucoup moins cher ($0.15/M input, $0.60/M output)
  // Pour les cas ambigus, c'est suffisant
  const modelsData = models.map((m) => ({
    modelId: m.modelId,
    modelName: m.modelName,
    years: {
      from: m.modelYearFrom,
      to: m.modelYearTo,
    },
  }));

  const prompt = `Tu es un expert automobile. Pour ${manufacturerName}, groupe ces ${models.length} modèles ambigus par famille.

RÈGLES STRICTES :
1. Extraire le préfixe principal : "CLASSE S" ≠ "CLASSE C" (différents groupes)
2. "307" ≠ "504" (différents groupes)
3. Variantes (Coupé, Break, SW) → même groupe que le modèle de base
4. Codes entre parenthèses → IGNORER

Format JSON :
{
  "groups": [
    {
      "groupKey": "PREFIXE_EN_MAJUSCULES",
      "displayName": "Nom affichable",
      "modelIds": [123, 456]
    }
  ]
}

Modèles à grouper :
${JSON.stringify(modelsData, null, 2)}

Réponds uniquement en JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Beaucoup moins cher
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en classification de modèles automobiles. Réponds uniquement en JSON valide.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Plus déterministe
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API OpenAI: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const aiResponse: { groups: Array<{ groupKey: string; displayName: string; modelIds: number[] }> } = JSON.parse(content);

  const modelsMap = new Map(models.map((m) => [m.modelId, m]));
  const groups: ModelGroup[] = [];

  for (const aiGroup of aiResponse.groups) {
    const groupModels: Model[] = [];
    for (const modelId of aiGroup.modelIds) {
      const model = modelsMap.get(modelId);
      if (model) {
        groupModels.push(model);
      }
    }

    if (groupModels.length > 0) {
      groups.push({
        manufacturerId: 0,
        manufacturerName,
        groupKey: aiGroup.groupKey.toUpperCase(),
        displayName: aiGroup.displayName,
        confidence: 'ai',
        models: groupModels.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr')),
      });
    }
  }

  return groups;
}

/**
 * Valide et corrige les groupes
 */
function validateAndFixGroups(groups: ModelGroup[], manufacturerName: string): ModelGroup[] {
  const fixedGroups = new Map<string, ModelGroup>();
  const misplaced: Array<{ model: Model; correctBase: string }> = [];

  // Vérifier chaque groupe
  for (const group of groups) {
    const groupBase = extractModelBase(group.groupKey);
    
    for (const model of group.models) {
      const modelBase = extractModelBase(model.modelName);
      
      if (!modelBase || modelBase !== groupBase) {
        // Modèle mal placé
        if (modelBase) {
          misplaced.push({ model, correctBase: modelBase });
        }
      } else {
        // Modèle correct, l'ajouter au bon groupe
        if (!fixedGroups.has(groupBase!)) {
          fixedGroups.set(groupBase!, {
            manufacturerId: group.manufacturerId,
            manufacturerName: group.manufacturerName,
            groupKey: groupBase!,
            displayName: group.displayName,
            confidence: group.confidence,
            models: [],
          });
        }
        fixedGroups.get(groupBase!)!.models.push(model);
      }
    }
  }

  // Réassigner les modèles mal placés
  for (const { model, correctBase } of misplaced) {
    if (!fixedGroups.has(correctBase)) {
      fixedGroups.set(correctBase, {
        manufacturerId: groups[0]?.manufacturerId || 0,
        manufacturerName,
        groupKey: correctBase,
        displayName: correctBase,
        confidence: 'rule',
        models: [],
      });
    }
    // Vérifier qu'on n'ajoute pas de doublon
    const existingGroup = fixedGroups.get(correctBase)!;
    if (!existingGroup.models.find((m) => m.modelId === model.modelId)) {
      existingGroup.models.push(model);
    }
  }

  // Trier les modèles dans chaque groupe
  for (const group of fixedGroups.values()) {
    group.models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));
  }

  return Array.from(fixedGroups.values());
}

async function main() {
  const manufacturerName = process.argv[2]?.toUpperCase() || 'PEUGEOT';
  
  console.log(`📖 Lecture du fichier models.json...`);
  const modelsData: ModelsFile = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'));

  const manufacturerEntry = modelsData.results.find((r) => 
    r.manufacturerName.toUpperCase() === manufacturerName.toUpperCase()
  );

  if (!manufacturerEntry) {
    throw new Error(`${manufacturerName} non trouvé dans models.json`);
  }

  console.log(`✅ ${manufacturerEntry.manufacturerName} trouvé: ${manufacturerEntry.countModels} modèles`);

  // PHASE 1: Groupement déterministe (règles)
  console.log(`\n🔧 Phase 1: Groupement déterministe...`);
  const { grouped, ungrouped } = groupWithRules(manufacturerEntry.models);
  console.log(`   ✅ ${grouped.size} groupes créés (${manufacturerEntry.models.length - ungrouped.length} modèles)`);
  console.log(`   ⚠️  ${ungrouped.length} modèles ambigus à traiter avec l'IA`);

  // PHASE 2: IA uniquement pour les ambigus
  let aiGroups: ModelGroup[] = [];
  if (ungrouped.length > 0) {
    console.log(`\n🤖 Phase 2: Traitement IA des cas ambigus...`);
    aiGroups = await groupWithAI(ungrouped, manufacturerEntry.manufacturerName);
    console.log(`   ✅ ${aiGroups.length} groupes créés avec l'IA`);
  }

  // PHASE 3: Fusion et validation
  console.log(`\n🔍 Phase 3: Validation et correction...`);
  const allGroups: ModelGroup[] = [
    ...Array.from(grouped.values()),
    ...aiGroups,
  ];

  // Remplir manufacturerId
  for (const group of allGroups) {
    group.manufacturerId = manufacturerEntry.manufacturerId;
    group.manufacturerName = manufacturerEntry.manufacturerName;
  }

  // Validation finale - on passe tous les modèles pour s'assurer qu'aucun n'est oublié
  const validatedGroups = validateAndFixGroups(allGroups, manufacturerEntry.manufacturerName);

  // Compter les modèles pour vérifier
  const totalGrouped = validatedGroups.reduce((sum, g) => sum + g.models.length, 0);
  const groupedModelIds = new Set(validatedGroups.flatMap((g) => g.models.map((m) => m.modelId)));
  const missingModels = manufacturerEntry.models.filter((m) => !groupedModelIds.has(m.modelId));
  
  if (missingModels.length > 0) {
    console.warn(`   ⚠️  ${missingModels.length} modèle(s) non groupé(s) :`);
    
    // Grouper les modèles orphelins par préfixe
    const orphanGroups = new Map<string, Model[]>();
    for (const model of missingModels) {
      const base = extractModelBase(model.modelName);
      if (base) {
        if (!orphanGroups.has(base)) {
          orphanGroups.set(base, []);
        }
        orphanGroups.get(base)!.push(model);
      } else {
        // Si on ne peut pas extraire de base, créer un groupe avec le nom complet
        const fallbackBase = model.modelName.toUpperCase().split(/\s+/)[0] || model.modelName.toUpperCase();
        if (!orphanGroups.has(fallbackBase)) {
          orphanGroups.set(fallbackBase, []);
        }
        orphanGroups.get(fallbackBase)!.push(model);
      }
    }
    
    // Créer les groupes pour les orphelins
    for (const [base, models] of orphanGroups.entries()) {
      const orphanGroup: ModelGroup = {
        manufacturerId: manufacturerEntry.manufacturerId,
        manufacturerName: manufacturerEntry.manufacturerName,
        groupKey: base,
        displayName: base,
        confidence: 'rule',
        models: models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr')),
      };
      validatedGroups.push(orphanGroup);
      console.log(`   ✅ Groupe créé "${base}" pour ${models.length} modèle(s) orphelin(s)`);
    }
  }
  
  const finalTotal = validatedGroups.reduce((sum, g) => sum + g.models.length, 0);
  if (finalTotal === manufacturerEntry.countModels) {
    console.log(`   ✅ Tous les ${finalTotal} modèles sont groupés`);
  } else {
    console.warn(`   ⚠️  ${finalTotal}/${manufacturerEntry.countModels} modèles groupés`);
  }

  const outputFile = path.join(compatibilityDir, `model-groups-hybrid-${manufacturerEntry.manufacturerName.toLowerCase().replace(/\s+/g, '-')}.json`);

  const output: OutputFile = {
    generatedAt: new Date().toISOString(),
    manufacturer: manufacturerEntry.manufacturerName,
    countGroups: validatedGroups.length,
    groups: validatedGroups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
  };

  console.log(`\n💾 Écriture dans ${outputFile}...`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ Terminé !`);
  console.log(`   - Constructeur: ${output.manufacturer}`);
  console.log(`   - Modèles: ${manufacturerEntry.countModels}`);
  console.log(`   - Groupes créés: ${output.countGroups}`);
  console.log(`   - Groupes règles: ${grouped.size}`);
  console.log(`   - Groupes IA: ${aiGroups.length}`);
  console.log(`   - Fichier: ${outputFile}`);
}

main().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});

