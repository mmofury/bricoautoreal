// Script pour associer les groupes de produits TecDoc aux catégories de l'arborescence finale
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, CategoryNode>;
}

interface TecDocResultFile {
  productName: string;
  productId?: number;
  arborescencePaths?: Array<{
    path: string[];
    categoryIds: (number | null)[];
    finalCategoryId: number | null;
    productId?: number;
  }>;
}

interface MatchedProductGroup {
  productName: string;
  productId?: number;
  matchedCategories: Array<{
    categoryId: string;
    categoryName: string;
    level: number;
    path: string[];
    confidence: 'exact-id' | 'exact-name' | 'partial-name';
  }>;
  unmatchedPaths: Array<{
    path: string[];
    finalCategoryId: number | null;
  }>;
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

// Extraire toutes les catégories de l'arborescence avec leurs chemins
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

async function matchProductGroupsToArborescence() {
  console.log('🚀 Association des groupes de produits aux catégories...\n');

  // 1. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));

  const allCategories = extractAllCategories(arborescence.categories);
  console.log(`   ✅ ${allCategories.length} catégories extraites\n`);

  // 2. Créer des index pour recherche rapide
  console.log('🔍 Création des index de recherche...');
  
  // Index par ID TecDoc (si on a les IDs dans les chemins)
  const categoriesById = new Map<number, typeof allCategories[0]>();
  
  // Index par nom exact
  const categoriesByName = new Map<string, typeof allCategories[0][]>();
  
  // Index par nom normalisé
  const categoriesByNormalizedName = new Map<string, typeof allCategories[0][]>();

  allCategories.forEach(cat => {
    // Index par nom exact
    if (!categoriesByName.has(cat.name)) {
      categoriesByName.set(cat.name, []);
    }
    categoriesByName.get(cat.name)!.push(cat);

    // Index par nom normalisé
    const normalized = normalizeString(cat.name);
    if (!categoriesByNormalizedName.has(normalized)) {
      categoriesByNormalizedName.set(normalized, []);
    }
    categoriesByNormalizedName.get(normalized)!.push(cat);
  });

  console.log(`   ✅ Index créés\n`);

  // 3. Parcourir tous les fichiers tecdoc-results
  console.log('📂 Traitement des fichiers tecdoc-results...');
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');

  const matchedGroups: MatchedProductGroup[] = [];
  const unmatchedGroups: Array<{ productName: string; productId?: number }> = [];

  const processFile = (filePath: string): void => {
    try {
      const content: TecDocResultFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!content.productName || !content.arborescencePaths || content.arborescencePaths.length === 0) {
        return;
      }

      const matchedCategories: MatchedProductGroup['matchedCategories'] = [];
      const unmatchedPaths: MatchedProductGroup['unmatchedPaths'] = [];

      for (const pathData of content.arborescencePaths) {
        if (!pathData.path || pathData.path.length === 0) {
          continue;
        }

        const finalCategoryId = pathData.finalCategoryId;
        let matched: typeof allCategories[0] | null = null;
        let confidence: 'exact-id' | 'exact-name' | 'partial-name' = 'partial-name';

        // Méthode 1: Chercher par ID TecDoc si disponible (mais l'arborescence finale n'a pas les IDs TecDoc)
        // On passe cette étape car les IDs dans arborescence finale sont différents

        // Méthode 2: Chercher dans le chemin de manière intelligente
        // On va chercher du plus spécifique au moins spécifique, en privilégiant les niveaux profonds
        for (let i = pathData.path.length - 1; i >= 0; i--) {
          const categoryName = pathData.path[i];
          const expectedLevel = i + 1; // Le niveau dans le chemin TecDoc
          
          // Chercher par nom exact avec correspondance de niveau
          const exactMatches = categoriesByName.get(categoryName);
          if (exactMatches && exactMatches.length > 0) {
            // Privilégier la catégorie qui correspond au niveau attendu
            const levelMatch = exactMatches.find(c => c.level === expectedLevel);
            if (levelMatch) {
              matched = levelMatch;
              confidence = 'exact-name';
              break;
            }
            // Sinon prendre la première, mais seulement si on est au niveau 2 ou plus profond
            if (expectedLevel >= 2) {
              matched = exactMatches[0];
              confidence = 'exact-name';
              break;
            }
          }

          // Chercher par nom normalisé avec correspondance de niveau
          if (!matched) {
            const normalized = normalizeString(categoryName);
            const normalizedMatches = categoriesByNormalizedName.get(normalized);
            if (normalizedMatches && normalizedMatches.length > 0) {
              const levelMatch = normalizedMatches.find(c => c.level === expectedLevel);
              if (levelMatch) {
                matched = levelMatch;
                confidence = 'partial-name';
                break;
              }
              // Sinon prendre la première, mais seulement si on est au niveau 2 ou plus profond
              if (expectedLevel >= 2) {
                matched = normalizedMatches[0];
                confidence = 'partial-name';
                break;
              }
            }
          }
        }

        // Méthode 3: Si toujours pas trouvé, chercher n'importe quelle correspondance (fallback)
        if (!matched) {
          for (let i = pathData.path.length - 1; i >= 0; i--) {
            const categoryName = pathData.path[i];
            const matches = categoriesByName.get(categoryName);
            if (matches && matches.length > 0) {
              matched = matches[0];
              confidence = 'partial-name';
              break;
            }
          }
        }

        if (matched) {
          matchedCategories.push({
            categoryId: matched.id,
            categoryName: matched.name,
            level: matched.level,
            path: matched.path,
            confidence,
          });
        } else {
          unmatchedPaths.push({
            path: pathData.path,
            finalCategoryId: finalCategoryId,
          });
        }
      }

      if (matchedCategories.length > 0) {
        matchedGroups.push({
          productName: content.productName,
          productId: content.productId,
          matchedCategories: matchedCategories,
          unmatchedPaths: unmatchedPaths,
        });
      } else {
        unmatchedGroups.push({
          productName: content.productName,
          productId: content.productId,
        });
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  };

  let processed = 0;
  let totalFiles = 0;

  if (fs.existsSync(dir1)) {
    const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.json') && f !== '_progress.json');
    totalFiles += files1.length;
    for (const file of files1) {
      processFile(path.join(dir1, file));
      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed} fichiers traités...`);
      }
    }
  }

  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    totalFiles += files2.length;
    for (const file of files2) {
      processFile(path.join(dir2, file));
      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed} fichiers traités...`);
      }
    }
  }

  console.log(`   ✅ ${processed} fichiers traités\n`);

  // 4. Statistiques
  console.log('📊 Statistiques:\n');
  console.log(`   ✅ Groupes avec correspondance: ${matchedGroups.length} (${((matchedGroups.length / processed) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Groupes sans correspondance: ${unmatchedGroups.length} (${((unmatchedGroups.length / processed) * 100).toFixed(1)}%)\n`);

  // Compter les types de correspondances
  let exactNameMatches = 0;
  let partialNameMatches = 0;

  matchedGroups.forEach(group => {
    group.matchedCategories.forEach(cat => {
      if (cat.confidence === 'exact-name') {
        exactNameMatches++;
      } else {
        partialNameMatches++;
      }
    });
  });

  console.log(`   📌 Correspondances exactes (nom): ${exactNameMatches}`);
  console.log(`   📌 Correspondances partielles (nom normalisé): ${partialNameMatches}\n`);

  // 5. Sauvegarder les résultats
  const outputDir = process.cwd();
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '-');

  // Fichier principal avec toutes les associations
  const outputFile = path.join(outputDir, `product-groups-categories-${timestamp}.json`);
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalProductGroups: processed,
          matchedGroups: matchedGroups.length,
          unmatchedGroups: unmatchedGroups.length,
          totalCategories: allCategories.length,
        },
        matchedGroups: matchedGroups,
        unmatchedGroups: unmatchedGroups,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`💾 Résultats sauvegardés dans: ${outputFile}\n`);

  // Fichier simplifié pour import (uniquement les meilleures correspondances)
  const simplifiedFile = path.join(outputDir, `product-groups-categories-simplified-${timestamp}.json`);
  const simplified = matchedGroups.map(group => {
    // Prendre la meilleure correspondance (exacte > partielle, niveau le plus profond)
    const bestMatch = group.matchedCategories
      .sort((a, b) => {
        if (a.confidence === 'exact-name' && b.confidence !== 'exact-name') return -1;
        if (b.confidence === 'exact-name' && a.confidence !== 'exact-name') return 1;
        return b.level - a.level; // Plus profond = mieux
      })[0];

    return {
      productName: group.productName,
      productId: group.productId,
      categoryId: bestMatch.categoryId,
      categoryName: bestMatch.categoryName,
      categoryLevel: bestMatch.level,
      categoryPath: bestMatch.path,
      confidence: bestMatch.confidence,
    };
  });

  fs.writeFileSync(
    simplifiedFile,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalAssociations: simplified.length,
        },
        associations: simplified,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`💾 Fichier simplifié sauvegardé dans: ${simplifiedFile}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de correspondances:\n');
  matchedGroups.slice(0, 5).forEach(group => {
    console.log(`   "${group.productName}":`);
    group.matchedCategories.slice(0, 2).forEach(cat => {
      console.log(`      → ${cat.categoryName} (niveau ${cat.level}, ${cat.confidence})`);
      console.log(`        Chemin: ${cat.path.join(' > ')}`);
    });
    console.log('');
  });

  if (unmatchedGroups.length > 0) {
    console.log('❌ Exemples de groupes sans correspondance:\n');
    unmatchedGroups.slice(0, 10).forEach(group => {
      console.log(`   - "${group.productName}"`);
    });
    console.log('');
  }
}

matchProductGroupsToArborescence().catch(console.error);

