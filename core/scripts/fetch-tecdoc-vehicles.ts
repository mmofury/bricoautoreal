import fs from 'fs';
import path from 'path';
import axios from 'axios';

type Model = {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
};

type ManufacturerEntry = {
  manufacturerId: number;
  manufacturerName: string;
  countModels: number;
  models: Model[];
};

type ModelsFile = {
  countManufacturers: number;
  processed: number;
  results: ManufacturerEntry[];
};

type VehicleType = {
  vehicleId: number;
  manufacturerName: string;
  modelName: string;
  typeEngineName: string | null;
  constructionIntervalStart: string | null;
  constructionIntervalEnd: string | null;
  powerKw: string | null;
  powerPs: string | null;
  capacityTax: string | null;
  fuelType: string | null;
  bodyType: string | null;
  numberOfCylinders: number | null;
  capacityLt: string | null;
  capacityTech: string | null;
  engineCodes: string | null;
  engId: number | null;
};

type VehiclesResponse = {
  modelType: string | null;
  countModelTypes: number;
  modelTypes: VehicleType[];
};

type StoredEntry = {
  manufacturerId: number;
  manufacturerName: string;
  modelId: number;
  modelName: string;
  countModelTypes: number;
  modelTypes: VehicleType[];
};

type StoredFile = {
  countModels: number;
  processed: number;
  results: StoredEntry[];
};

const rootDir = path.resolve(__dirname, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const modelsPath = path.join(compatibilityDir, 'models.json');
const outputPath = path.join(compatibilityDir, 'versions.json');

const API_HOST = 'tecdoc-catalog.p.rapidapi.com';
const API_KEY =
  process.env.TECDOC_API_KEY || '8dfaae4fb2msh88f294b47a23e72p1d63fcjsn02184b022654';

const TYPE_ID = 1;
const LANG_ID = 6;
const COUNTRY_FILTER_ID = 63;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadModels(): ManufacturerEntry[] {
  if (!fs.existsSync(modelsPath)) {
    throw new Error(`Fichier models.json introuvable à ${modelsPath}`);
  }
  const raw = fs.readFileSync(modelsPath, 'utf-8');
  const parsed = JSON.parse(raw) as ModelsFile;
  if (!Array.isArray(parsed.results)) {
    throw new Error('models.json ne contient pas un tableau "results"');
  }
  return parsed.results;
}

function flattenModels(entries: ManufacturerEntry[]) {
  const list: Array<{
    manufacturerId: number;
    manufacturerName: string;
    model: Model;
  }> = [];
  for (const m of entries) {
    for (const model of m.models || []) {
      list.push({ manufacturerId: m.manufacturerId, manufacturerName: m.manufacturerName, model });
    }
  }
  return list;
}

function loadExisting(): StoredFile {
  if (!fs.existsSync(outputPath)) {
    return { countModels: 0, processed: 0, results: [] };
  }
  const raw = fs.readFileSync(outputPath, 'utf-8');
  try {
    return JSON.parse(raw) as StoredFile;
  } catch (err) {
    console.error('Impossible de parser versions.json, on repart de zéro', err);
    return { countModels: 0, processed: 0, results: [] };
  }
}

function saveFile(data: StoredFile) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fetchVehiclesForModel(modelId: number): Promise<VehiclesResponse> {
  const url = `https://${API_HOST}/types/type-id/${TYPE_ID}/list-vehicles-types/${modelId}/lang-id/${LANG_ID}/country-filter-id/${COUNTRY_FILTER_ID}`;
  const res = await axios.get(url, {
    headers: {
      'x-rapidapi-host': API_HOST,
      'x-rapidapi-key': API_KEY,
    },
    timeout: 20000,
  });
  return res.data as VehiclesResponse;
}

async function main() {
  const manufacturers = loadModels();
  const modelsFlat = flattenModels(manufacturers);
  const totalModels = modelsFlat.length;

  const existing = loadExisting();
  const processedMap = new Map<number, StoredEntry>();
  for (const entry of existing.results) {
    processedMap.set(entry.modelId, entry);
  }

  console.log(
    `▶️ Début — ${totalModels} modèles à traiter (déjà ${processedMap.size} faits)`,
  );

  for (const [index, item] of modelsFlat.entries()) {
    const { model, manufacturerId, manufacturerName } = item;
    if (processedMap.has(model.modelId)) {
      continue;
    }

    console.log(
      `\n🚗 Model ${model.modelName} (${model.modelId}) — ${manufacturerName} (${manufacturerId}) [${index + 1}/${totalModels}]`,
    );
    try {
      const data = await fetchVehiclesForModel(model.modelId);
      const entry: StoredEntry = {
        manufacturerId,
        manufacturerName,
        modelId: model.modelId,
        modelName: model.modelName,
        countModelTypes: data.countModelTypes ?? (data.modelTypes?.length ?? 0),
        modelTypes: data.modelTypes ?? [],
      };

      processedMap.set(model.modelId, entry);

      const stored: StoredFile = {
        countModels: totalModels,
        processed: processedMap.size,
        results: Array.from(processedMap.values()),
      };
      saveFile(stored); // sauvegarde en temps réel
      console.log(`✅ ${entry.countModelTypes} types`);
    } catch (err: any) {
      console.error(`❌ Échec pour ${model.modelName} (${model.modelId})`, err?.message || err);
    }

    // pause pour ménager l’API
    await sleep(300);
  }

  const finalData: StoredFile = {
    countModels: totalModels,
    processed: processedMap.size,
    results: Array.from(processedMap.values()),
  };
  saveFile(finalData);
  console.log('\n🏁 Terminé.');
}

main().catch((err) => {
  console.error('Erreur fatale', err);
  process.exit(1);
});








