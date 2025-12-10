import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importer les fonctions du script hybride
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const modelsFile = path.join(compatibilityDir, 'models.json');

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

/**
 * Extraction intelligente du préfixe de base d'un modèle
 */
function extractModelBase(modelName: string): string | null {
  const cleaned = modelName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const upperName = cleaned.toUpperCase();
  
  if (upperName.startsWith('/')) {
    const slashMatch = upperName.match(/^(\/\d+)/);
    if (slashMatch) {
      return slashMatch[1];
    }
    const slashWordMatch = upperName.match(/^(\/[A-Z0-9]+)/);
    if (slashWordMatch) {
      return slashWordMatch[1];
    }
  }
  
  const genericWords = ['CLASSE', 'SERIE', 'SERIES', 'CLASS'];
  
  for (const generic of genericWords) {
    if (upperName.startsWith(generic + ' ')) {
      const rest = upperName.substring(generic.length + 1).trim();
      const nextWordMatch = rest.match(/^([A-Z0-9]+)/);
      if (nextWordMatch) {
        return `${generic} ${nextWordMatch[1]}`;
      }
    }
  }
  
  const numericMatch = upperName.match(/^(\d+|[A-Z]?\d+)$/);
  if (numericMatch) {
    return numericMatch[1];
  }
  
  const firstWordMatch = upperName.match(/^([A-Z0-9\/][A-Z0-9\/]*)/);
  if (firstWordMatch) {
    return firstWordMatch[1];
  }
  
  const leadingNumberMatch = upperName.match(/^(\d+)/);
  if (leadingNumberMatch) {
    return leadingNumberMatch[1];
  }
  
  return null;
}

function groupWithRules(models: Model[]): { grouped: Map<string, ModelGroup>; ungrouped: Model[] } {
  const grouped = new Map<string, ModelGroup>();
  const groupedModelIds = new Set<number>();
  
  for (const model of models) {
    const base = extractModelBase(model.modelName);
    if (!base) {
      continue;
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
  
  const ungrouped = models.filter((m) => !groupedModelIds.has(m.modelId));
  return { grouped, ungrouped };
}

async function processManufacturer(manufacturer: ManufacturerEntry): Promise<{
  groups: ModelGroup[];
  ruleGroups: number;
  aiGroups: number;
  success: boolean;
  error?: string;
}> {
  try {
    const { grouped, ungrouped } = groupWithRules(manufacturer.models);
    
    // Pour les modèles ambigus, on peut soit les laisser dans des groupes individuels
    // soit utiliser l'IA. Pour l'instant, créons des groupes individuels pour être sûr
    const aiGroups: ModelGroup[] = [];
    for (const model of ungrouped) {
      const base = extractModelBase(model.modelName);
      const fallbackBase = base || model.modelName.toUpperCase().split(/\s+/)[0] || model.modelName.toUpperCase();
      
      aiGroups.push({
        manufacturerId: manufacturer.manufacturerId,
        manufacturerName: manufacturer.manufacturerName,
        groupKey: fallbackBase,
        displayName: fallbackBase,
        confidence: 'ai',
        models: [model],
      });
    }
    
    // Fusionner tous les groupes
    const allGroups: ModelGroup[] = [];
    
    for (const group of grouped.values()) {
      group.manufacturerId = manufacturer.manufacturerId;
      group.manufacturerName = manufacturer.manufacturerName;
      allGroups.push(group);
    }
    
    for (const group of aiGroups) {
      allGroups.push(group);
    }
    
    return {
      groups: allGroups,
      ruleGroups: grouped.size,
      aiGroups: aiGroups.length,
      success: true,
    };
  } catch (error: any) {
    return {
      groups: [],
      ruleGroups: 0,
      aiGroups: 0,
      success: false,
      error: error.message || String(error),
    };
  }
}

async function main() {
  console.log(`📖 Lecture du fichier models.json...`);
  const modelsData: ModelsFile = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'));

  console.log(`✅ ${modelsData.results.length} constructeurs trouvés\n`);

  const results: Array<{
    manufacturer: string;
    models: number;
    groups: number;
    aiGroups: number;
    success: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < modelsData.results.length; i++) {
    const manufacturer = modelsData.results[i];
    const progress = `[${i + 1}/${modelsData.results.length}]`;
    
    console.log(`${progress} Traitement de ${manufacturer.manufacturerName} (${manufacturer.countModels} modèles)...`);
    
    const result = await processManufacturer(manufacturer);
    
    if (result.success) {
      // Sauvegarder le fichier
      const outputFile = path.join(
        compatibilityDir,
        `model-groups-hybrid-${manufacturer.manufacturerName.toLowerCase().replace(/\s+/g, '-')}.json`
      );
      
      const output = {
        generatedAt: new Date().toISOString(),
        manufacturer: manufacturer.manufacturerName,
        countGroups: result.groups.length,
        groups: result.groups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
      };
      
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
      
      results.push({
        manufacturer: manufacturer.manufacturerName,
        models: manufacturer.countModels,
        groups: result.groups.length,
        aiGroups: result.aiGroups,
        success: true,
      });
      
      console.log(`   ✅ ${result.groups.length} groupes créés (${result.ruleGroups} règles, ${result.aiGroups} IA)`);
    } else {
      results.push({
        manufacturer: manufacturer.manufacturerName,
        models: manufacturer.countModels,
        groups: 0,
        aiGroups: 0,
        success: false,
        error: result.error,
      });
      console.log(`   ❌ Erreur: ${result.error}`);
    }
  }

  // Résumé final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RÉSUMÉ FINAL`);
  console.log(`${'='.repeat(80)}`);
  
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  
  console.log(`\n✅ Réussis: ${successful.length}/${results.length}`);
  console.log(`❌ Échecs: ${failed.length}/${results.length}`);
  
  const totalModels = successful.reduce((sum, r) => sum + r.models, 0);
  const totalGroups = successful.reduce((sum, r) => sum + r.groups, 0);
  const totalAIGroups = successful.reduce((sum, r) => sum + r.aiGroups, 0);
  const ruleGroups = totalGroups - totalAIGroups;
  
  console.log(`\n📈 Statistiques globales:`);
  console.log(`   - Total modèles traités: ${totalModels.toLocaleString()}`);
  console.log(`   - Total groupes créés: ${totalGroups.toLocaleString()}`);
  console.log(`   - Groupes règles: ${ruleGroups.toLocaleString()} (${((ruleGroups / totalGroups) * 100).toFixed(1)}%)`);
  console.log(`   - Groupes IA/individuels: ${totalAIGroups.toLocaleString()} (${((totalAIGroups / totalGroups) * 100).toFixed(1)}%)`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Constructeurs en échec:`);
    failed.forEach((f) => {
      console.log(`   - ${f.manufacturer} (${f.models} modèles): ${f.error}`);
    });
  }
  
  // Écrire un rapport JSON
  const reportPath = path.join(compatibilityDir, 'grouping-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          totalModels,
          totalGroups,
          ruleGroups,
          aiGroups: totalAIGroups,
        },
        results,
      },
      null,
      2
    ),
    'utf-8'
  );
  
  console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);
}

main().catch((error) => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
