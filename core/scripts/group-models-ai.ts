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

  const prompt = `Tu es un expert automobile spécialisé dans le groupement de modèles de véhicules.

Pour le constructeur ${manufacturerName}, je dois regrouper TOUS les modèles par famille spécifique. TOUS les modèles DOIVENT être groupés, AUCUN ne doit rester seul.

RÈGLES ABSOLUES :
1. INTERDICTION de créer des groupes génériques : "Classiques", "Autres", "Misc", "Divers", "Vintage", "Anciens", etc.
2. Chaque modèle doit être dans un groupe BASÉ UNIQUEMENT sur l'identifiant principal de son nom
3. Les codes entre parenthèses (E86), (F25), (G20) sont des codes de génération, IGNORE-LES pour le groupement
4. Les variantes (Coupé, Roadster, Décapotable, Berline, Break, SW, Touring, Gran Coupe, etc.) sont dans le MÊME groupe que le modèle de base
5. Les générations différentes (codes E/F/G, I/II/III) sont dans le MÊME groupe si c'est la même famille
6. **CRITIQUE - EXTRACTION DU PRÉFIXE** :
   - Pour les noms simples : "307", "J7", "Z4", "CLIO" → groupe "307", "J7", "Z4", "CLIO"
   - Pour les noms avec mot générique : "CLASSE S", "CLASSE C", "SERIE 3" → groupe "CLASSE S", "CLASSE C", "SERIE 3" (PAS juste "CLASSE" ou "SERIE" !)
   - "CLASSE S (W116)" et "CLASSE S Coupé (C126)" → MÊME groupe "CLASSE S"
   - "CLASSE C Coupé (C204)" et "CLASSE C Décapotable (A205)" → MÊME groupe "CLASSE C" (PAS "CLASSE S" !)
7. **CRITIQUE** : Le préfixe du groupe DOIT correspondre EXACTEMENT à l'identifiant principal de chaque modèle dans ce groupe
   - "CLASSE S" et "CLASSE C" sont DES GROUPES DIFFÉRENTS, même s'ils commencent tous par "CLASSE"
   - "307" et "504" sont des groupes différents
   - "J7" et "J9" sont des groupes différents

EXEMPLES CONCRETS :
- "307 3/5 portes", "307 Berline", "307 Break", "307 CC", "307 SW" → TOUS dans groupe "307" ✅
- "Z4 Coupé (E86)", "Z4 Roadster (E85)", "Z4 Roadster (E89)" → TOUS dans groupe "Z4" ✅
- "3 (E21)", "3 (E30)", "3 (E36)", "3 Touring (E30)", "3 Compact (E36)" → TOUS dans groupe "3" ✅
- "404 Break" → dans groupe "404" (PAS dans "504") ✅
- "J7 Fourgon" → dans groupe "J7" (PAS dans "504") ✅
- **Mercedes-Benz** :
  - "CLASSE S (W116)", "CLASSE S (W126)", "CLASSE S Coupé (C126)" → TOUS dans groupe "CLASSE S" ✅
  - "CLASSE C Coupé (C204)", "CLASSE C Décapotable (A205)" → TOUS dans groupe "CLASSE C" ✅
  - "CLASSE E Coupé (C124)", "CLASSE E Décapotable (A207)" → TOUS dans groupe "CLASSE E" ✅
  - "CLASSE C" et "CLASSE S" sont DES GROUPES DIFFÉRENTS ❌ (ne pas mélanger !)

RÈGLE DE VALIDATION :
Après avoir créé un groupe, vérifie que TOUS les modèles dans ce groupe commencent par le même préfixe que le groupKey.
Si un modèle ne correspond pas, crée un nouveau groupe pour lui au lieu de le mettre dans un groupe existant.

Format JSON strict :
{
  "groups": [
    {
      "groupKey": "PREFIXE_EN_MAJUSCULES",
      "displayName": "Nom d'affichage propre (ex: '307', 'Z4', '3', 'J7')",
      "modelIds": [123, 456, 789]
    }
  ]
}

CRITIQUE : 
- Chaque modelId DOIT être dans EXACTEMENT UN groupe
- Aucun groupe générique ("Classiques", "Autres", etc.)
- Vérifie que le nombre total de modelIds = nombre de modèles dans la liste
- Vérifie que le préfixe de chaque modèle correspond au groupKey de son groupe

Modèles ${manufacturerName} à grouper :
${JSON.stringify(modelsData, null, 2)}

Réponds UNIQUEMENT en JSON, sans texte supplémentaire.`;

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

  // FONCTION UTILITAIRE : Extraire le préfixe de base d'un nom de modèle
  function extractModelBase(modelName: string): string | null {
    // Enlever les parenthèses et leur contenu, puis normaliser
    const cleaned = modelName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const upperName = cleaned.toUpperCase();
    
    // Mots génériques qui nécessitent le mot suivant pour identifier le modèle
    const genericWords = ['CLASSE', 'SERIE', 'SERIES', 'CLASS'];
    
    // Pattern 1: Mot générique + mot suivant (ex: "CLASSE S", "CLASSE C", "SERIE 3")
    for (const generic of genericWords) {
      if (upperName.startsWith(generic + ' ')) {
        // Prendre le mot suivant après le mot générique
        const rest = upperName.substring(generic.length + 1).trim();
        const nextWordMatch = rest.match(/^([A-Z0-9]+)/);
        if (nextWordMatch) {
          return `${generic} ${nextWordMatch[1]}`;
        }
      }
    }
    
    // Pattern 2: Nombre pur ou lettre(s)+nombre (ex: "307", "Z4", "J7", "206")
    const numericMatch = upperName.match(/^(\d+|[A-Z]?\d+)$/);
    if (numericMatch) {
      return numericMatch[1];
    }
    
    // Pattern 3: Premier mot complet avant espace ou parenthèse (ex: "PARTNER", "CLIO", "Z4")
    const firstWordMatch = upperName.match(/^([A-Z][A-Z0-9]*)/);
    if (firstWordMatch) {
      return firstWordMatch[1];
    }
    
    // Pattern 4: Nombre au début (ex: "404 Break" → "404")
    const leadingNumberMatch = upperName.match(/^(\d+)/);
    if (leadingNumberMatch) {
      return leadingNumberMatch[1];
    }
    
    return null;
  }

  // ÉTAPE 1: VALIDATION ET CORRECTION DES GROUPES
  // Vérifier que tous les modèles d'un groupe partagent le même préfixe
  console.log(`\n🔍 Validation et correction des groupes...`);
  const misplacedModels: Array<{ model: Model; currentGroup: ModelGroup; correctBase: string }> = [];
  const groupsToFix: ModelGroup[] = [];

  for (const group of groups) {
    const groupBase = extractModelBase(group.groupKey);
    if (!groupBase) continue;

    // Vérifier chaque modèle du groupe
    for (const model of group.models) {
      const modelBase = extractModelBase(model.modelName);
      
      if (!modelBase || modelBase !== groupBase) {
        // Modèle mal placé
        if (modelBase) {
          misplacedModels.push({
            model,
            currentGroup: group,
            correctBase: modelBase,
          });
        }
      }
    }

    // Marquer les groupes à corriger
    if (group.models.some((m) => {
      const mb = extractModelBase(m.modelName);
      return mb && mb !== groupBase;
    })) {
      groupsToFix.push(group);
    }
  }

  if (misplacedModels.length > 0) {
    console.log(`   ⚠️  ${misplacedModels.length} modèle(s) mal placé(s) détecté(s)`);
    
    // Retirer les modèles mal placés de leurs groupes actuels
    for (const { model, currentGroup } of misplacedModels) {
      const index = currentGroup.models.findIndex((m) => m.modelId === model.modelId);
      if (index > -1) {
        currentGroup.models.splice(index, 1);
      }
    }

    // Réassigner les modèles mal placés aux bons groupes
    for (const { model, correctBase } of misplacedModels) {
      // Chercher un groupe existant avec le bon préfixe
      let targetGroup = groups.find((g) => {
        const gb = extractModelBase(g.groupKey);
        return gb === correctBase;
      });

      if (!targetGroup) {
        // Créer un nouveau groupe si nécessaire
        targetGroup = {
          manufacturerId: 0,
          manufacturerName,
          groupKey: correctBase,
          displayName: correctBase,
          confidence: 'ai',
          models: [],
        };
        groups.push(targetGroup);
        console.log(`   ✅ Nouveau groupe créé "${correctBase}" pour "${model.modelName}"`);
      }

      // Ajouter le modèle au bon groupe
      if (!targetGroup.models.find((m) => m.modelId === model.modelId)) {
        targetGroup.models.push(model);
        targetGroup.models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));
        console.log(`   ✅ "${model.modelName}" déplacé vers le groupe "${targetGroup.displayName}"`);
      }
    }
  } else {
    console.log(`   ✅ Tous les modèles sont dans le bon groupe`);
  }

  // Supprimer les groupes vides
  const emptyGroups = groups.filter((g) => g.models.length === 0);
  if (emptyGroups.length > 0) {
    console.log(`   🗑️  Suppression de ${emptyGroups.length} groupe(s) vide(s)`);
    for (const emptyGroup of emptyGroups) {
      const index = groups.findIndex((g) => g.groupKey === emptyGroup.groupKey);
      if (index > -1) {
        groups.splice(index, 1);
      }
    }
  }

  // ÉTAPE 2: Gérer les modèles non groupés (orphelins)
  const groupedModelIds = new Set(groups.flatMap((g) => g.models.map((m) => m.modelId)));
  const ungrouped = models.filter((m) => !groupedModelIds.has(m.modelId));
  
  if (ungrouped.length > 0) {
    console.warn(`\n⚠️  ${ungrouped.length} modèle(s) non groupé(s), post-traitement automatique...`);
    
    // Post-traitement : essayer de placer les modèles orphelins dans les groupes existants
    for (const orphan of ungrouped) {
      const base = extractModelBase(orphan.modelName);
      if (!base) continue;
      
      // Chercher un groupe existant qui correspond
      const matchingGroup = groups.find((g) => {
        const groupBase = extractModelBase(g.groupKey);
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

      // Enlever le préfixe "Série" du displayName
      const cleanDisplayName = mainGroup.displayName.replace(/^Série\s+/i, '').trim() || baseKey;

      mergedGroups.push({
        manufacturerId: mainGroup.manufacturerId,
        manufacturerName: mainGroup.manufacturerName,
        groupKey: baseKey.toUpperCase(),
        displayName: cleanDisplayName,
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
  const manufacturerName = process.argv[2]?.toUpperCase() || 'PEUGEOT';
  
  console.log(`📖 Lecture du fichier models.json...`);
  const modelsData: ModelsFile = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'));

  // Trouver le constructeur
  const manufacturerEntry = modelsData.results.find((r) => 
    r.manufacturerName.toUpperCase() === manufacturerName.toUpperCase()
  );

  if (!manufacturerEntry) {
    throw new Error(`${manufacturerName} non trouvé dans models.json`);
  }

  console.log(`✅ ${manufacturerEntry.manufacturerName} trouvé: ${manufacturerEntry.countModels} modèles`);
  console.log(`\n📋 Modèles ${manufacturerEntry.manufacturerName}:`);
  manufacturerEntry.models.slice(0, 10).forEach((m) => {
    console.log(`   - ${m.modelName} (${m.modelId})`);
  });
  if (manufacturerEntry.models.length > 10) {
    console.log(`   ... et ${manufacturerEntry.models.length - 10} autres`);
  }

  console.log(`\n🤖 Groupement avec IA...`);
  const groups = await groupModelsWithAI(manufacturerEntry.models, manufacturerEntry.manufacturerName);

  // Remplir le manufacturerId
  for (const group of groups) {
    group.manufacturerId = manufacturerEntry.manufacturerId;
  }

  const outputFile = path.join(compatibilityDir, `model-groups-ai-${manufacturerEntry.manufacturerName.toLowerCase().replace(/\s+/g, '-')}.json`);

  const output: OutputFile = {
    generatedAt: new Date().toISOString(),
    manufacturer: manufacturerEntry.manufacturerName,
    countGroups: groups.length,
    groups: groups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
  };

  console.log(`\n💾 Écriture dans ${outputFile}...`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ Terminé !`);
  console.log(`   - Constructeur: ${output.manufacturer}`);
  console.log(`   - Modèles: ${manufacturerEntry.countModels}`);
  console.log(`   - Groupes créés: ${output.countGroups}`);
  console.log(`   - Fichier: ${outputFile}`);

  // Afficher quelques exemples de groupes
  console.log(`\n📊 Exemples de groupes créés:`);
  groups.slice(0, 15).forEach((g) => {
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

