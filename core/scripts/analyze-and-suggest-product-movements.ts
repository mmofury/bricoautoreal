// Script pour analyser l'arborescence et suggérer des déplacements de groupes de produits
import * as fs from 'fs';
import * as path from 'path';

interface ProductGroup {
  productName: string;
  productId?: number;
  confidence: string;
}

interface EnrichedCategoryNode {
  id: string;
  name: string;
  level: number;
  path: string[];
  productGroups: ProductGroup[];
  children: Record<string, EnrichedCategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, EnrichedCategoryNode>;
}

interface MovementSuggestion {
  productName: string;
  productId?: number;
  currentCategory: {
    id: string;
    name: string;
    level: number;
    path: string[];
  };
  suggestedCategory: {
    id: string;
    name: string;
    level: number;
    path: string[];
    similarity: number;
    reason: string;
  };
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
  
  // Vérifier si un mot clé du produit est dans le nom de la catégorie
  const productWords = norm1.split(' ').filter(w => w.length > 3);
  const categoryWords = norm2.split(' ').filter(w => w.length > 3);
  
  let matchingWords = 0;
  for (const pWord of productWords) {
    if (categoryWords.some(cWord => cWord.includes(pWord) || pWord.includes(cWord))) {
      matchingWords++;
    }
  }
  
  if (matchingWords > 0 && productWords.length > 0) {
    return matchingWords / productWords.length;
  }
  
  // Vérifier si le nom de la catégorie contient un mot clé du produit
  if (norm2.includes(norm1) || norm1.includes(norm2)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return shorter / longer;
  }
  
  return 0;
}

function findBestMatchCategory(
  productName: string,
  currentCategory: EnrichedCategoryNode,
  allCategories: EnrichedCategoryNode[]
): { category: EnrichedCategoryNode; similarity: number; reason: string } | null {
  // Filtrer les catégories : niveau 2-4, dans le même arbre que la catégorie actuelle
  const candidateCategories = allCategories.filter(cat => {
    // Doit être un descendant ou dans le même arbre
    const isInSameTree = cat.path[0] === currentCategory.path[0];
    // Doit être niveau 2, 3 ou 4
    const isDeepEnough = cat.level >= 2 && cat.level <= 4;
    // Ne doit pas être la catégorie actuelle
    const isNotCurrent = cat.id !== currentCategory.id;
    
    return isInSameTree && isDeepEnough && isNotCurrent;
  });
  
  let bestMatch: { category: EnrichedCategoryNode; similarity: number; reason: string } | null = null;
  
  for (const candidate of candidateCategories) {
    const similarity = calculateSimilarity(productName, candidate.name);
    
    // Vérifier aussi si le chemin complet contient des mots clés
    const pathSimilarity = calculateSimilarity(productName, candidate.path.join(' '));
    const combinedSimilarity = Math.max(similarity, pathSimilarity * 0.8);
    
    if (combinedSimilarity > 0.3 && (!bestMatch || combinedSimilarity > bestMatch.similarity)) {
      let reason = '';
      if (similarity > 0.5) {
        reason = `Nom de catégorie très similaire ("${candidate.name}")`;
      } else if (pathSimilarity > 0.5) {
        reason = `Chemin de catégorie très similaire ("${candidate.path.join(' > ')}")`;
      } else {
        reason = `Mots clés communs avec "${candidate.name}"`;
      }
      
      bestMatch = {
        category: candidate,
        similarity: combinedSimilarity,
        reason,
      };
    }
  }
  
  return bestMatch;
}

function collectAllCategories(
  categories: Record<string, EnrichedCategoryNode>,
  result: EnrichedCategoryNode[] = []
): EnrichedCategoryNode[] {
  for (const category of Object.values(categories)) {
    result.push(category);
    if (Object.keys(category.children).length > 0) {
      collectAllCategories(category.children, result);
    }
  }
  return result;
}

