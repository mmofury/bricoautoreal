import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type MaybeDate = string | null;

// --- Types d'entrée ---
interface Model {
  modelId: number;
  modelName: string;
  modelYearFrom: MaybeDate;
  modelYearTo: MaybeDate;
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

// --- Types de sortie ---
interface GroupedModel extends Model {}

interface ModelGroup {
  manufacturerId: number;
  manufacturerName: string;
  groupKey: string; // clé normalisée (uppercase)
  displayName: string; // tronc commun affichable
  confidence: 'rule';
  models: GroupedModel[];
}

interface OutputFile {
  generatedAt: string;
  countManufacturers: number;
  countGroups: number;
  groups: ModelGroup[];
}

// Chemin depuis le script vers compatibility/
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const compatibilityDir = path.join(rootDir, 'compatibility');
const modelsPath = path.join(compatibilityDir, 'models.json');
const outputPath = path.join(compatibilityDir, 'model-groups.json');

// Mots/suffixes de carrosserie/variante en fin de libellé à retirer.
// Ordre important : du plus long au plus court pour éviter les faux positifs
const SUFFIX_PATTERNS = [
  'berline bicorps trois ou cinq portes',
  'berline bicorps trois portes',
  'berline bicorps cinq portes',
  'camionnette/monospace',
  'camionnette monospace',
  'camion plate-forme/châssis',
  'autobus/autocar',
  'a trois volumes',
  'berline bicorps',
  '3/5 portes',
  'tricorps',
  'bicorps',
  'camionnette',
  'monospace',
  'berline',
  'break',
  'sw',
  'sw.',
  'cc',
  'cabriolet',
  'decapotable',
  'coupe',
  'roadster',
  'fastback',
  'hatchback',
  'liftback',
  'notchback',
  'touring',
  'tourer',
  'estate',
  'wagon',
  'sportback',
  'pickup',
  'pick-up',
  'van',
  'minivan',
  'minibus',
  'suv',
  '4x4',
  'crossover',
  'plate-forme',
  'chassis',
  'fourgon',
  'camion',
  'autobus',
  'autocar',
  'vehicule',
  '3 portes',
  '5 portes',
];

// Numéros romains à retirer en fin de nom (générations)
// Capture I, II, III, IV, V, VI, VII, VIII, IX, X, etc.
const ROMAN_NUMERALS = /\s+(I{1,3}|IV|VI{0,3}|IX|V|X{1,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX{0,3})\s*$/i;

// Normalise un tronc : uppercase, accents retirés.
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// Retire les parenthèses terminales et nettoie les multiples espaces.
function stripParentheses(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// Détecte et coupe sur un premier "/" si présent (ex: "500 / 595 / 695" -> "500").
function cutOnSlash(name: string): string {
  const slashIndex = name.indexOf('/');
  if (slashIndex === -1) return name.trim();
  return name.slice(0, slashIndex).trim();
}

// Applique les suffixes de carrosserie connus (fin de chaîne) pour obtenir le tronc.
// Gère aussi les cas avec "/" et espaces (ex: "Camionnette/Monospace", " Monospace")
function applySuffixRules(name: string): string {
  let n = name.trim();
  const lower = n.toLowerCase();
  
  // Essayer chaque suffixe (du plus long au plus court)
  for (const suf of SUFFIX_PATTERNS) {
    // Patterns à tester : avec espace, avec slash, direct
    const testPatterns = [
      ' ' + suf,
      '/' + suf,
      suf,
    ];
    
    for (const pattern of testPatterns) {
      if (lower.endsWith(pattern)) {
        // Calculer la longueur à retirer dans la chaîne originale
        const removeLength = pattern.length;
        const result = n.slice(0, n.length - removeLength).trim();
        if (result) return result;
      }
    }
    
    // Cas spécial : suffixe après un "/" en fin (ex: ".../Monospace")
    const lastSlash = lower.lastIndexOf('/');
    if (lastSlash !== -1 && lastSlash < lower.length - 1) {
      const afterSlash = lower.slice(lastSlash + 1).trim();
      if (afterSlash === suf || afterSlash.startsWith(suf + ' ')) {
        const originalSlash = n.lastIndexOf('/');
        if (originalSlash !== -1) {
          return n.slice(0, originalSlash).trim();
        }
      }
    }
  }
  
  return n;
}

// Pour les listes numériques multiples (ex: "500 595 695"), on garde le premier token.
function cutIfAllNumeric(name: string): string {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return name.trim();
  if (tokens.every((t) => /^[0-9]+$/.test(t))) {
    return tokens[0];
  }
  return name.trim();
}

// Retire les numéros romains en fin de nom (ex: "3008 III" -> "3008", "5008 I" -> "5008")
function stripRomanNumerals(name: string): string {
  // Liste explicite des numéros romains courants (du plus long au plus court)
  const romanPatterns = [
    /\s+VIII\s*$/i,
    /\s+VII\s*$/i,
    /\s+VI\s*$/i,
    /\s+IV\s*$/i,
    /\s+IX\s*$/i,
    /\s+III\s*$/i,
    /\s+II\s*$/i,
    /\s+V\s*$/i,
    /\s+X\s*$/i,
    /\s+I\s*$/i,
  ];
  
  for (const pattern of romanPatterns) {
    if (pattern.test(name)) {
      return name.replace(pattern, '').trim();
    }
  }
  
  return name.trim();
}

// Tronc commun final.
function normalizeTrunk(rawName: string): string {
  let n = stripParentheses(rawName);
  n = cutOnSlash(n);
  // Retirer les numéros romains avant les suffixes pour éviter les conflits
  n = stripRomanNumerals(n);
  n = applySuffixRules(n);
  n = cutIfAllNumeric(n);
  n = n.replace(/\s+/g, ' ').trim();
  return n || rawName.trim();
}

function loadModels(): ModelsFile {
  const raw = fs.readFileSync(modelsPath, 'utf-8');
  return JSON.parse(raw) as ModelsFile;
}

function groupModels(entries: ManufacturerEntry[]): ModelGroup[] {
  const groups: ModelGroup[] = [];

  for (const m of entries) {
    const map = new Map<string, ModelGroup>();
    for (const model of m.models || []) {
      const trunk = normalizeTrunk(model.modelName);
      const key = normalizeKey(trunk);
      const existing = map.get(key);
      if (existing) {
        existing.models.push(model);
      } else {
        map.set(key, {
          manufacturerId: m.manufacturerId,
          manufacturerName: m.manufacturerName,
          groupKey: key,
          displayName: trunk,
          confidence: 'rule',
          models: [model],
        });
      }
    }
    for (const g of map.values()) {
      g.models.sort((a, b) => {
        const aYear = a.modelYearFrom ? Date.parse(a.modelYearFrom) : Number.NEGATIVE_INFINITY;
        const bYear = b.modelYearFrom ? Date.parse(b.modelYearFrom) : Number.NEGATIVE_INFINITY;
        return aYear - bYear;
      });
      groups.push(g);
    }
  }
  return groups;
}

function main() {
  console.log(`Lecture des modèles depuis ${modelsPath}`);
  const data = loadModels();
  console.log('Construction des groupes...');
  const groups = groupModels(data.results);

  const output: OutputFile = {
    generatedAt: new Date().toISOString(),
    countManufacturers: data.countManufacturers,
    countGroups: groups.length,
    groups,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ model-groups.json généré (${groups.length} groupes)`);
}

main();

