// Script pour analyser pourquoi il n'y a pas de matches niveau 3
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface CategoriesByVehicleId {
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

function collectAllCategoryIds(
  categories: Record<string, CategoryNode>,
  categoryIdMap: Map<number, { name: string; path: string[]; level: number }> = new Map(),
  currentPath: string[] = []
): Map<number, { name: string; path: string[]; level: number }> {
  for (const [id, category] of Object.entries(categories)) {
    const categoryIdNum = parseInt(id);
    const fullPath = [...currentPath, category.text];
    const level = fullPath.length;
    
    categoryIdMap.set(categoryIdNum, {
      name: category.text,
      path: fullPath,
      level,
    });

    if (Object.keys(category.children).length > 0) {
      collectAllCategoryIds(category.children, categoryIdMap, fullPath);
    }
  }

  return categoryIdMap;
}

async function analyzeLevel3Matches() {
  console.log('🔍 Analyse des matches niveau 3...\n');

  // Charger categoriesbyvehicleid.json
  const categoriesFilePath = path.join(process.cwd(), '..', 'categoriesbyvehicleid.json');
  const categoriesData: CategoriesByVehicleId = JSON.parse(
    fs.readFileSync(categoriesFilePath, 'utf-8')
  );

  const categoryIdMap = collectAllCategoryIds(categoriesData.categories);
  
  // Statistiques par niveau dans categoriesbyvehicleid.json
  const byLevel: Record<number, number> = {};
  categoryIdMap.forEach((info) => {
    byLevel[info.level] = (byLevel[info.level] || 0) + 1;
  });

  console.log('📊 Catégories dans categoriesbyvehicleid.json par niveau:');
  Object.keys(byLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(level => {
      console.log(`   Niveau ${level}: ${byLevel[parseInt(level)]} catégories`);
    });
  console.log('');

  // Analyser les fichiers tecdoc-results
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');

  const level3IdsInTecDoc = new Set<number>();
  const level3IdsInCategories = new Set<number>();
  const unmatchedLevel3Ids = new Set<number>();
  let totalFiles = 0;
  let filesWithLevel3 = 0;

  const processFile = (filePath: string): void => {
    try {
      const content: TecDocResultFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!content.arborescencePaths) return;

      totalFiles++;

      for (const pathData of content.arborescencePaths) {
        if (!pathData.categoryIds || pathData.categoryIds.length < 3) continue;

        // Le 3ème élément (index 2) serait niveau 3
        const level3Id = pathData.categoryIds[2];
        if (level3Id !== null && level3Id !== undefined) {
          level3IdsInTecDoc.add(level3Id);
          filesWithLevel3++;

          if (categoryIdMap.has(level3Id)) {
            level3IdsInCategories.add(level3Id);
          } else {
            unmatchedLevel3Ids.add(level3Id);
          }
        }
      }
    } catch (e) {
      // Ignorer
    }
  };

  if (fs.existsSync(dir1)) {
    const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.json') && f !== '_progress.json');
    for (const file of files1) {
      processFile(path.join(dir1, file));
    }
  }

  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    for (const file of files2) {
      processFile(path.join(dir2, file));
    }
  }

  console.log('📊 Analyse des IDs niveau 3:\n');
  console.log(`   📁 Total fichiers analysés: ${totalFiles}`);
  console.log(`   📁 Fichiers avec des chemins niveau 3: ${filesWithLevel3}`);
  console.log(`   🔢 IDs niveau 3 uniques dans tecdoc-results: ${level3IdsInTecDoc.size}`);
  console.log(`   ✅ IDs niveau 3 qui existent dans categoriesbyvehicleid.json: ${level3IdsInCategories.size}`);
  console.log(`   ❌ IDs niveau 3 qui n'existent PAS dans categoriesbyvehicleid.json: ${unmatchedLevel3Ids.size}\n`);

  if (unmatchedLevel3Ids.size > 0) {
    console.log('📋 Exemples d\'IDs niveau 3 non trouvés (10 premiers):');
    Array.from(unmatchedLevel3Ids).slice(0, 10).forEach(id => {
      console.log(`   - ${id}`);
    });
    console.log('');
  }

  if (level3IdsInCategories.size > 0) {
    console.log('📋 Exemples d\'IDs niveau 3 trouvés (10 premiers):');
    Array.from(level3IdsInCategories).slice(0, 10).forEach(id => {
      const info = categoryIdMap.get(id);
      if (info) {
        console.log(`   - ${id}: ${info.name} (${info.path.join(' > ')}) - Niveau réel: ${info.level}`);
      }
    });
    console.log('');

    // Vérifier si ces IDs niveau 3 sont vraiment niveau 3 dans categoriesbyvehicleid.json
    console.log('🔍 Vérification: Ces IDs sont-ils vraiment niveau 3 dans categoriesbyvehicleid.json?');
    let realLevel3Count = 0;
    let realLevel2Count = 0;
    Array.from(level3IdsInCategories).forEach(id => {
      const info = categoryIdMap.get(id);
      if (info) {
        if (info.level === 3) {
          realLevel3Count++;
        } else if (info.level === 2) {
          realLevel2Count++;
        }
      }
    });
    console.log(`   ✅ Vrais niveau 3: ${realLevel3Count}`);
    console.log(`   ⚠️  En fait niveau 2: ${realLevel2Count}`);
    console.log('');
  }

  // Vérifier les catégories niveau 3 dans categoriesbyvehicleid.json
  const level3Categories = Array.from(categoryIdMap.entries())
    .filter(([_, info]) => info.level === 3)
    .slice(0, 20);

  console.log('📋 Exemples de catégories niveau 3 dans categoriesbyvehicleid.json (20 premiers):');
  level3Categories.forEach(([id, info]) => {
    console.log(`   - ${id}: ${info.name} (${info.path.join(' > ')})`);
  });
  console.log('');
}

analyzeLevel3Matches().catch(console.error);

