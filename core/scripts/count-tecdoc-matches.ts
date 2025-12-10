// Script pour compter les matches entre les fichiers TecDoc et les ProductGroup de la DB
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

interface TecDocFile {
  productName: string;
  productId?: number;
  found?: boolean;
  hasMatch?: boolean;
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

async function countTecDocMatches() {
  console.log('🚀 Démarrage du comptage des matches TecDoc...\n');
  
  // Lire tous les fichiers JSON des deux dossiers
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');
  
  console.log('📂 Lecture des fichiers TecDoc...');
  
  const tecdocFiles: TecDocFile[] = [];
  
  // Lire le dossier 1
  if (fs.existsSync(dir1)) {
    const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.json') && f !== '_progress.json');
    console.log(`   📁 ${dir1}: ${files1.length} fichiers`);
    
    for (const file of files1) {
      try {
        const filePath = path.join(dir1, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (content.productName) {
          tecdocFiles.push({
            productName: content.productName,
            productId: content.productId,
            found: content.found,
            hasMatch: content.hasMatch,
          });
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  }
  
  // Lire le dossier 2
  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    console.log(`   📁 ${dir2}: ${files2.length} fichiers`);
    
    for (const file of files2) {
      try {
        const filePath = path.join(dir2, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (content.productName) {
          tecdocFiles.push({
            productName: content.productName,
            productId: content.productId,
            found: content.found,
            hasMatch: content.hasMatch,
          });
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  }
  
  // Dédupliquer par productName
  const uniqueTecDocProducts = new Map<string, TecDocFile>();
  tecdocFiles.forEach(file => {
    if (!uniqueTecDocProducts.has(file.productName)) {
      uniqueTecDocProducts.set(file.productName, file);
    }
  });
  
  console.log(`\n✅ ${tecdocFiles.length} fichiers lus, ${uniqueTecDocProducts.size} groupes de produits uniques\n`);
  
  // Récupérer tous les ProductGroup de la DB
  console.log('🔍 Récupération des ProductGroup de la base de données...');
  const dbProductGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
      slug: true,
    },
  });
  
  console.log(`   ✅ ${dbProductGroups.length} groupes de produits dans la DB\n`);
  
  // Matcher
  console.log('🔗 Matching en cours...\n');
  
  const matches: Array<{
    tecdocName: string;
    tecdocProductId?: number;
    dbName: string;
    dbId: number;
    similarity: number;
    matchType: 'exact' | 'high' | 'medium';
  }> = [];
  
  const exactMatches: string[] = [];
  const highMatches: string[] = [];
  const mediumMatches: string[] = [];
  const noMatches: string[] = [];
  
  let processed = 0;
  for (const [tecdocName, tecdocFile] of uniqueTecDocProducts) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Progression: ${processed}/${uniqueTecDocProducts.size} groupes traités...`);
    }
    
    let bestMatch: { name: string; id: number; similarity: number } | null = null;
    
    for (const dbGroup of dbProductGroups) {
      const similarity = calculateSimilarity(tecdocName, dbGroup.productName);
      
      if (similarity >= 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { name: dbGroup.productName, id: dbGroup.id, similarity };
      }
      
      if (similarity === 1.0) {
        break;
      }
    }
    
    if (bestMatch) {
      let matchType: 'exact' | 'high' | 'medium';
      if (bestMatch.similarity === 1.0) {
        matchType = 'exact';
        exactMatches.push(tecdocName);
      } else if (bestMatch.similarity >= 0.95) {
        matchType = 'high';
        highMatches.push(tecdocName);
      } else {
        matchType = 'medium';
        mediumMatches.push(tecdocName);
      }
      
      matches.push({
        tecdocName,
        tecdocProductId: tecdocFile.productId,
        dbName: bestMatch.name,
        dbId: bestMatch.id,
        similarity: bestMatch.similarity,
        matchType,
      });
    } else {
      noMatches.push(tecdocName);
    }
  }
  
  console.log(`\n✅ Matching terminé!\n`);
  
  // Statistiques
  console.log('📊 Résultats:');
  console.log(`   🎯 Correspondances exactes (100%): ${exactMatches.length}`);
  console.log(`   ✅ Correspondances très proches (≥95%): ${highMatches.length}`);
  console.log(`   ⚠️  Correspondances proches (85-95%): ${mediumMatches.length}`);
  console.log(`   ❌ Aucune correspondance (<85%): ${noMatches.length}\n`);
  
  const totalMatches = exactMatches.length + highMatches.length + mediumMatches.length;
  const matchPercent = Math.round((totalMatches / uniqueTecDocProducts.size) * 100);
  
  console.log(`📈 Résumé:`);
  console.log(`   ${totalMatches}/${uniqueTecDocProducts.size} groupes TecDoc ont un match dans la DB (${matchPercent}%)`);
  console.log(`   ${dbProductGroups.length} groupes de produits dans la DB`);
  console.log(`   ${matches.length} correspondances trouvées\n`);
  
  // Sauvegarder les résultats
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalTecDocFiles: tecdocFiles.length,
      uniqueTecDocProducts: uniqueTecDocProducts.size,
      totalDbProductGroups: dbProductGroups.length,
      exactMatches: exactMatches.length,
      highMatches: highMatches.length,
      mediumMatches: mediumMatches.length,
      noMatches: noMatches.length,
      totalMatches: totalMatches,
      matchPercent: matchPercent,
    },
    matches: matches.sort((a, b) => b.similarity - a.similarity),
    noMatches: noMatches.sort(),
  };
  
  const outputPath = path.join(process.cwd(), `tecdoc-files-db-matches-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
  
  // Afficher quelques exemples
  if (exactMatches.length > 0) {
    console.log('📋 Exemples de correspondances exactes (10 premiers):');
    matches
      .filter(m => m.matchType === 'exact')
      .slice(0, 10)
      .forEach(m => {
        console.log(`   ✅ "${m.tecdocName}" = "${m.dbName}" (DB ID: ${m.dbId})`);
      });
    console.log('');
  }
  
  if (noMatches.length > 0) {
    console.log('📋 Exemples sans correspondance (10 premiers):');
    noMatches.slice(0, 10).forEach(name => {
      console.log(`   ❌ "${name}"`);
    });
    console.log('');
  }
}

countTecDocMatches()
  .catch(console.error)
  .finally(() => db.$disconnect());

