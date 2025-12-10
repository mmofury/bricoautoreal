import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../lib/db';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');

const manufacturersPath = path.join(compatibilityDir, 'manufacturers.json');
const modelsPath = path.join(compatibilityDir, 'models.json');
const versionsPath = path.join(compatibilityDir, 'versions.json');

type ManufacturerJSON = {
  manufacturerId: number;
  manufacturerName: string;
};

type ModelJSON = {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
};

type ModelsFile = {
  results: Array<{
    manufacturerId: number;
    manufacturerName: string;
    models: ModelJSON[];
  }>;
};

type VersionsFile = {
  results: Array<{
    manufacturerId: number;
    manufacturerName: string;
    modelId: number;
    modelName: string;
    modelTypes: Array<{
      vehicleId: number;
      manufacturerName: string;
      modelName: string;
      typeEngineName: string | null;
      constructionIntervalStart: string | null;
      constructionIntervalEnd: string | null;
      powerKw?: string | null;
      powerPs?: string | null;
      capacityTax?: string | null;
      fuelType?: string | null;
      bodyType?: string | null;
      numberOfCylinders?: number | null;
      capacityLt?: string | null;
      capacityTech?: string | null;
      engineCodes?: string | null;
      engId?: number | null;
    }>;
  }>;
};

function loadJSON<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function main() {
  console.log('📦 Chargement des fichiers JSON...');
  const manufacturersData = loadJSON<{ manufacturers: ManufacturerJSON[] }>(manufacturersPath).manufacturers;
  const modelsData = loadJSON<ModelsFile>(modelsPath).results;
  const versionsData = loadJSON<VersionsFile>(versionsPath).results;

  console.log('✅ JSON chargés. Import en base...');

  let createdManufacturers = 0;
  let createdModels = 0;
  let createdVehicles = 0;

  // Index utilitaires
  const manufacturerById = new Map<number, ManufacturerJSON>();
  manufacturersData.forEach((m) => manufacturerById.set(m.manufacturerId, m));

  const modelsById = new Map<number, ModelJSON>();
  modelsData.forEach((entry) => {
    entry.models.forEach((m) => modelsById.set(m.modelId, m));
  });

  // Import constructeurs
  for (const m of manufacturersData) {
    const existing = await db.manufacturer.findUnique({ where: { name: m.manufacturerName } });
    if (!existing) {
      await db.manufacturer.create({ data: { name: m.manufacturerName } });
      createdManufacturers++;
    }
  }
  console.log(`✅ Constructeurs créés: ${createdManufacturers}`);

  // Import modèles
  for (const entry of modelsData) {
    const manufacturer = await db.manufacturer.findUnique({ where: { name: entry.manufacturerName } });
    if (!manufacturer) {
      console.warn(`⚠️ Constructeur introuvable: ${entry.manufacturerName}`);
      continue;
    }
    for (const m of entry.models) {
      const existing = await db.vehicleModel.findUnique({ where: { modelId: m.modelId } });
      if (!existing) {
        await db.vehicleModel.create({
          data: {
            modelId: m.modelId,
            modelName: m.modelName,
            manufacturerId: manufacturer.id,
          },
        });
        createdModels++;
      }
    }
  }
  console.log(`✅ Modèles créés: ${createdModels}`);

  // Import véhicules (versions)
  for (const entry of versionsData) {
    const manufacturer = await db.manufacturer.findUnique({ where: { name: entry.manufacturerName } });
    if (!manufacturer) {
      console.warn(`⚠️ Constructeur introuvable pour version: ${entry.manufacturerName}`);
      continue;
    }
    const model = await db.vehicleModel.findUnique({ where: { modelId: entry.modelId } });
    if (!model) {
      console.warn(`⚠️ ModelId introuvable pour version: ${entry.modelId} (${entry.modelName})`);
      continue;
    }

    for (const v of entry.modelTypes) {
      const existing = await db.vehicle.findUnique({ where: { vehicleId: v.vehicleId } });
      if (!existing) {
        await db.vehicle.create({
          data: {
            vehicleId: v.vehicleId,
            modelId: model.id,
            typeEngineName: v.typeEngineName,
            constructionIntervalStart: v.constructionIntervalStart,
            constructionIntervalEnd: v.constructionIntervalEnd,
          },
        });
        createdVehicles++;
      }
    }
  }

  console.log('✅ Import terminé.');
  console.log(`   - Véhicules créés: ${createdVehicles}`);
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

