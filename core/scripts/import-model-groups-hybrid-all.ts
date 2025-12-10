import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../lib/db';

// Chemin depuis le script vers compatibility/
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');

interface ModelFromJSON {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
}

interface ModelGroupFromJSON {
  manufacturerId: number;
  manufacturerName: string;
  groupKey: string;
  displayName: string;
  confidence: 'rule' | 'ai';
  models: ModelFromJSON[];
}

interface ModelGroupsFile {
  generatedAt?: string;
  manufacturer?: string;
  countGroups?: number;
  groups: ModelGroupFromJSON[];
}

async function importModelGroupsFromFile(filePath: string): Promise<{
  createdGroups: number;
  createdRelations: number;
  skippedRelations: number;
  errors: number;
}> {
  const stats = {
    createdGroups: 0,
    createdRelations: 0,
    skippedRelations: 0,
    errors: 0,
  };

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data: ModelGroupsFile = JSON.parse(raw);

    if (!data.groups || data.groups.length === 0) {
      return stats;
    }

    const manufacturerName = data.manufacturer || data.groups[0]?.manufacturerName;
    if (!manufacturerName) {
      console.warn(`  ⚠️  Pas de nom de constructeur dans ${path.basename(filePath)}`);
      return stats;
    }

    // Trouver ou créer le constructeur
    let manufacturer = await db.manufacturer.findUnique({
      where: { name: manufacturerName },
    });

    if (!manufacturer) {
      manufacturer = await db.manufacturer.create({
        data: { name: manufacturerName },
      });
    }

    // Créer un map des modelId -> vehicleModelId pour optimisation (limité à ce fichier)
    const vehicleModelMap = new Map<number, number>();
    
    // Récupérer tous les modelIds de ce fichier d'abord
    const allModelIds = new Set<number>();
    for (const group of data.groups) {
      for (const model of group.models) {
        allModelIds.add(model.modelId);
      }
    }
    
    // Charger tous les VehicleModels en une seule requête
    const vehicleModels = await db.vehicleModel.findMany({
      where: {
        modelId: {
          in: Array.from(allModelIds),
        },
      },
      select: {
        id: true,
        modelId: true,
      },
    });
    
    for (const vm of vehicleModels) {
      vehicleModelMap.set(vm.modelId, vm.id);
    }

    // Traiter chaque groupe avec transaction pour performance
    for (const group of data.groups) {
      try {
        // Créer ou mettre à jour le ModelGroup
        const modelGroup = await db.modelGroup.upsert({
          where: {
            manufacturerId_groupKey: {
              manufacturerId: manufacturer.id,
              groupKey: group.groupKey,
            },
          },
          update: {
            displayName: group.displayName,
            confidence: group.confidence,
          },
          create: {
            manufacturerId: manufacturer.id,
            groupKey: group.groupKey,
            displayName: group.displayName,
            confidence: group.confidence,
          },
        });

        stats.createdGroups++;

        // Préparer toutes les relations pour ce groupe
        const relationsToCreate = [];
        for (const model of group.models) {
          const vehicleModelId = vehicleModelMap.get(model.modelId);
          if (vehicleModelId) {
            relationsToCreate.push({
              modelGroupId: modelGroup.id,
              vehicleModelId: vehicleModelId,
            });
          } else {
            stats.skippedRelations++;
          }
        }

        // Créer toutes les relations une par une (SQLite ne supporte pas skipDuplicates)
        // Mais on optimise en vérifiant d'abord si elles existent en batch
        if (relationsToCreate.length > 0) {
          // Récupérer les relations existantes pour ce groupe
          const existingRelations = await db.modelGroupModel.findMany({
            where: {
              modelGroupId: modelGroup.id,
              vehicleModelId: {
                in: relationsToCreate.map((r) => r.vehicleModelId),
              },
            },
            select: {
              vehicleModelId: true,
            },
          });

          const existingVehicleModelIds = new Set(existingRelations.map((r) => r.vehicleModelId));

          // Créer uniquement les relations qui n'existent pas
          const newRelations = relationsToCreate.filter(
            (r) => !existingVehicleModelIds.has(r.vehicleModelId)
          );

          // Créer en batch si possible, sinon une par une
          for (const relation of newRelations) {
            try {
              await db.modelGroupModel.create({
                data: relation,
              });
              stats.createdRelations++;
            } catch (error: any) {
              // Ignorer les erreurs de contrainte unique (doublon créé entre temps)
              if (error.code !== 'P2002') {
                stats.errors++;
                console.warn(`    ⚠️  Erreur pour relation: ${error.message}`);
              }
            }
          }
        }
      } catch (error: any) {
        stats.errors++;
        // Ne pas spammer la console si c'est juste un timeout
        if (!error.message?.includes('timeout') && !error.message?.includes('Socket timeout')) {
          console.warn(`  ⚠️  Erreur pour groupe ${group.groupKey}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    stats.errors++;
    console.error(`  ❌ Erreur lors du traitement de ${path.basename(filePath)}: ${error.message}`);
  }

  return stats;
}

async function importAllHybridModelGroups() {
  console.log(`📖 Recherche des fichiers model-groups-hybrid-*.json...`);

  const files = fs
    .readdirSync(compatibilityDir)
    .filter((file) => file.startsWith('model-groups-hybrid-') && file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`Aucun fichier model-groups-hybrid-*.json trouvé dans ${compatibilityDir}`);
  }

  console.log(`✅ ${files.length} fichiers trouvés\n`);

  let totalCreatedGroups = 0;
  let totalCreatedRelations = 0;
  let totalSkippedRelations = 0;
  let totalErrors = 0;
  let processedFiles = 0;

  console.log(`🔄 Import en cours...\n`);

  const BATCH_SIZE = 50; // Traiter par batches pour libérer la mémoire

  for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
    const batch = files.slice(batchStart, batchEnd);

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const filePath = path.join(compatibilityDir, file);
      const fileIndex = batchStart + i + 1;
      const manufacturerName = file
        .replace('model-groups-hybrid-', '')
        .replace('.json', '')
        .toUpperCase();

      process.stdout.write(`[${fileIndex}/${files.length}] ${manufacturerName}... `);

      const stats = await importModelGroupsFromFile(filePath);

      totalCreatedGroups += stats.createdGroups;
      totalCreatedRelations += stats.createdRelations;
      totalSkippedRelations += stats.skippedRelations;
      totalErrors += stats.errors;
      processedFiles++;

      if (stats.errors > 0) {
        console.log(`✅ ${stats.createdGroups} groupes, ${stats.createdRelations} relations, ${stats.errors} erreurs`);
      } else {
        console.log(`✅ ${stats.createdGroups} groupes, ${stats.createdRelations} relations`);
      }
    }

    // Libérer la mémoire après chaque batch
    if (global.gc) {
      global.gc();
    }

    // Afficher un résumé après chaque batch
    console.log(
      `\n📊 Progression: ${batchEnd}/${files.length} fichiers traités | ` +
        `${totalCreatedGroups} groupes | ${totalCreatedRelations} relations\n`
    );
  }

  // Résumé final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RÉSUMÉ FINAL`);
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Fichiers traités: ${processedFiles}/${files.length}`);
  console.log(`📁 Groupes créés/mis à jour: ${totalCreatedGroups.toLocaleString()}`);
  console.log(`🔗 Relations créées: ${totalCreatedRelations.toLocaleString()}`);
  console.log(`⏭️  Relations ignorées (modèles inexistants): ${totalSkippedRelations.toLocaleString()}`);
  if (totalErrors > 0) {
    console.log(`❌ Erreurs: ${totalErrors.toLocaleString()}`);
  }
}

async function main() {
  try {
    console.log('🔌 Connexion à la base de données...');
    await db.$connect();
    console.log('✅ Connecté à la base de données\n');

    // ÉTAPE 0: Supprimer tous les anciens groupes (vérité absolue = données hybrides uniquement)
    console.log('🗑️  Suppression des anciens groupes de modèles...');
    const deletedRelations = await db.modelGroupModel.deleteMany({});
    const deletedGroups = await db.modelGroup.deleteMany({});
    console.log(`   ✅ ${deletedGroups.count.toLocaleString()} groupes supprimés`);
    console.log(`   ✅ ${deletedRelations.count.toLocaleString()} relations supprimées\n`);

    await importAllHybridModelGroups();

    console.log('\n✅ Import terminé avec succès !');
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    throw error;
  } finally {
    await db.$disconnect();
    console.log('🔌 Déconnecté de la base de données');
  }
}

main();

