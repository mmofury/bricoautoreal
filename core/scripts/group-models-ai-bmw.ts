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
  confidence: 'ai';
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
const outputFile = path.join(compatibilityDir, 'model-groups-ai-bmw.json');

/**
 * Appelle l'IA OpenAI pour grouper les modèles
 */
async function groupModelsWithAI(models: Model[], manufacturerName: string): Promise<ModelGroup[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY doit être défini dans les variables d\'environnement');
  }

  // Préparer les données pour l'IA
  const modelsData = models.map((m) => ({
    modelId: m.modelId,
    modelName: m.modelName,
    years: {
      from: m.modelYearFrom,
      to: m.modelYearTo,
    },
  }));

  const prompt = `Tu es un expert automobile BMW spécialisé dans le groupement de modèles.

Pour BMW, je dois regrouper TOUS les modèles par famille. TOUS les modèles DOIVENT être groupés, AUCUN ne doit rester seul.

RÈGLES CRITIQUES :
1. Les codes entre parenthèses comme (E86), (F25), (G20) sont des codes de PLATEFORME/GÉNÉRATION, pas des modèles différents
2. EXEMPLES BMW :
   - "1 (E81)", "1 (E87)", "1 (F20)", "1 (F21)", "1 Coupé (E82)", "1 Décapotable (E88)" → TOUS dans groupe "1" (Série 1)
   - "3 (E21)", "3 (E30)", "3 (E36)", "3 (E46)", "3 (E90)", "3 Touring (E91)", "3 Compact (E36)", "3 Décapotable (E46)" → TOUS dans groupe "3" (Série 3)
   - "Z4 Coupé (E86)", "Z4 Roadster (E85)", "Z4 Roadster (E89)", "Z4 Roadster (G29)" → TOUS dans groupe "Z4"
   - "X3 (E83)", "X3 (F25)", "X3 (G01)", "X3 Van (G01)" → TOUS dans groupe "X3"
   - "5 Touring (G31)", "5 Touring (G61)" → TOUS dans groupe "5" (Série 5)

3. Les variantes (Coupé, Roadster, Décapotable, Touring, Gran Coupe, etc.) sont dans le MÊME groupe que le modèle de base
4. Les différentes générations (codes E/F/G) sont dans le MÊME groupe
5. INTERDICTION ABSOLUE de créer des groupes génériques : "Classiques", "Autres", "Misc", "Divers", "Vintage", "Anciens", etc.
   - Chaque modèle DOIT être dans un groupe basé sur son NOM SPÉCIFIQUE
   - Exemple INTERDIT : regrouper "315", "319", "1502-2002" dans "Classiques" → FAUX
   - Exemple CORRECT : "315 A trois volumes", "315 Décapotable", "315 Roadster" → groupe "315"
   - Exemple CORRECT : "1502-2002 (E10)", "1502-2002 Décapotable" → groupe "1502-2002"
   - Exemple CORRECT : "2.5-3.2 Coupé" → groupe "2.5-3.2" (PAS "Classiques")
6. Si un modèle commence par un chiffre ou une lettre (ex: "1", "3", "X3", "Z4", "315", "1502-2002"), regroupe-le avec les autres modèles commençant de la même façon
7. Pour BMW : 
   - Séries numériques : 1, 2, 3, 4, 5, 6, 7, 8
   - Séries X : X1, X2, X3, X4, X5, X6, X7
   - Séries Z : Z1, Z3, Z4, Z8
   - Séries i : i3, i4, i8, iX

Format JSON strict (TOUS les modelIds doivent être dans un groupe) :
{
  "groups": [
    {
      "groupKey": "NOM_EN_MAJUSCULES_SANS_ESPACES",
      "displayName": "Nom d'affichage propre",
      "modelIds": [123, 456, 789]
    }
  ]
}

CRITIQUE : Chaque modelId de la liste DOIT apparaître dans EXACTEMENT UN groupe. 
- Compte le nombre total de modelIds dans ta réponse
- Il DOIT être égal au nombre de modèles dans la liste
- Si tu ne sais pas où mettre un modèle, mets-le dans le groupe qui semble le plus proche plutôt que de l'oublier
- Vérifie deux fois que tu as bien inclus TOUS les modelIds

Modèles BMW à grouper :
${JSON.stringify(modelsData, null, 2)}

Réponds UNIQUEMENT avec le JSON, sans texte, sans markdown, sans explications.`;

  console.log(`🤖 Appel à l'IA pour ${models.length} modèles...`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en classification de modèles automobiles. Réponds uniquement en JSON valide, sans markdown, sans texte supplémentaire.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API OpenAI: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parser la réponse JSON
  let aiResponse: { groups: Array<{ groupKey: string; displayName: string; modelIds: number[] }> };
  try {
    aiResponse = JSON.parse(content);
  } catch (e) {
    console.error('Réponse IA non-JSON:', content);
    throw new Error('Réponse IA invalide (pas de JSON)');
  }

  // Vérifier qu'il n'y a pas de groupes génériques interdits
  const forbiddenGroupNames = ['CLASSIQUE', 'CLASSIC', 'AUTRE', 'MISC', 'DIVERS', 'VINTAGE', 'ANCIEN', 'OLD', 'OTHER'];
  for (const aiGroup of aiResponse.groups) {
    const groupKeyUpper = aiGroup.groupKey.toUpperCase();
    const displayNameUpper = aiGroup.displayName.toUpperCase();
    
    if (forbiddenGroupNames.some((forbidden) => groupKeyUpper.includes(forbidden) || displayNameUpper.includes(forbidden))) {
      console.error(`❌ ERREUR : L'IA a créé un groupe générique interdit : "${aiGroup.displayName}" (${aiGroup.groupKey})`);
      console.error(`   Ce groupe contient ${aiGroup.modelIds.length} modèles qui doivent être regroupés par nom spécifique`);
      throw new Error(`L'IA a créé un groupe générique "${aiGroup.displayName}". Relance avec un prompt plus strict.`);
    }
  }

  // Construire les groupes avec les modèles complets
  const modelsMap = new Map(models.map((m) => [m.modelId, m]));
  const groups: ModelGroup[] = [];

  for (const aiGroup of aiResponse.groups) {
    const groupModels: Model[] = [];
    for (const modelId of aiGroup.modelIds) {
      const model = modelsMap.get(modelId);
      if (model) {
        groupModels.push(model);
      } else {
        console.warn(`⚠️  Modèle ${modelId} non trouvé dans la liste originale`);
      }
    }

    if (groupModels.length > 0) {
      groups.push({
        manufacturerId: 0, // Sera rempli après
        manufacturerName,
        groupKey: aiGroup.groupKey.toUpperCase(),
        displayName: aiGroup.displayName,
        confidence: 'ai',
        models: groupModels.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr')),
      });
    }
  }

  // Vérifier que tous les modèles sont dans un groupe
  const groupedModelIds = new Set(groups.flatMap((g) => g.models.map((m) => m.modelId)));
  const ungrouped = models.filter((m) => !groupedModelIds.has(m.modelId));
  
  if (ungrouped.length > 0) {
    console.warn(`⚠️  ${ungrouped.length} modèles non groupés par l'IA, post-traitement automatique...`);
    
    // Post-traitement : essayer de placer les modèles orphelins dans les groupes existants
    for (const orphan of ungrouped) {
      const modelName = orphan.modelName.toUpperCase();
      
      // Extraire le nom de base (avant le premier espace ou parenthèse)
      const baseMatch = modelName.match(/^(\d+|[XZ]?\d+|[IZ]\w*)/);
      if (!baseMatch) continue;
      
      const base = baseMatch[1];
      
      // Chercher un groupe existant qui correspond
      const matchingGroup = groups.find((g) => {
        const groupBase = g.groupKey.match(/^(\d+|[XZ]?\d+|[IZ]\w*)/)?.[1];
        return groupBase === base;
      });
      
      if (matchingGroup) {
        // Ajouter le modèle orphelin au groupe trouvé
        matchingGroup.models.push(orphan);
        matchingGroup.models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));
        console.log(`   ✅ "${orphan.modelName}" ajouté au groupe "${matchingGroup.displayName}"`);
      } else {
        // Créer un nouveau groupe pour ce modèle
        const newGroup: ModelGroup = {
          manufacturerId: 0,
          manufacturerName,
          groupKey: base,
          displayName: base,
          confidence: 'ai',
          models: [orphan],
        };
        groups.push(newGroup);
        console.log(`   ✅ Nouveau groupe créé "${base}" pour "${orphan.modelName}"`);
      }
    }
  }

  // Post-traitement : fusionner les groupes dupliqués (ex: "1" et "Série 1")
  const groupsToMerge = new Map<string, ModelGroup[]>();
  for (const group of groups) {
    const normalizedKey = group.groupKey.replace(/^SERIE\s*/i, '').trim();
    if (!groupsToMerge.has(normalizedKey)) {
      groupsToMerge.set(normalizedKey, []);
    }
    groupsToMerge.get(normalizedKey)!.push(group);
  }

  const mergedGroups: ModelGroup[] = [];
  for (const [baseKey, duplicateGroups] of groupsToMerge.entries()) {
    if (duplicateGroups.length === 1) {
      mergedGroups.push(duplicateGroups[0]);
    } else {
      // Fusionner les groupes
      const mainGroup = duplicateGroups[0];
      const allModels = new Map<number, Model>();
      
      for (const group of duplicateGroups) {
        for (const model of group.models) {
          allModels.set(model.modelId, model);
        }
      }

      mergedGroups.push({
        manufacturerId: mainGroup.manufacturerId,
        manufacturerName: mainGroup.manufacturerName,
        groupKey: baseKey.toUpperCase(),
        displayName: mainGroup.displayName.replace(/^Série\s+/i, '').trim() || baseKey,
        confidence: 'ai',
        models: Array.from(allModels.values()).sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr')),
      });
      
      if (duplicateGroups.length > 1) {
        console.log(`   🔀 Fusion de ${duplicateGroups.length} groupes "${baseKey}"`);
      }
    }
  }

  return mergedGroups;
}

