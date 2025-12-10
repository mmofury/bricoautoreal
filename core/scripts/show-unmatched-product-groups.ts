// Script pour montrer les groupes de produits TecDoc qui n'ont pas de correspondance exacte dans la DB
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

async function showUnmatched() {
  console.log('🔍 Analyse des groupes de produits sans correspondance exacte...\n');
  
  // Charger tous les ProductGroup de la DB
  const dbProductGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });
  
  console.log(`📦 ${dbProductGroups.length} ProductGroup dans la DB\n`);
  
  // Créer un Set des noms normalisés de la DB pour recherche rapide
  const dbNamesSet = new Set<string>();
  const dbNamesNormalizedSet = new Set<string>();
  
  dbProductGroups.forEach(pg => {
    dbNamesSet.add(pg.productName);
    dbNamesNormalizedSet.add(normalizeString(pg.productName));
  });
  
  // Charger les fichiers TecDoc
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ Aucun fichier tecdoc-categories-products-*.json trouvé!');
    return;
  }
  
  const allTecDocProductGroups = new Map<string, { 
    name: string; 
    categories: Array<{ name: string; level: number }> 
  }>();
  
  for (const file of files) {
    const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    for (const category of data.categories) {
      for (const pg of category.productGroups) {
        if (!allTecDocProductGroups.has(pg.id)) {
          allTecDocProductGroups.set(pg.id, { name: pg.name, categories: [] });
        }
        allTecDocProductGroups.get(pg.id)!.categories.push({
          name: category.categoryName,
          level: category.level,
        });
      }
    }
  }
  
  console.log(`📋 ${allTecDocProductGroups.size} groupes de produits uniques dans TecDoc\n`);
  
  // Trouver ceux qui n'ont pas de correspondance exacte
  const unmatched: Array<{
    tecdocName: string;
    tecdocId: string;
    categories: Array<{ name: string; level: number }>;
    dbSimilar?: string;
  }> = [];
  
  const matched: Array<{ tecdocName: string; dbName: string }> = [];
  
  for (const [tecdocId, tecdocPg] of allTecDocProductGroups.entries()) {
    const tecdocName = tecdocPg.name;
    
    // Vérifier correspondance exacte
    if (dbNamesSet.has(tecdocName)) {
      matched.push({ tecdocName, dbName: tecdocName });
      continue;
    }
    
    // Vérifier correspondance exacte normalisée
    const normalizedTecDoc = normalizeString(tecdocName);
    let foundDbName: string | null = null;
    
    for (const dbPg of dbProductGroups) {
      if (normalizeString(dbPg.productName) === normalizedTecDoc) {
        foundDbName = dbPg.productName;
        break;
      }
    }
    
    if (foundDbName) {
      matched.push({ tecdocName, dbName: foundDbName });
      continue;
    }
    
    // Chercher une correspondance proche pour affichage
    let closestDbName: string | null = null;
    let maxCommonWords = 0;
    
    const tecdocWords = normalizedTecDoc.split(' ').filter(w => w.length > 2);
    
    for (const dbPg of dbProductGroups) {
      const dbNormalized = normalizeString(dbPg.productName);
      const dbWords = dbNormalized.split(' ').filter(w => w.length > 2);
      
      const commonWords = tecdocWords.filter(tw => 
        dbWords.some(dw => tw === dw || tw.includes(dw) || dw.includes(tw))
      ).length;
      
      if (commonWords > maxCommonWords && commonWords >= tecdocWords.length * 0.5) {
        maxCommonWords = commonWords;
        closestDbName = dbPg.productName;
      }
    }
    
    unmatched.push({
      tecdocName,
      tecdocId,
      categories: tecdocPg.categories,
      dbSimilar: closestDbName || undefined,
    });
  }
  
  // Statistiques
  console.log('📊 Statistiques:\n');
  console.log(`   ✅ Correspondances exactes: ${matched.length} (${((matched.length / allTecDocProductGroups.size) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Sans correspondance exacte: ${unmatched.length} (${((unmatched.length / allTecDocProductGroups.size) * 100).toFixed(1)}%)\n`);
  
  // Afficher des exemples de correspondances exactes
  if (matched.length > 0) {
    console.log('✅ Exemples de correspondances exactes:');
    matched.slice(0, 10).forEach(m => {
      console.log(`   - "${m.tecdocName}" ↔ "${m.dbName}"`);
    });
    console.log('');
  }
  
  // Afficher des exemples sans correspondance
  if (unmatched.length > 0) {
    console.log('❌ Exemples SANS correspondance exacte:');
    console.log('   (Les 30 premiers)\n');
    
    unmatched.slice(0, 30).forEach((u, idx) => {
      console.log(`   ${idx + 1}. "${u.tecdocName}"`);
      if (u.dbSimilar) {
        console.log(`      → Proche de: "${u.dbSimilar}"`);
      }
      console.log(`      → Catégories: ${u.categories.map(c => `${c.name} (niveau ${c.level})`).join(', ')}`);
      console.log('');
    });
    
    if (unmatched.length > 30) {
      console.log(`   ... et ${unmatched.length - 30} autres\n`);
    }
  }
  
  // Grouper par catégorie pour voir quelles catégories sont le plus affectées
  const categoriesWithUnmatched = new Map<string, number>();
  
  unmatched.forEach(u => {
    u.categories.forEach(cat => {
      const count = categoriesWithUnmatched.get(cat.name) || 0;
      categoriesWithUnmatched.set(cat.name, count + 1);
    });
  });
  
  const topCategories = Array.from(categoriesWithUnmatched.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (topCategories.length > 0) {
    console.log('📂 Top 10 catégories avec le plus de groupes sans correspondance:');
    topCategories.forEach(([catName, count]) => {
      console.log(`   - ${catName}: ${count} groupes`);
    });
    console.log('');
  }
  
  console.log(`\n💡 Pour créer plus de relations, il faudrait:`);
  console.log(`   1. Normaliser les noms dans la DB (enlever accents, ponctuation)`);
  console.log(`   2. Ou créer les ProductGroup manquants dans la DB`);
  console.log(`   3. Ou utiliser une correspondance flexible (mais vous voulez exact)\n`);
}

showUnmatched()
  .catch(console.error)
  .finally(() => db.$disconnect());

























