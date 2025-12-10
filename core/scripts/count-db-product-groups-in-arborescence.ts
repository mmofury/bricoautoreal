// Script pour compter combien de groupes de produits de la DB trouvent leur place dans l'arborescence finale
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

// Extraire toutes les catégories de l'arborescence
function extractAllCategories(
  categories: Record<string, CategoryNode>,
  level: number = 1,
  parentPath: string[] = []
): Array<{
  id: string;
  name: string;
  level: number;
  path: string[];
}> {
  const result: Array<{
    id: string;
    name: string;
    level: number;
    path: string[];
  }> = [];

  for (const [id, node] of Object.entries(categories)) {
    const currentPath = [...parentPath, node.text];

    result.push({
      id,
      name: node.text,
      level,
      path: currentPath,
    });

    if (node.children && Object.keys(node.children).length > 0) {
      result.push(...extractAllCategories(node.children, level + 1, currentPath));
    }
  }

  return result;
}

async function countProductGroupsInArborescence() {
  console.log('🔍 Analyse des groupes de produits de la DB dans l\'arborescence...\n');

  // 1. Charger tous les ProductGroup de la DB
  console.log('📦 Chargement des ProductGroup de la DB...');
  const dbProductGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });
  console.log(`   ✅ ${dbProductGroups.length} ProductGroup dans la DB\n`);

  // 2. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));

  const allCategories = extractAllCategories(arborescence.categories);
  console.log(`   ✅ ${allCategories.length} catégories dans l'arborescence\n`);

  // 3. Créer des index pour recherche rapide
  console.log('🔍 Création des index de recherche...');
  
  const categoriesByName = new Map<string, typeof allCategories[0][]>();
  const categoriesByNormalizedName = new Map<string, typeof allCategories[0][]>();

  allCategories.forEach(cat => {
    if (!categoriesByName.has(cat.name)) {
      categoriesByName.set(cat.name, []);
    }
    categoriesByName.get(cat.name)!.push(cat);

    const normalized = normalizeString(cat.name);
    if (!categoriesByNormalizedName.has(normalized)) {
      categoriesByNormalizedName.set(normalized, []);
    }
    categoriesByNormalizedName.get(normalized)!.push(cat);
  });

  console.log(`   ✅ Index créés\n`);

  // 4. Vérifier si on a déjà un fichier de matching généré
  console.log('📂 Recherche d\'un fichier de matching existant...');
  const matchingFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('product-groups-categories-') && f.endsWith('.json'))
    .sort()
    .reverse();

  let matchedCount = 0;
  let unmatchedCount = 0;
  const matchedGroups: Array<{ productName: string; categoryName: string; level: number }> = [];
  const unmatchedGroups: string[] = [];

  if (matchingFiles.length > 0) {
    const latestFile = matchingFiles[0];
    console.log(`   ✅ Fichier trouvé: ${latestFile}`);
    const matchingData = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

    // Gérer les deux formats possibles : associations (simplified) ou matchedGroups (complet)
    let associations: any[] = [];
    if (matchingData.associations) {
      associations = matchingData.associations;
    } else if (matchingData.matchedGroups) {
      // Convertir matchedGroups en format associations
      associations = matchingData.matchedGroups.map((g: any) => {
        if (g.matchedCategories && g.matchedCategories.length > 0) {
          const bestMatch = g.matchedCategories[0];
          return {
            productName: g.productName,
            productId: g.productId,
            categoryId: bestMatch.categoryId,
            categoryName: bestMatch.categoryName,
            categoryLevel: bestMatch.level,
            categoryPath: bestMatch.path,
            confidence: bestMatch.confidence,
          };
        }
        return null;
      }).filter((a: any) => a !== null);
    }

    if (associations.length > 0) {
      // Utiliser les données de matching existantes
      const matchedProductNames = new Set(
        associations.map((a: any) => a.productName)
      );

      for (const pg of dbProductGroups) {
        if (matchedProductNames.has(pg.productName)) {
          matchedCount++;
          const match = associations.find((a: any) => a.productName === pg.productName);
          if (match) {
            matchedGroups.push({
              productName: pg.productName,
              categoryName: match.categoryName,
              level: match.categoryLevel || match.level,
            });
          }
        } else {
          unmatchedCount++;
          if (unmatchedGroups.length < 20) {
            unmatchedGroups.push(pg.productName);
          }
        }
      }
    }
  } else {
    console.log('   ⚠️  Aucun fichier de matching trouvé, matching en cours...\n');
    
    // Faire le matching directement
    for (const pg of dbProductGroups) {
      let found = false;

      // Chercher par nom exact
      const exactMatches = categoriesByName.get(pg.productName);
      if (exactMatches && exactMatches.length > 0) {
        matchedCount++;
        matchedGroups.push({
          productName: pg.productName,
          categoryName: exactMatches[0].name,
          level: exactMatches[0].level,
        });
        found = true;
        continue;
      }

      // Chercher par nom normalisé
      if (!found) {
        const normalized = normalizeString(pg.productName);
        const normalizedMatches = categoriesByNormalizedName.get(normalized);
        if (normalizedMatches && normalizedMatches.length > 0) {
          matchedCount++;
          matchedGroups.push({
            productName: pg.productName,
            categoryName: normalizedMatches[0].name,
            level: normalizedMatches[0].level,
          });
          found = true;
          continue;
        }
      }

      // Chercher par similarité
      if (!found) {
        let bestMatch: { category: typeof allCategories[0]; similarity: number } | null = null;
        
        for (const cat of allCategories) {
          const similarity = calculateSimilarity(pg.productName, cat.name);
          if (similarity > 0 && (!bestMatch || similarity > bestMatch.similarity)) {
            bestMatch = { category: cat, similarity };
          }
        }

        if (bestMatch && bestMatch.similarity >= 0.8) {
          matchedCount++;
          matchedGroups.push({
            productName: pg.productName,
            categoryName: bestMatch.category.name,
            level: bestMatch.category.level,
          });
          found = true;
        }
      }

      if (!found) {
        unmatchedCount++;
        if (unmatchedGroups.length < 20) {
          unmatchedGroups.push(pg.productName);
        }
      }
    }
  }

  // 5. Statistiques
  console.log('\n📊 Statistiques:\n');
  console.log(`   📦 Total ProductGroup dans la DB: ${dbProductGroups.length}`);
  console.log(`   ✅ Groupes avec correspondance dans l'arborescence: ${matchedCount} (${((matchedCount / dbProductGroups.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Groupes sans correspondance: ${unmatchedCount} (${((unmatchedCount / dbProductGroups.length) * 100).toFixed(1)}%)\n`);

  // Répartition par niveau
  const byLevel: Record<number, number> = {};
  matchedGroups.forEach(m => {
    byLevel[m.level] = (byLevel[m.level] || 0) + 1;
  });

  console.log('📊 Répartition par niveau de catégorie:');
  Object.keys(byLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(level => {
      console.log(`   Niveau ${level}: ${byLevel[parseInt(level)]} groupes`);
    });
  console.log('');

  // Exemples
  if (matchedGroups.length > 0) {
    console.log('✅ Exemples de groupes avec correspondance:');
    matchedGroups.slice(0, 10).forEach(m => {
      console.log(`   - "${m.productName}" → ${m.categoryName} (niveau ${m.level})`);
    });
    console.log('');
  }

  if (unmatchedGroups.length > 0) {
    console.log('❌ Exemples de groupes sans correspondance:');
    unmatchedGroups.forEach(name => {
      console.log(`   - "${name}"`);
    });
    console.log('');
  }
}

countProductGroupsInArborescence()
  .catch(console.error)
  .finally(() => db.$disconnect());