async function main() {
  console.log('📖 Lecture du fichier models.json...');
  const modelsData: ModelsFile = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'));

  // Trouver BMW (manufacturerId peut varier, chercher par nom)
  const bmwEntry = modelsData.results.find((r) => 
    r.manufacturerName.toUpperCase() === 'BMW'
  );

  if (!bmwEntry) {
    throw new Error('BMW non trouvé dans models.json');
  }

  console.log(`✅ BMW trouvé: ${bmwEntry.countModels} modèles`);
  console.log(`\n📋 Modèles BMW:`);
  bmwEntry.models.slice(0, 10).forEach((m) => {
    console.log(`   - ${m.modelName} (${m.modelId})`);
  });
  if (bmwEntry.models.length > 10) {
    console.log(`   ... et ${bmwEntry.models.length - 10} autres`);
  }

  console.log(`\n🤖 Groupement avec IA...`);
  const groups = await groupModelsWithAI(bmwEntry.models, bmwEntry.manufacturerName);

  // Remplir le manufacturerId
  for (const group of groups) {
    group.manufacturerId = bmwEntry.manufacturerId;
  }

  const output: OutputFile = {
    generatedAt: new Date().toISOString(),
    manufacturer: bmwEntry.manufacturerName,
    countGroups: groups.length,
    groups: groups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
  };

  console.log(`\n💾 Écriture dans ${outputFile}...`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ Terminé !`);
  console.log(`   - Constructeur: ${output.manufacturer}`);
  console.log(`   - Modèles: ${bmwEntry.countModels}`);
  console.log(`   - Groupes créés: ${output.countGroups}`);
  console.log(`   - Fichier: ${outputFile}`);

  // Afficher quelques exemples de groupes
  console.log(`\n📊 Exemples de groupes créés:`);
  groups.slice(0, 10).forEach((g) => {
    console.log(`   📁 ${g.displayName} (${g.models.length} modèle${g.models.length > 1 ? 's' : ''})`);
    g.models.slice(0, 3).forEach((m) => {
      console.log(`      - ${m.modelName}`);
    });
    if (g.models.length > 3) {
      console.log(`      ... et ${g.models.length - 3} autres`);
    }
  });
}

main().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});