async function analyzeAndSuggestMovements() {
  console.log('🔍 Analyse de l\'arborescence et suggestions de déplacements...\n');

  // 1. Charger l'arborescence complète
  console.log('📂 Chargement de l\'arborescence complète...');
  const arborescenceFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('arborescence-complete-with-products-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (arborescenceFiles.length === 0) {
    console.error('❌ Aucun fichier arborescence-complete-with-products-*.json trouvé!');
    console.error('   Exécutez d\'abord: pnpm tecdoc:generate-full-arbo');
    return;
  }

  const latestFile = arborescenceFiles[0];
  console.log(`   ✅ Fichier trouvé: ${latestFile}`);
  const data: ArborescenceData = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
  console.log(`   ✅ Arborescence chargée\n`);

  // 2. Collecter toutes les catégories pour recherche
  console.log('🔍 Collecte de toutes les catégories...');
  const allCategories = collectAllCategories(data.categories);
  console.log(`   ✅ ${allCategories.length} catégories collectées\n`);

  // 3. Identifier les catégories de niveau 1 avec groupes de produits
  console.log('🔍 Analyse des catégories de niveau 1...');
  const level1CategoriesWithProducts: EnrichedCategoryNode[] = [];
  
  for (const category of Object.values(data.categories)) {
    if (category.level === 1 && category.productGroups.length > 0) {
      level1CategoriesWithProducts.push(category);
    }
  }

  console.log(`   ✅ ${level1CategoriesWithProducts.length} catégories de niveau 1 avec groupes de produits\n`);

  // 4. Analyser chaque groupe de produit au niveau 1
  console.log('🔄 Analyse des groupes de produits...');
  const suggestions: MovementSuggestion[] = [];
  let totalLevel1Products = 0;
  let productsWithSuggestions = 0;

  for (const level1Category of level1CategoriesWithProducts) {
    for (const productGroup of level1Category.productGroups) {
      totalLevel1Products++;
      
      const bestMatch = findBestMatchCategory(
        productGroup.productName,
        level1Category,
        allCategories
      );

      if (bestMatch && bestMatch.similarity > 0.4) {
        productsWithSuggestions++;
        suggestions.push({
          productName: productGroup.productName,
          productId: productGroup.productId,
          currentCategory: {
            id: level1Category.id,
            name: level1Category.name,
            level: level1Category.level,
            path: level1Category.path,
          },
          suggestedCategory: {
            id: bestMatch.category.id,
            name: bestMatch.category.name,
            level: bestMatch.category.level,
            path: bestMatch.category.path,
            similarity: bestMatch.similarity,
            reason: bestMatch.reason,
          },
        });
      }
    }
  }

  console.log(`   ✅ ${totalLevel1Products} groupes de produits analysés`);
  console.log(`   💡 ${productsWithSuggestions} suggestions de déplacement trouvées\n`);

  // 5. Statistiques
  console.log('📊 Statistiques:\n');
  console.log(`   📦 Groupes de produits au niveau 1: ${totalLevel1Products}`);
  console.log(`   💡 Suggestions de déplacement: ${productsWithSuggestions} (${((productsWithSuggestions / totalLevel1Products) * 100).toFixed(1)}%)\n`);

  // Répartition par niveau suggéré
  const bySuggestedLevel: Record<number, number> = {};
  suggestions.forEach(s => {
    bySuggestedLevel[s.suggestedCategory.level] = (bySuggestedLevel[s.suggestedCategory.level] || 0) + 1;
  });

  console.log('📊 Répartition par niveau suggéré:');
  Object.keys(bySuggestedLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(level => {
      console.log(`   Niveau ${level}: ${bySuggestedLevel[parseInt(level)]} suggestions`);
    });
  console.log('');

  // Répartition par similarité
  const bySimilarity: { high: number; medium: number; low: number } = { high: 0, medium: 0, low: 0 };
  suggestions.forEach(s => {
    if (s.suggestedCategory.similarity >= 0.7) {
      bySimilarity.high++;
    } else if (s.suggestedCategory.similarity >= 0.5) {
      bySimilarity.medium++;
    } else {
      bySimilarity.low++;
    }
  });

  console.log('📊 Répartition par confiance:');
  console.log(`   🔴 Haute confiance (≥70%): ${bySimilarity.high}`);
  console.log(`   🟡 Confiance moyenne (50-70%): ${bySimilarity.medium}`);
  console.log(`   🟢 Confiance faible (40-50%): ${bySimilarity.low}`);
  console.log('');

  // 6. Sauvegarder les suggestions
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), `product-movement-suggestions-${timestamp}.json`);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalLevel1Products,
      suggestionsCount: suggestions.length,
      bySuggestedLevel,
      bySimilarity,
    },
    suggestions: suggestions.sort((a, b) => b.suggestedCategory.similarity - a.suggestedCategory.similarity),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`💾 Suggestions sauvegardées dans: ${outputPath}\n`);

  // 7. Afficher quelques exemples
  console.log('📋 Exemples de suggestions (par ordre de confiance):\n');
  suggestions
    .sort((a, b) => b.suggestedCategory.similarity - a.suggestedCategory.similarity)
    .slice(0, 15)
    .forEach((s, idx) => {
      const confidence = s.suggestedCategory.similarity >= 0.7 ? '🔴' : s.suggestedCategory.similarity >= 0.5 ? '🟡' : '🟢';
      console.log(`${idx + 1}. ${confidence} "${s.productName}"`);
      console.log(`   Actuel: ${s.currentCategory.name} (niveau ${s.currentCategory.level})`);
      console.log(`   Suggéré: ${s.suggestedCategory.name} (niveau ${s.suggestedCategory.level})`);
      console.log(`   Chemin: ${s.suggestedCategory.path.join(' > ')}`);
      console.log(`   Similarité: ${(s.suggestedCategory.similarity * 100).toFixed(0)}% - ${s.suggestedCategory.reason}`);
      console.log('');
    });
}

analyzeAndSuggestMovements().catch(console.error);

























