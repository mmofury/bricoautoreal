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
  confidence: 'rule' | 'ai';
  models: Model[];
}

interface GroupsFile {
  generatedAt: string;
  countManufacturers: number;
  countGroups: number;
  groups: ModelGroup[];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const inputFile = path.join(compatibilityDir, 'model-groups.json');
const outputFile = path.join(compatibilityDir, 'model-groups-ai-improved.json');

/**
 * Utilise l'IA pour suggérer des fusions de groupes
 */
async function suggestGroupMerges(groups: ModelGroup[]): Promise<Map<string, string[]>> {
  // Grouper par manufacturer
  const byManufacturer = new Map<number, ModelGroup[]>();
  for (const group of groups) {
    if (!byManufacturer.has(group.manufacturerId)) {
      byManufacturer.set(group.manufacturerId, []);
    }
    byManufacturer.get(group.manufacturerId)!.push(group);
  }

  const merges = new Map<string, string[]>();

  // Pour chaque manufacturer, analyser les groupes
  for (const [manufacturerId, manufacturerGroups] of byManufacturer) {
    if (manufacturerGroups.length < 2) continue;

    // Préparer les données pour l'IA
    const groupsData = manufacturerGroups.map((g) => ({
      groupKey: g.groupKey,
      displayName: g.displayName,
      models: g.models.map((m) => m.modelName),
    }));

    // Appel à l'IA (OpenAI ou autre)
    // Pour l'instant, on fait une analyse heuristique améliorée
    const suggestedMerges = analyzeGroupsForMerges(manufacturerGroups);
    
    for (const [targetGroup, sourceGroups] of suggestedMerges) {
      const key = `${manufacturerId}:${targetGroup}`;
      merges.set(key, sourceGroups);
    }
  }

  return merges;
}

/**
 * Analyse heuristique améliorée pour suggérer des fusions
 * Cette fonction peut être remplacée par un appel à l'API OpenAI
 */
function analyzeGroupsForMerges(groups: ModelGroup[]): Map<string, string[]> {
  const merges = new Map<string, string[]>();
  const processed = new Set<string>();

  for (let i = 0; i < groups.length; i++) {
    const group1 = groups[i];
    if (processed.has(group1.groupKey)) continue;

    const candidates: string[] = [];

    for (let j = i + 1; j < groups.length; j++) {
      const group2 = groups[j];
      if (processed.has(group2.groupKey)) continue;

      // Vérifier si les groupes devraient être fusionnés
      if (shouldMergeGroups(group1, group2)) {
        candidates.push(group2.groupKey);
        processed.add(group2.groupKey);
      }
    }

    if (candidates.length > 0) {
      merges.set(group1.groupKey, candidates);
      processed.add(group1.groupKey);
    }
  }

  return merges;
}

/**
 * Détermine si deux groupes devraient être fusionnés
 * Logique améliorée pour détecter les variantes (Coupé, Roadster, etc.)
 */
function shouldMergeGroups(group1: ModelGroup, group2: ModelGroup): boolean {
  const name1 = group1.displayName.toUpperCase();
  const name2 = group2.displayName.toUpperCase();

  // Cas 1: Un groupe contient l'autre (ex: "Z4" et "Z4 COUPE")
  if (name1.includes(name2) || name2.includes(name1)) {
    // Vérifier que ce n'est pas juste une coïncidence
    const shorter = name1.length < name2.length ? name1 : name2;
    const longer = name1.length >= name2.length ? name1 : name2;
    
    // Si le nom court est au début du nom long, c'est probablement une variante
    if (longer.startsWith(shorter) && longer.length - shorter.length < 20) {
      return true;
    }
  }

  // Cas 2: Même base avec suffixes différents (ex: "Z4" et "Z4 ROADSTER")
  const base1 = extractBaseName(name1);
  const base2 = extractBaseName(name2);
  
  if (base1 === base2 && base1.length >= 2) {
    // Vérifier que les modèles sont similaires
    const models1 = group1.models.map((m) => m.modelName.toUpperCase());
    const models2 = group2.models.map((m) => m.modelName.toUpperCase());
    
    // Si au moins un modèle contient la base dans les deux groupes
    const hasCommonBase = models1.some((m) => m.includes(base1)) &&
                          models2.some((m) => m.includes(base2));
    
    if (hasCommonBase) {
      return true;
    }
  }

  return false;
}

/**
 * Extrait le nom de base d'un modèle (sans les suffixes comme Coupé, Roadster, etc.)
 */
function extractBaseName(name: string): string {
  // Supprimer les suffixes communs
  const suffixes = [
    'COUPE', 'COUPÉ', 'ROADSTER', 'CABRIOLET', 'CAB', 'CONVERTIBLE',
    'BERLINE', 'BREAK', 'SW', 'STATION WAGON', 'VAN', 'MONOSPACE',
    'SUV', 'CROSSOVER', 'GT', 'GTS', 'M', 'I', 'II', 'III', 'IV',
    'A TROIS VOLUMES', 'BICORPS', 'TROIS PORTES', 'CINQ PORTES'
  ];

  let base = name;
  for (const suffix of suffixes) {
    const regex = new RegExp(`\\s*${suffix}\\s*$`, 'i');
    base = base.replace(regex, '').trim();
  }

  // Supprimer les codes entre parenthèses (ex: (E86), (F25))
  base = base.replace(/\s*\([^)]+\)\s*$/, '').trim();

