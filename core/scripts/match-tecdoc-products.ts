// Script pour matcher les groupes de produits TecDoc avec les productName de la DB
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
  // (pour éviter "Barre de remorquage" = "Rondelle à ressort")
  if (norm1.includes(norm2)) {
    const diff = (norm1.length - norm2.length) / norm2.length;
    if (diff < 0.3) return 0.95; // Très proche
    return 0; // Trop différent
  }
  
  if (norm2.includes(norm1)) {
    const diff = (norm2.length - norm1.length) / norm1.length;
    if (diff < 0.3) return 0.95; // Très proche
    return 0; // Trop différent
  }
  
  // Vérifier si les chaînes sont très similaires (variations mineures)
  // Ex: "Boite à outils" vs "Boîte à outils"
  const words1 = norm1.split(' ').filter(w => w.length > 2); // Ignorer les mots courts
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  // Si le nombre de mots est très différent, pas de match
  if (Math.abs(words1.length - words2.length) > 1) {
    return 0;
  }
  
  // Tous les mots importants doivent être présents (au moins 80%)
  let matchingWords = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
      matchingWords++;
    }
  }
  
  // Pour être considéré comme un match, au moins 80% des mots doivent correspondre
  const matchRatio = matchingWords / Math.max(words1.length, words2.length);
  if (matchRatio >= 0.8 && words1.length >= 2) {
    return matchRatio;
  }
  
  return 0;
}

async function matchTecDocProducts() {
  console.log('🚀 Démarrage du matching TecDoc...\n');
  
  // Trouver automatiquement tous les fichiers TecDoc
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ Aucun fichier tecdoc-categories-products-*.json trouvé!');
    return;
  }
  
  console.log('📂 Chargement des fichiers JSON...');
  const allDataFiles: TecDocData[] = [];
  
  for (const file of files) {
    try {
      const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      allDataFiles.push(data);
      console.log(`   ✅ ${file}: ${data.categories.length} catégories, ${data.metadata.totalProductGroups} groupes`);
    } catch (e) {
      console.warn(`   ⚠️  Erreur lors du chargement de ${file}: ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
    }
  }
  
  console.log(`\n📊 ${allDataFiles.length} fichier(s) chargé(s)\n`);
  
  // Extraire tous les groupes de produits uniques
  const allProductGroups = new Map<string, TecDocProductGroup>();
  
  allDataFiles.forEach(data => {
    data.categories.forEach(cat => {
      cat.productGroups.forEach(group => {
        if (!allProductGroups.has(group.id)) {
          allProductGroups.set(group.id, group);
        }
      });
    });
  });
  
  console.log(`📊 Total de groupes de produits TecDoc uniques: ${allProductGroups.size}\n`);
  
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
  
  // Matcher les groupes TecDoc avec les productName de la DB
  console.log('🔗 Matching en cours...\n');
  
  const matches: Array<{
    tecdocId: string;
    tecdocName: string;
    dbProductName: string;
    similarity: number;
    matchType: 'exact' | 'high' | 'medium';
  }> = [];
  
  const exactMatches: string[] = [];
  const highMatches: string[] = [];
  const mediumMatches: string[] = [];
  const noMatches: string[] = [];
  
  let processed = 0;
  for (const [id, group] of allProductGroups) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Progression: ${processed}/${allProductGroups.size} groupes traités...`);
    }
    
    let bestMatch: { name: string; similarity: number } | null = null;
    
    for (const dbName of uniqueProductNames) {
      const similarity = calculateSimilarity(group.name, dbName);
      
      // Seuil minimum très strict : au moins 0.85 (85%) pour être considéré
      if (similarity >= 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { name: dbName, similarity };
      }
      
      // Si on trouve une correspondance exacte, on peut arrêter
      if (similarity === 1.0) {
        break;
      }
    }
    
    if (bestMatch) {
      let matchType: 'exact' | 'high' | 'medium';
      if (bestMatch.similarity === 1.0) {
        matchType = 'exact';
        exactMatches.push(group.name);
      } else if (bestMatch.similarity >= 0.95) {
        matchType = 'high';
        highMatches.push(group.name);
      } else {
        matchType = 'medium';
        mediumMatches.push(group.name);
      }
      
      matches.push({
        tecdocId: id,
        tecdocName: group.name,
        dbProductName: bestMatch.name,
        similarity: bestMatch.similarity,
        matchType,
      });
    } else {
      noMatches.push(group.name);
    }
  }
  
  console.log(`\n✅ Matching terminé!\n`);
  
  // Statistiques
  console.log('📊 Résultats:');
  console.log(`   🎯 Correspondances exactes (100%): ${exactMatches.length}`);
  console.log(`   ✅ Correspondances très proches (≥95%): ${highMatches.length}`);
  console.log(`   ⚠️  Correspondances proches (85-95%): ${mediumMatches.length}`);
  console.log(`   ❌ Aucune correspondance (<85%): ${noMatches.length}\n`);
  
  // Sauvegarder les résultats
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceFiles: files,
      totalTecDocGroups: allProductGroups.size,
      totalDbProducts: uniqueProductNames.length,
      exactMatches: exactMatches.length,
      highMatches: highMatches.length,
      mediumMatches: mediumMatches.length,
      noMatches: noMatches.length,
    },
    matches: matches.sort((a, b) => b.similarity - a.similarity),
    noMatches: noMatches.sort(),
  };
  
  const outputPath = path.join(process.cwd(), `tecdoc-db-matches-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
  
  // Afficher quelques exemples
  console.log('📋 Exemples de correspondances exactes (10 premiers):');
  matches
    .filter(m => m.matchType === 'exact')
    .slice(0, 10)
    .forEach(m => {
      console.log(`   ✅ "${m.tecdocName}" = "${m.dbProductName}"`);
    });
  
  if (highMatches.length > 0) {
    console.log('\n📋 Exemples de correspondances fortes (10 premiers):');
    matches
      .filter(m => m.matchType === 'high')
      .slice(0, 10)
      .forEach(m => {
        console.log(`   ✅ "${m.tecdocName}" ≈ "${m.dbProductName}" (${Math.round(m.similarity * 100)}%)`);
      });
  }
  
  if (noMatches.length > 0) {
    console.log('\n📋 Exemples sans correspondance (10 premiers):');
    noMatches.slice(0, 10).forEach(name => {
      console.log(`   ❌ "${name}"`);
    });
  }
  
  console.log('');
}

matchTecDocProducts()
  .catch(console.error)
  .finally(() => db.$disconnect());

