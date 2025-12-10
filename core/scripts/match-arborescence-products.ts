// Script pour matcher les catégories de l'arborescence finale avec les productName de la DB
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, CategoryNode>;
}

interface CategoryWithLevel {
  id: string;
  text: string;
  level: number;
  path: string[];
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9\s]/g, '') // Enlever la ponctuation
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Correspondance exacte stricte
  if (norm1 === norm2) return 1.0;
  
  // Correspondance si l'un contient l'autre ET que la différence de longueur est < 30%
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
  
  // Vérifier si les chaînes sont très similaires (variations mineures)
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

function extractCategories(
  categories: Record<string, CategoryNode>,
  level: number = 1,
  path: string[] = []
): CategoryWithLevel[] {
  const result: CategoryWithLevel[] = [];
  
  for (const [id, node] of Object.entries(categories)) {
    const currentPath = [...path, node.text];
    
    result.push({
      id,
      text: node.text,
      level,
      path: currentPath,
    });
    
    // Récursivement extraire les enfants
    if (node.children && Object.keys(node.children).length > 0) {
      result.push(...extractCategories(node.children, level + 1, currentPath));
    }
  }
  
  return result;
}

async function matchArborescenceProducts() {
  console.log('🚀 Démarrage du matching arborescence...\n');
  
  // Charger l'arborescence
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  console.log(`📂 Chargement de l'arborescence: ${arborescencePath}`);
  
  if (!fs.existsSync(arborescencePath)) {
    console.error(`❌ Fichier non trouvé: ${arborescencePath}`);
    return;
  }
  
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));
  
  // Extraire toutes les catégories avec leurs niveaux
  console.log('🔍 Extraction des catégories...');
  const allCategories = extractCategories(arborescence.categories);
  
  // Grouper par niveau
  const byLevel: Record<number, CategoryWithLevel[]> = {};
  allCategories.forEach(cat => {
    if (!byLevel[cat.level]) byLevel[cat.level] = [];
    byLevel[cat.level].push(cat);
  });
  
  console.log(`✅ ${allCategories.length} catégories extraites\n`);
  console.log('📊 Répartition par niveau:');
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`   Niveau ${level}: ${byLevel[parseInt(level)].length} catégories`);
  });
  console.log('');
  
  // Récupérer tous les productName distincts de la DB
  console.log('🔍 Récupération des productName de la base de données...');
  const dbProducts = await db.product.findMany({
    select: {
      productName: true,
    },
    where: {
      productName: {
        not: null,
      },
    },
  });
  
  const uniqueProductNames = [...new Set(dbProducts.map(p => p.productName).filter(Boolean))];
  console.log(`   ✅ ${uniqueProductNames.length} noms de produits uniques dans la DB\n`);
  
  // Matcher chaque catégorie avec les productName
  console.log('🔗 Matching en cours...\n');
  
  const matches: Array<{
    categoryId: string;
    categoryText: string;
    level: number;
    path: string[];
    dbProductName: string;
    similarity: number;
    matchType: 'exact' | 'high' | 'medium';
  }> = [];
  
  const exactMatches: string[] = [];
  const highMatches: string[] = [];
  const mediumMatches: string[] = [];
  const noMatches: string[] = [];
  
  let processed = 0;
  for (const category of allCategories) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Progression: ${processed}/${allCategories.length} catégories traitées...`);
    }
    
    let bestMatch: { name: string; similarity: number } | null = null;
    
    for (const dbName of uniqueProductNames) {
      const similarity = calculateSimilarity(category.text, dbName);
      
      if (similarity >= 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { name: dbName, similarity };
      }
      
      if (similarity === 1.0) {
        break;
      }
    }
    
    if (bestMatch) {
      let matchType: 'exact' | 'high' | 'medium';
      if (bestMatch.similarity === 1.0) {
        matchType = 'exact';
        exactMatches.push(category.text);
      } else if (bestMatch.similarity >= 0.95) {
        matchType = 'high';
        highMatches.push(category.text);
      } else {
        matchType = 'medium';
        mediumMatches.push(category.text);
      }
      
      matches.push({
        categoryId: category.id,
        categoryText: category.text,
        level: category.level,
        path: category.path,
        dbProductName: bestMatch.name,
        similarity: bestMatch.similarity,
        matchType,
      });
    } else {
      noMatches.push(category.text);
    }
  }
  
  console.log(`\n✅ Matching terminé!\n`);
  
  // Statistiques par niveau
  console.log('📊 Résultats par niveau:');
  const matchesByLevel: Record<number, { exact: number; high: number; medium: number; none: number }> = {};
  
  allCategories.forEach(cat => {
    if (!matchesByLevel[cat.level]) {
      matchesByLevel[cat.level] = { exact: 0, high: 0, medium: 0, none: 0 };
    }
    
    const match = matches.find(m => m.categoryId === cat.id);
    if (!match) {
      matchesByLevel[cat.level].none++;
    } else if (match.matchType === 'exact') {
      matchesByLevel[cat.level].exact++;
    } else if (match.matchType === 'high') {
      matchesByLevel[cat.level].high++;
    } else {
      matchesByLevel[cat.level].medium++;
    }
  });
  
  Object.keys(matchesByLevel).sort().forEach(level => {
    const stats = matchesByLevel[parseInt(level)];
    const total = stats.exact + stats.high + stats.medium + stats.none;
    const matched = stats.exact + stats.high + stats.medium;
    const matchPercent = Math.round((matched / total) * 100);
    console.log(`   Niveau ${level}: ${matched}/${total} correspondances (${matchPercent}%)`);
    console.log(`      🎯 Exactes: ${stats.exact} | ✅ Fortes: ${stats.high} | ⚠️  Moyennes: ${stats.medium} | ❌ Aucune: ${stats.none}`);
  });
  
  console.log('\n📊 Résultats globaux:');
  console.log(`   🎯 Correspondances exactes (100%): ${exactMatches.length}`);
  console.log(`   ✅ Correspondances très proches (≥95%): ${highMatches.length}`);
  console.log(`   ⚠️  Correspondances proches (85-95%): ${mediumMatches.length}`);
  console.log(`   ❌ Aucune correspondance (<85%): ${noMatches.length}\n`);
  
  // Sauvegarder les résultats
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCategories: allCategories.length,
      totalDbProducts: uniqueProductNames.length,
      exactMatches: exactMatches.length,
      highMatches: highMatches.length,
      mediumMatches: mediumMatches.length,
      noMatches: noMatches.length,
      byLevel: matchesByLevel,
    },
    matches: matches.sort((a, b) => {
      // Trier par niveau puis par similarité
      if (a.level !== b.level) return a.level - b.level;
      return b.similarity - a.similarity;
    }),
    noMatches: noMatches.sort(),
  };
  
  const outputPath = path.join(process.cwd(), `arborescence-db-matches-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
  
  // Afficher quelques exemples par niveau
  Object.keys(matchesByLevel).sort().forEach(level => {
    const levelMatches = matches.filter(m => m.level === parseInt(level));
    if (levelMatches.length > 0) {
      console.log(`\n📋 Exemples niveau ${level} (5 premiers):`);
      levelMatches.slice(0, 5).forEach(m => {
        const similarityPercent = Math.round(m.similarity * 100);
        const icon = m.matchType === 'exact' ? '✅' : m.matchType === 'high' ? '✅' : '⚠️';
        console.log(`   ${icon} "${m.categoryText}" ${m.matchType === 'exact' ? '=' : '≈'} "${m.dbProductName}" (${similarityPercent}%)`);
      });
    }
  });
  
  console.log('');
}

matchArborescenceProducts()
  .catch(console.error)
  .finally(() => db.$disconnect());



