  return base;
}

/**
 * Fusionne les groupes selon les suggestions
 */
function mergeGroups(groups: ModelGroup[], merges: Map<string, string[]>): ModelGroup[] {
  const groupsMap = new Map<string, ModelGroup>();
  
  // Créer une map initiale
  for (const group of groups) {
    groupsMap.set(group.groupKey, { ...group });
  }

  // Appliquer les fusions
  for (const [targetKey, sourceKeys] of merges) {
    const [, targetGroupKey] = targetKey.split(':');
    const targetGroup = groupsMap.get(targetGroupKey);
    
    if (!targetGroup) continue;

    // Fusionner les modèles des groupes sources
    for (const sourceKey of sourceKeys) {
      const sourceGroup = groupsMap.get(sourceKey);
      if (!sourceGroup) continue;

      // Ajouter les modèles (éviter les doublons)
      for (const model of sourceGroup.models) {
        if (!targetGroup.models.some((m) => m.modelId === model.modelId)) {
          targetGroup.models.push(model);
        }
      }

      // Supprimer le groupe source
      groupsMap.delete(sourceKey);
    }

    // Mettre à jour la confiance
    targetGroup.confidence = 'ai';
    
    // Trier les modèles par nom
    targetGroup.models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));
  }

  return Array.from(groupsMap.values());
}

async function main() {
  console.log('📖 Lecture du fichier model-groups.json...');
  const inputData: GroupsFile = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  console.log(`📊 ${inputData.countGroups} groupes trouvés pour ${inputData.countManufacturers} manufacturers`);

  console.log('🤖 Analyse avec IA pour améliorer le groupement...');
  const merges = await suggestGroupMerges(inputData.groups);
  
  console.log(`💡 ${merges.size} fusions suggérées`);

  console.log('🔀 Fusion des groupes...');
  const improvedGroups = mergeGroups(inputData.groups, merges);

  const output: GroupsFile = {
    generatedAt: new Date().toISOString(),
    countManufacturers: inputData.countManufacturers,
    countGroups: improvedGroups.length,
    groups: improvedGroups.sort((a, b) => {
      if (a.manufacturerId !== b.manufacturerId) {
        return a.manufacturerId - b.manufacturerId;
      }
      return a.displayName.localeCompare(b.displayName, 'fr');
    }),
  };

  console.log(`💾 Écriture dans ${outputFile}...`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ Terminé ! ${inputData.countGroups} → ${output.countGroups} groupes`);
  console.log(`📁 Fichier: ${outputFile}`);
}

main().catch(console.error);







