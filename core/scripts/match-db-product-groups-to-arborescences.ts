// Script pour matcher les groupes de produits de la DB avec les arborescences
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ArboCategoryNode {
  categoryId: number;
  categoryName: string;
  level: number;
  children: Record<string, ArboCategoryNode>;
}

interface Arborescence {
  [categoryName: string]: ArboCategoryNode;
}

// Fonction de normalisation de chaîne
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
    .replace(/\s+/g, ' '); // Normaliser les espaces
}

// Calcul de similarité Jaro-Winkler (simplifié)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Similarité simple basée sur les mots communs
  const words1 = new Set(s1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(s2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0.0;

  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) commonWords++;
  }

  const union = words1.size + words2.size - commonWords;
  return union > 0 ? commonWords / union : 0.0;
}

// Collecter tous les categoryIds de l'arborescence
function collectCategoryIds(
  categories: Record<string, ArboCategoryNode>,
  categoryIdMap: Map<number, { name: string; path: string[]; level: number }> = new Map(),
  currentPath: string[] = []
): Map<number, { name: string; path: string[]; level: number }> {
  for (const [name, category] of Object.entries(categories)) {
    const fullPath = [...currentPath, category.categoryName];
    
    categoryIdMap.set(category.categoryId, {
      name: category.categoryName,
      path: fullPath,
      level: category.level,
    });

    if (Object.keys(category.children).length > 0) {
      collectCategoryIds(category.children, categoryIdMap, fullPath);
    }
  }

  return categoryIdMap;
}

// Trouver le meilleur match par similarité dans l'arborescence
function findBestMatchByName(
  productName: string,
  categories: Record<string, ArboCategoryNode>,
  currentPath: string[] = [],
  threshold: number = 0.6
): { categoryId: number; name: string; path: string[]; similarity: number } | null {
  let bestMatch: { categoryId: number; name: string; path: string[]; similarity: number } | null = null;

  for (const [name, category] of Object.entries(categories)) {
    const fullPath = [...currentPath, category.categoryName];
    const similarity = calculateSimilarity(productName, category.categoryName);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          categoryId: category.categoryId,
          name: category.categoryName,
          path: fullPath,
          similarity,
        };
      }
    }

    // Chercher récursivement dans les enfants
    if (Object.keys(category.children).length > 0) {
      const childMatch = findBestMatchByName(productName, category.children, fullPath, threshold);
      if (childMatch && (!bestMatch || childMatch.similarity > bestMatch.similarity)) {
        bestMatch = childMatch;
      }
    }
  }

  return bestMatch;
}

async function matchDbProductGroupsToArborescences() {
  console.log('🚀 Matching des groupes de produits DB avec les arborescences...\n');

  // Charger les arborescences
  const arboFiles = [
    { name: 'arbovoiture', path: path.join(process.cwd(), '..', 'arbovoiture.json') },
    { name: 'arbocamion', path: path.join(process.cwd(), '..', 'arbocamion.json') },
    { name: 'arbotype3', path: path.join(process.cwd(), '..', 'arbotype3.json') },
  ];

  const arborescences: Record<string, { data: Arborescence; categoryIdMap: Map<number, { name: string; path: string[]; level: number }> }> = {};

  for (const arboFile of arboFiles) {
    if (!fs.existsSync(arboFile.path)) {
      console.log(`⚠️  Fichier introuvable: ${arboFile.path}`);
      continue;
    }

    console.log(`📂 Chargement de ${arboFile.name}...`);
    const data: Arborescence = JSON.parse(fs.readFileSync(arboFile.path, 'utf-8'));
    const categoryIdMap = collectCategoryIds(data);
    
    arborescences[arboFile.name] = { data, categoryIdMap };
    console.log(`   ✅ ${categoryIdMap.size} catégories indexées`);
  }

  console.log('');

  // Récupérer tous les ProductGroup de la DB avec leurs catégories
  console.log('📦 Chargement des ProductGroup de la DB...');
  const productGroups = await prisma.productGroup.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  console.log(`   ✅ ${productGroups.length} ProductGroup chargés\n`);

  // Matcher chaque ProductGroup
  const results: Record<string, {
    matches: Array<{
      productGroupId: number;
      productName: string;
      matchType: 'tecdoc-id' | 'name-similarity';
      categoryId: number;
      categoryName: string;
      categoryPath: string[];
      arborescence: string;
      similarity?: number;
    }>;
    unmatched: Array<{
      productGroupId: number;
      productName: string;
    }>;
  }> = {};

  for (const arboName of Object.keys(arborescences)) {
    results[arboName] = { matches: [], unmatched: [] };
  }

  let exactMatches = 0;
  let similarityMatches = 0;
  let unmatched = 0;

  for (const pg of productGroups) {
    let matched = false;

    // Méthode 1: Matching par tecdocCategoryId
    for (const pgCategory of pg.categories) {
      const tecdocCategoryId = pgCategory.category.tecdocCategoryId;
      if (!tecdocCategoryId) continue;

      for (const [arboName, arbo] of Object.entries(arborescences)) {
        const categoryInfo = arbo.categoryIdMap.get(tecdocCategoryId);
        if (categoryInfo) {
          results[arboName].matches.push({
            productGroupId: pg.id,
            productName: pg.productName,
            matchType: 'tecdoc-id',
            categoryId: tecdocCategoryId,
            categoryName: categoryInfo.name,
            categoryPath: categoryInfo.path,
            arborescence: arboName,
          });
          matched = true;
          exactMatches++;
        }
      }
    }

    // Méthode 2: Matching par similarité de nom (si pas de match par ID)
    if (!matched) {
      for (const [arboName, arbo] of Object.entries(arborescences)) {
        const bestMatch = findBestMatchByName(pg.productName, arbo.data, [], 0.6);
        if (bestMatch) {
          results[arboName].matches.push({
            productGroupId: pg.id,
            productName: pg.productName,
            matchType: 'name-similarity',
            categoryId: bestMatch.categoryId,
            categoryName: bestMatch.name,
            categoryPath: bestMatch.path,
            arborescence: arboName,
            similarity: bestMatch.similarity,
          });
          matched = true;
          similarityMatches++;
        }
      }
    }

    if (!matched) {
      for (const arboName of Object.keys(arborescences)) {
        results[arboName].unmatched.push({
          productGroupId: pg.id,
          productName: pg.productName,
        });
      }
      unmatched++;
    }
  }

  // Statistiques
  console.log('📊 Statistiques:\n');
  console.log(`   📦 Total ProductGroup: ${productGroups.length}`);
  console.log(`   ✅ Matches par ID TecDoc: ${exactMatches}`);
  console.log(`   🔍 Matches par similarité: ${similarityMatches}`);
  console.log(`   ❌ Non matchés: ${unmatched}\n`);

  for (const [arboName, result] of Object.entries(results)) {
    console.log(`📊 ${arboName}:`);
    console.log(`   ✅ ${result.matches.length} matches`);
    console.log(`   ❌ ${result.unmatched.length} non matchés`);
    console.log('');
  }

  // Sauvegarder les résultats
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `db-product-groups-arborescences-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalProductGroups: productGroups.length,
      exactMatches,
      similarityMatches,
      unmatched,
    },
    results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);

  await prisma.$disconnect();
}

matchDbProductGroupsToArborescences().catch(console.error);

