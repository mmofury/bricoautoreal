import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Model {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
}

interface ModelGroup {
  manufacturerId: number;
  manufacturerName: string;
  groupKey: string;
  displayName: string;
  confidence: string;
  models: Model[];
}

interface OutputFile {
  generatedAt?: string;
  manufacturer?: string;
  countGroups?: number;
  groups: ModelGroup[];
}

/**
 * Extraire le préfixe de base d'un nom de modèle
 */
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

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: tsx fix-model-groups.ts <input-file.json>');
    process.exit(1);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, '..', '..');
  
  // Résoudre le chemin du fichier d'entrée
  let inputPath: string;
  if (path.isAbsolute(inputFile)) {
    inputPath = inputFile;
  } else {
    // Resoudre depuis le répertoire courant (où la commande est exécutée)
    inputPath = path.resolve(process.cwd(), inputFile);
  }

  // Vérifier que le fichier existe
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Fichier non trouvé: ${inputPath}`);
    console.error(`   Répertoire courant: ${process.cwd()}`);
    console.error(`   Fichier demandé: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Lecture du fichier ${inputPath}...`);
  const data: OutputFile = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  const groups = data.groups;
  console.log(`✅ ${groups.length} groupes trouvés`);

  // ÉTAPE 1: VALIDATION ET CORRECTION DES GROUPES
  console.log(`\n🔍 Validation et correction des groupes...`);
  const misplacedModels: Array<{ model: Model; currentGroup: ModelGroup; correctBase: string }> = [];

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
          console.log(`   ⚠️  "${model.modelName}" est dans le groupe "${group.displayName}" mais devrait être dans "${modelBase}"`);
        }
      }
    }
  }

  if (misplacedModels.length === 0) {
    console.log(`   ✅ Tous les modèles sont dans le bon groupe`);
    return;
  }

  console.log(`\n🔧 Correction de ${misplacedModels.length} modèle(s) mal placé(s)...`);

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
        manufacturerId: data.groups[0]?.manufacturerId || 0,
        manufacturerName: data.groups[0]?.manufacturerName || '',
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

  // Supprimer les groupes vides
  const emptyGroups = groups.filter((g) => g.models.length === 0);
  if (emptyGroups.length > 0) {
    console.log(`\n🗑️  Suppression de ${emptyGroups.length} groupe(s) vide(s)`);
    for (const emptyGroup of emptyGroups) {
      const index = groups.findIndex((g) => g.groupKey === emptyGroup.groupKey);
      if (index > -1) {
        groups.splice(index, 1);
      }
    }
  }

  // Trier les groupes et mettre à jour les métadonnées
  data.groups = groups
    .filter((g) => g.models.length > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  data.countGroups = data.groups.length;

  // Réécrire le fichier
  console.log(`\n💾 Écriture du fichier corrigé...`);
  fs.writeFileSync(inputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n✅ Terminé !`);
  console.log(`   - Groupes: ${data.countGroups}`);
  console.log(`   - Modèles corrigés: ${misplacedModels.length}`);
}

main().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});

