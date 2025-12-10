import fs from 'fs';
import path from 'path';
import axios from 'axios';

type Manufacturer = {
  manufacturerId: number;
  manufacturerName: string;
};

type Model = {
  modelId: number;
  modelName: string;
  modelYearFrom: string | null;
  modelYearTo: string | null;
};

type ModelsResponse = {
  countModels: number;
  models: Model[];
};

type StoredEntry = {
  manufacturerId: number;
  manufacturerName: string;
  countModels: number;
  models: Model[];
};

type StoredFile = {
  countManufacturers: number;
  processed: number;
  results: StoredEntry[];
};

const rootDir = path.resolve(__dirname, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const manufacturersPath = path.join(compatibilityDir, 'manufacturers.json');
const outputPath = path.join(compatibilityDir, 'models.json');

const API_HOST = 'tecdoc-catalog.p.rapidapi.com';
const API_KEY = process.env.TECDOC_API_KEY || '8dfaae4fb2msh88f294b47a23e72p1d63fcjsn02184b022654';

const TYPE_ID = 1;
const LANG_ID = 6;
const COUNTRY_FILTER_ID = 63;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadManufacturers(): Manufacturer[] {
  if (!fs.existsSync(manufacturersPath)) {
    throw new Error(`Fichier manufacturers.json introuvable à ${manufacturersPath}`);
  }
  const raw = fs.readFileSync(manufacturersPath, 'utf-8');
  const parsed = JSON.parse(raw) as { manufacturers: Manufacturer[] };
  if (!Array.isArray(parsed.manufacturers)) {
    throw new Error('manufacturers.json ne contient pas un tableau "manufacturers"');
  }
  return parsed.manufacturers;
}

function loadExisting(): StoredFile {
  if (!fs.existsSync(outputPath)) {
    return { countManufacturers: 0, processed: 0, results: [] };
  }
  const raw = fs.readFileSync(outputPath, 'utf-8');
  try {
    return JSON.parse(raw) as StoredFile;
  } catch (err) {
    console.error('Impossible de parser models.json, on repart de zéro', err);
    return { countManufacturers: 0, processed: 0, results: [] };
  }
}

function saveFile(data: StoredFile) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fetchModelsForManufacturer(manufacturerId: number): Promise<ModelsResponse> {
  const url = `https://${API_HOST}/models/list/type-id/${TYPE_ID}/manufacturer-id/${manufacturerId}/lang-id/${LANG_ID}/country-filter-id/${COUNTRY_FILTER_ID}`;
  const res = await axios.get(url, {
    headers: {
      'x-rapidapi-host': API_HOST,
      'x-rapidapi-key': API_KEY,
    },
    timeout: 20000,
  });
  return res.data as ModelsResponse;
}

async function main() {
  const manufacturers = loadManufacturers();
  const existing = loadExisting();

  const processedMap = new Map<number, StoredEntry>();
  for (const entry of existing.results) {
    processedMap.set(entry.manufacturerId, entry);
  }

  const total = manufacturers.length;
  console.log(`▶️ Début — ${total} constructeurs à traiter (déjà ${processedMap.size} faits)`);

  for (const [index, m] of manufacturers.entries()) {
    if (processedMap.has(m.manufacturerId)) {
      continue;
    }

    console.log(`\n🚗 Manufacturer ${m.manufacturerName} (${m.manufacturerId}) [${index + 1}/${total}]`);
    try {
      const data = await fetchModelsForManufacturer(m.manufacturerId);
      const entry: StoredEntry = {
        manufacturerId: m.manufacturerId,
        manufacturerName: m.manufacturerName,
        countModels: data.countModels ?? (data.models?.length ?? 0),
        models: data.models ?? [],
      };

      processedMap.set(m.manufacturerId, entry);

      const stored: StoredFile = {
        countManufacturers: total,
        processed: processedMap.size,
        results: Array.from(processedMap.values()),
      };
      saveFile(stored); // sauvegarde en temps réel
      console.log(`✅ ${entry.countModels} modèles`);
    } catch (err: any) {
      console.error(`❌ Échec pour ${m.manufacturerName} (${m.manufacturerId})`, err?.message || err);
    }

    // petite pause pour limiter la pression API
    await sleep(300);
  }

  const finalData: StoredFile = {
    countManufacturers: total,
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








