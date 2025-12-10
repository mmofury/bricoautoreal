import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../lib/db';

// Chemin depuis le script vers compatibility/
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const modelGroupsPath = path.join(compatibilityDir, 'model-groups-ai-improved.json');

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
  generatedAt: string;
  countManufacturers: number;
  countGroups: number;
  groups: ModelGroupFromJSON[];
}

async function loadModelGroups(): Promise<ModelGroupsFile> {
  if (!fs.existsSync(modelGroupsPath)) {
    throw new Error(`Fichier introuvable: ${modelGroupsPath}`);
  }
  const raw = fs.readFileSync(modelGroupsPath, 'utf-8');
  return JSON.parse(raw) as ModelGroupsFile;
}

async function importModelGroups() {
  console.log(`📖 Lecture de ${modelGroupsPath}...`);
  const data = await loadModelGroups();
  console.log(`✅ ${data.countGroups} groupes trouvés pour ${data.countManufacturers} constructeurs`);

  let processedGroups = 0;
  let createdManufacturers = 0;
  let createdGroups = 0;
  let createdRelations = 0;
  let skippedRelations = 0;

  // Traiter par constructeur pour optimiser
  const groupsByManufacturer = new Map<number, ModelGroupFromJSON[]>();
  for (const group of data.groups) {
    const existing = groupsByManufacturer.get(group.manufacturerId) || [];
    existing.push(group);
    groupsByManufacturer.set(group.manufacturerId, existing);
  }

  console.log(`\n🔄 Import en cours...`);

  for (const [manufacturerId, groups] of groupsByManufacturer.entries()) {
    // Trouver ou créer le constructeur
    const manufacturerName = groups[0].manufacturerName;
    let manufacturer = await db.manufacturer.findUnique({
      where: { name: manufacturerName },
    });

    if (!manufacturer) {
      manufacturer = await db.manufacturer.create({
        data: { name: manufacturerName },
      });
      createdManufacturers++;
      console.log(`  ✅ Constructeur créé: ${manufacturerName}`);
    }

    // Traiter chaque groupe de ce constructeur
    for (const group of groups) {
      // Créer ou trouver le ModelGroup
      let modelGroup = await db.modelGroup.findUnique({
        where: {
          manufacturerId_groupKey: {
            manufacturerId: manufacturer.id,
            groupKey: group.groupKey,
          },
        },
      });

      if (!modelGroup) {
        modelGroup = await db.modelGroup.create({
          data: {
            manufacturerId: manufacturer.id,
            groupKey: group.groupKey,
            displayName: group.displayName,
            confidence: group.confidence,
          },
        });
        createdGroups++;
      } else {
        // Mettre à jour le groupe existant si nécessaire
        if (modelGroup.displayName !== group.displayName || modelGroup.confidence !== group.confidence) {
          modelGroup = await db.modelGroup.update({
            where: { id: modelGroup.id },
            data: {
              displayName: group.displayName,
              confidence: group.confidence,
            },
          });
        }
      }

      // Ajouter les modèles au groupe
      for (const model of group.models) {
        // Trouver le VehicleModel par modelId
        const vehicleModel = await db.vehicleModel.findUnique({
          where: { modelId: model.modelId },
        });

        if (!vehicleModel) {
          console.log(`  ⚠️  VehicleModel introuvable pour modelId: ${model.modelId} (${model.modelName})`);
          skippedRelations++;
          continue;
        }

        // Vérifier si la relation existe déjà
        const existingRelation = await db.modelGroupModel.findUnique({
          where: {
            modelGroupId_vehicleModelId: {
              modelGroupId: modelGroup.id,
              vehicleModelId: vehicleModel.id,
            },
          },
        });

        if (!existingRelation) {
          await db.modelGroupModel.create({
            data: {
              modelGroupId: modelGroup.id,
              vehicleModelId: vehicleModel.id,
            },
          });
          createdRelations++;
        }
      }

      processedGroups++;
      if (processedGroups % 100 === 0) {
        console.log(`  📊 Progression: ${processedGroups}/${data.countGroups} groupes traités`);
      }
    }
  }

  console.log(`\n✅ Import terminé !`);
  console.log(`   - Constructeurs créés: ${createdManufacturers}`);
  console.log(`   - Groupes créés: ${createdGroups}`);
  console.log(`   - Relations créées: ${createdRelations}`);
  console.log(`   - Relations ignorées (modèle introuvable): ${skippedRelations}`);
  console.log(`   - Total groupes traités: ${processedGroups}`);
}

// Exécution
importModelGroups()
  .then(() => {
    console.log('\n✨ Terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });


