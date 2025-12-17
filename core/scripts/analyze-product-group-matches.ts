// Script pour analyser les correspondances entre groupes de produits TecDoc et ProductGroup DB
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

interface TecDocProductGroup {
  id: string;
  name: string;
}

interface TecDocCategory {
  categoryId: string;
  categoryName: string;
  level: number;
  productGroups: TecDocProductGroup[];
  url: string;
}

interface TecDocData {
  metadata: any;
  categories: TecDocCategory[];
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (norm1 === norm2) return 1.0;
  
  if (norm1.includes(norm2)) {
    const diff = (norm1.length - norm2.length) / norm2.length;
    if (diff < 0.3) return 0.95;
    return 0;
  }
  
  if (norm2.includes(norm1)) {
    const diff = (norm2.length - norm1.length) / norm1.length;
    if (diff < 0.3) return 0.95;
    return 0;
  }
  
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (Math.abs(words1.length - words2.length) > 1) {
    return 0;
  }
  
  let matchingWords = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
      matchingWords++;
    }
  }
  
  const matchRatio = matchingWords / Math.max(words1.length, words2.length);
  if (matchRatio >= 0.8 && words1.length >= 2) {
    return matchRatio;
  }
  
  return 0;
}

async function analyzeMatches() {
  console.log('🔍 Analyse des correspondances ProductGroup...\n');
  
  // Charger tous les ProductGroup de la DB
  const dbProductGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });
  
  console.log(`📦 ${dbProductGroups.length} ProductGroup dans la DB\n`);
  
  // Charger les fichiers TecDoc
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ Aucun fichier tecdoc-categories-products-*.json trouvé!');
    return;
  }
  
  const allTecDocProductGroups = new Map<string, { name: string; categories: string[] }>();
  
  for (const file of files) {
    const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    for (const category of data.categories) {
      for (const pg of category.productGroups) {
        if (!allTecDocProductGroups.has(pg.id)) {
          allTecDocProductGroups.set(pg.id, { name: pg.name, categories: [] });
        }
        allTecDocProductGroups.get(pg.id)!.categories.push(category.categoryName);
      }
    }
  }
  
  console.log(`📋 ${allTecDocProductGroups.size} groupes de produits uniques dans TecDoc\n`);
  
  // Analyser les correspondances
  let exactMatches = 0;
  let similarMatches = 0;
  let noMatches = 0;
  
  const exactMatchExamples: Array<{ tecdoc: string; db: string }> = [];
  const similarMatchExamples: Array<{ tecdoc: string; db: string; similarity: number }> = [];
  const noMatchExamples: string[] = [];
  
  for (const [tecdocId, tecdocPg] of allTecDocProductGroups.entries()) {
    const tecdocName = tecdocPg.name;
    
    // Chercher correspondance exacte
    const exactMatch = dbProductGroups.find(pg => 
      normalizeString(pg.productName) === normalizeString(tecdocName)
    );
    
    if (exactMatch) {
      exactMatches++;
      if (exactMatchExamples.length < 5) {
        exactMatchExamples.push({ tecdoc: tecdocName, db: exactMatch.productName });
      }
      continue;
    }
    
    // Chercher correspondance similaire
    let bestMatch: { id: number; name: string; similarity: number } | null = null;
    
    for (const dbPg of dbProductGroups) {
      const similarity = calculateSimilarity(tecdocName, dbPg.productName);
      if (similarity > 0 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { id: dbPg.id, name: dbPg.productName, similarity };
      }
    }
    
    if (bestMatch && bestMatch.similarity >= 0.8) {
      similarMatches++;
      if (similarMatchExamples.length < 5) {
        similarMatchExamples.push({ 
          tecdoc: tecdocName, 
          db: bestMatch.name, 
          similarity: bestMatch.similarity 
        });
      }
    } else {
      noMatches++;
      if (noMatchExamples.length < 10) {
        noMatchExamples.push(tecdocName);
      }
    }
  }
  
  // Statistiques
  console.log('📊 Statistiques de correspondance:\n');
  console.log(`   ✅ Correspondances exactes: ${exactMatches} (${((exactMatches / allTecDocProductGroups.size) * 100).toFixed(1)}%)`);
  console.log(`   🔄 Correspondances similaires: ${similarMatches} (${((similarMatches / allTecDocProductGroups.size) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Aucune correspondance: ${noMatches} (${((noMatches / allTecDocProductGroups.size) * 100).toFixed(1)}%)`);
  console.log(`   📈 Total correspondances possibles: ${exactMatches + similarMatches} (${(((exactMatches + similarMatches) / allTecDocProductGroups.size) * 100).toFixed(1)}%)\n`);
  
  if (exactMatchExamples.length > 0) {
    console.log('✅ Exemples de correspondances exactes:');
    exactMatchExamples.forEach(ex => {
      console.log(`   - "${ex.tecdoc}" ↔ "${ex.db}"`);
    });
    console.log('');
  }
  
  if (similarMatchExamples.length > 0) {
    console.log('🔄 Exemples de correspondances similaires:');
    similarMatchExamples.forEach(ex => {
      console.log(`   - "${ex.tecdoc}" ↔ "${ex.db}" (${(ex.similarity * 100).toFixed(0)}%)`);
    });
    console.log('');
  }
  
  if (noMatchExamples.length > 0) {
    console.log('❌ Exemples sans correspondance:');
    noMatchExamples.forEach(ex => {
      console.log(`   - "${ex}"`);
    });
    console.log('');
  }
  
  // Calculer combien de relations on pourrait créer
  const totalPossibleRelations = exactMatches + similarMatches;
  console.log(`\n💡 Avec une correspondance flexible, on pourrait créer ${totalPossibleRelations} relations ProductGroup-Category`);
  console.log(`   (au lieu de ${exactMatches} avec correspondance exacte uniquement)\n`);
}

analyzeMatches()
  .catch(console.error)
  .finally(() => db.$disconnect());



























