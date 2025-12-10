// Script pour générer le niveau 2 de l'arborescence avec la hiérarchie niveau 1 -> niveau 2
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, CategoryNode>;
}

interface Level1Category {
  id: string;
  name: string;
  tecdocCategoryId: number | null;
  hasProducts: boolean;
  productGroupsCount: number;
  sources: string[];
}

interface Level2Category {
  id: string;
  name: string;
  tecdocCategoryId: number | null;
  hasProducts: boolean;
  productGroupsCount: number;
  sources: string[];
  parentLevel1Id: string;
  parentLevel1Name: string;
}

interface TecDocCategory {
  categoryId: string;
  categoryName: string;
  level: number;
  productGroups: Array<{ id: string; name: string }>;
  url: string;
}

interface TecDocData {
  metadata: any;
  categories: TecDocCategory[];
}

interface HierarchyLevel1 {
  id: string;
  name: string;
  tecdocCategoryId: number | null;
  hasProducts: boolean;
  productGroupsCount: number;
  sources: string[];
  children: Level2Category[];
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

function findBestMatch(name: string, candidates: string[]): string | null {
  const normName = normalizeString(name);
  
  for (const candidate of candidates) {
    const normCandidate = normalizeString(candidate);
    if (normName === normCandidate) return candidate;
    if (normName.includes(normCandidate) || normCandidate.includes(normName)) {
      return candidate;
    }
  }
  
  return null;
}

async function generateLevel2Categories() {
  console.log('🚀 Génération du niveau 2 de l\'arborescence...\n');
  
  // 1. Charger le niveau 1
  console.log('📂 Chargement du niveau 1...');
  const level1Path = path.join(process.cwd(), 'level1-categories-2025-12-04.json');
  const level1Data = JSON.parse(fs.readFileSync(level1Path, 'utf-8'));
  const level1Categories: Level1Category[] = level1Data.categories;
  
  const level1Map = new Map<string, Level1Category>();
  level1Categories.forEach(cat => {
    level1Map.set(cat.name, cat);
  });
  
  console.log(`   ✅ ${level1Categories.length} catégories de niveau 1 chargées\n`);
  
  // 2. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));
  
  // Extraire les catégories niveau 2 depuis l'arborescence
  const level2FromArbo: Map<string, { id: string; name: string; parentLevel1Name: string }> = new Map();
  
  for (const [level1Id, level1Node] of Object.entries(arborescence.categories)) {
    const level1Name = level1Node.text;
    
    // Chercher le parent niveau 1 correspondant
    const parentLevel1 = findBestMatch(level1Name, Array.from(level1Map.keys()));
    if (!parentLevel1) continue;
    
    // Extraire les enfants (niveau 2)
    if (level1Node.children) {
      for (const [level2Id, level2Node] of Object.entries(level1Node.children)) {
        const key = `${parentLevel1}::${level2Node.text}`;
        level2FromArbo.set(key, {
          id: level2Id,
          name: level2Node.text,
          parentLevel1Name: parentLevel1,
        });
      }
    }
  }
  
  console.log(`   ✅ ${level2FromArbo.size} catégories de niveau 2 dans l'arborescence\n`);
  
  // 3. Charger les fichiers TecDoc scrappés
  console.log('📂 Chargement des fichiers TecDoc scrappés...');
  const tecdocFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  const level2FromTecDoc: Map<string, { id: string; name: string; parentLevel1Name: string; productGroupsCount: number }> = new Map();
  
  for (const file of tecdocFiles) {
    try {
      const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      
      // Dans les fichiers TecDoc scrappés:
      // - level 2 = catégories niveau 1 (ex: "Accessoires", "Alimentation carburant")
      // - level 3 = catégories niveau 2 (ex: "Coffre/chargement/plateau de chargement")
      
      // Créer un index des catégories niveau 1 (level 2) par leur ID
      const level1ById = new Map<string, string>();
      data.categories.forEach(cat => {
        if (cat.level === 2) {
          const parentLevel1 = findBestMatch(cat.categoryName, Array.from(level1Map.keys()));
          if (parentLevel1) {
            level1ById.set(cat.categoryId, parentLevel1);
          }
        }
      });
      
      // Extraire les catégories de niveau 3 (qui sont niveau 2 dans notre hiérarchie)
      // On doit trouver leur parent niveau 1 en cherchant dans l'URL ou en utilisant la structure
      data.categories.forEach(cat => {
        if (cat.level === 3) {
          // Essayer de trouver le parent via l'URL (qui contient assemblyGroupId)
          // Ou chercher dans les catégories précédentes
          let parentLevel1Name: string | null = null;
          
          // Méthode 1: Chercher dans les catégories de niveau 2 qui précèdent
          const currentIndex = data.categories.indexOf(cat);
          for (let i = currentIndex - 1; i >= 0; i--) {
            const prevCat = data.categories[i];
            if (prevCat.level === 2) {
              parentLevel1Name = findBestMatch(prevCat.categoryName, Array.from(level1Map.keys()));
              if (parentLevel1Name) break;
            }
          }
          
          // Méthode 2: Si pas trouvé, chercher par correspondance de nom
          if (!parentLevel1Name) {
            parentLevel1Name = findBestMatch(cat.categoryName, Array.from(level1Map.keys()));
          }
          
          if (parentLevel1Name) {
            const key = `${parentLevel1Name}::${cat.categoryName}`;
            const existing = level2FromTecDoc.get(key);
            if (existing) {
              existing.productGroupsCount += cat.productGroups.length;
            } else {
              level2FromTecDoc.set(key, {
                id: cat.categoryId,
                name: cat.categoryName,
                parentLevel1Name: parentLevel1Name,
                productGroupsCount: cat.productGroups.length,
              });
            }
          }
        }
      });
    } catch (e) {
      // Ignorer les erreurs
    }
  }
  
  console.log(`   ✅ ${level2FromTecDoc.size} catégories de niveau 2 dans les fichiers TecDoc\n`);
  
  // 4. Analyser les fichiers TecDoc results
  console.log('📂 Analyse des fichiers TecDoc results...');
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');
  
  const level2FromResults: Map<string, { name: string; parentLevel1Name: string; count: number }> = new Map();
  
  const processTecDocFile = (filePath: string) => {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content.arborescencePaths) {
        content.arborescencePaths.forEach((path: any) => {
          if (path.path && path.path.length >= 2) {
            const level1Name = path.path[0];
            const level2Name = path.path[1];
            
            const parentLevel1 = findBestMatch(level1Name, Array.from(level1Map.keys()));
            if (parentLevel1) {
              const key = `${parentLevel1}::${level2Name}`;
              const existing = level2FromResults.get(key);
              if (existing) {
                existing.count++;
              } else {
                level2FromResults.set(key, {
                  name: level2Name,
                  parentLevel1Name: parentLevel1,
                  count: 1,
                });
              }
            }
          }
        });
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  };
  
  if (fs.existsSync(dir1)) {
    const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.json') && f !== '_progress.json');
    let processed = 0;
    for (const file of files1) {
      processTecDocFile(path.join(dir1, file));
      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed}/${files1.length} fichiers traités...`);
      }
    }
  }
  
  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    for (const file of files2) {
      processTecDocFile(path.join(dir2, file));
    }
  }
  
  console.log(`   ✅ ${level2FromResults.size} catégories de niveau 2 trouvées dans les fichiers results\n`);
  
  // 5. Fusionner toutes les sources
  console.log('🔗 Fusion des sources...');
  
  const hierarchy: Map<string, HierarchyLevel1> = new Map();
  
  // Initialiser avec le niveau 1
  level1Categories.forEach(level1 => {
    hierarchy.set(level1.name, {
      ...level1,
      children: [],
    });
  });
  
  // Ajouter les catégories niveau 2 depuis l'arborescence
  level2FromArbo.forEach((level2, key) => {
    const [parentName] = key.split('::');
    const parent = hierarchy.get(parentName);
    if (parent) {
      const existing = parent.children.find(c => c.name === level2.name);
      if (!existing) {
        parent.children.push({
          id: level2.id,
          name: level2.name,
          tecdocCategoryId: null,
          hasProducts: false,
          productGroupsCount: 0,
          sources: ['arborescence-finale'],
          parentLevel1Id: parent.id,
          parentLevel1Name: parent.name,
        });
      }
    }
  });
  
  // Enrichir avec les données TecDoc scrappées
  level2FromTecDoc.forEach((level2, key) => {
    const [parentName] = key.split('::');
    const parent = hierarchy.get(parentName);
    if (parent) {
      let existing = parent.children.find(c => 
        c.name === level2.name || 
        normalizeString(c.name) === normalizeString(level2.name)
      );
      
      if (existing) {
        existing.tecdocCategoryId = parseInt(level2.id) || null;
        existing.productGroupsCount += level2.productGroupsCount;
        existing.hasProducts = existing.hasProducts || level2.productGroupsCount > 0;
        if (!existing.sources.includes('tecdoc-scraped')) {
          existing.sources.push('tecdoc-scraped');
        }
      } else {
        parent.children.push({
          id: level2.id,
          name: level2.name,
          tecdocCategoryId: parseInt(level2.id) || null,
          hasProducts: level2.productGroupsCount > 0,
          productGroupsCount: level2.productGroupsCount,
          sources: ['tecdoc-scraped'],
          parentLevel1Id: parent.id,
          parentLevel1Name: parent.name,
        });
      }
    }
  });
  
  // Enrichir avec les données des fichiers results
  level2FromResults.forEach((level2, key) => {
    const [parentName] = key.split('::');
    const parent = hierarchy.get(parentName);
    if (parent) {
      let existing = parent.children.find(c => 
        c.name === level2.name || 
        normalizeString(c.name) === normalizeString(level2.name)
      );
      
      if (existing) {
        existing.hasProducts = true;
        if (!existing.sources.includes('tecdoc-results')) {
          existing.sources.push('tecdoc-results');
        }
      } else {
        parent.children.push({
          id: '',
          name: level2.name,
          tecdocCategoryId: null,
          hasProducts: true,
          productGroupsCount: 0,
          sources: ['tecdoc-results'],
          parentLevel1Id: parent.id,
          parentLevel1Name: parent.name,
        });
      }
    }
  });
  
  // Trier les enfants de chaque niveau 1
  hierarchy.forEach(level1 => {
    level1.children.sort((a, b) => {
      if (a.hasProducts !== b.hasProducts) {
        return b.hasProducts ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  });
  
  const hierarchyArray = Array.from(hierarchy.values())
    .sort((a, b) => {
      if (a.hasProducts !== b.hasProducts) {
        return b.hasProducts ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  
  const totalLevel2 = hierarchyArray.reduce((sum, level1) => sum + level1.children.length, 0);
  
  console.log(`   ✅ ${hierarchyArray.length} catégories de niveau 1 avec ${totalLevel2} catégories de niveau 2\n`);
  
  // 6. Statistiques
  console.log('📊 Statistiques:');
  const level2WithProducts = hierarchyArray.reduce((sum, level1) => 
    sum + level1.children.filter(c => c.hasProducts).length, 0
  );
  const level2WithTecDocId = hierarchyArray.reduce((sum, level1) => 
    sum + level1.children.filter(c => c.tecdocCategoryId !== null).length, 0
  );
  const level2WithProductGroups = hierarchyArray.reduce((sum, level1) => 
    sum + level1.children.filter(c => c.productGroupsCount > 0).length, 0
  );
  
  console.log(`   📦 ${level2WithProducts} catégories niveau 2 avec produits`);
  console.log(`   🆔 ${level2WithTecDocId} catégories niveau 2 avec ID TecDoc`);
  console.log(`   📊 ${level2WithProductGroups} catégories niveau 2 avec groupes de produits`);
  console.log(`   📁 ${totalLevel2} catégories niveau 2 au total\n`);
  
  // 7. Sauvegarder
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalLevel1: hierarchyArray.length,
      totalLevel2: totalLevel2,
      level2WithProducts: level2WithProducts,
      level2WithTecDocId: level2WithTecDocId,
      level2WithProductGroups: level2WithProductGroups,
    },
    hierarchy: hierarchyArray,
  };
  
  const outputPath = path.join(process.cwd(), `level1-level2-hierarchy-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
  
  // 8. Afficher quelques exemples
  console.log('📋 Exemples de hiérarchie (5 premières catégories niveau 1):');
  hierarchyArray.slice(0, 5).forEach((level1, index) => {
    console.log(`\n   ${index + 1}. ${level1.name} (${level1.children.length} enfants)`);
    level1.children.slice(0, 5).forEach((level2, idx) => {
      const icons = [];
      if (level2.hasProducts) icons.push('📦');
      if (level2.tecdocCategoryId) icons.push('🆔');
      if (level2.productGroupsCount > 0) icons.push(`📊(${level2.productGroupsCount})`);
      console.log(`      └─ ${level2.name} ${icons.join(' ')}`);
    });
    if (level1.children.length > 5) {
      console.log(`      ... et ${level1.children.length - 5} autres`);
    }
  });
  
  console.log('');
}

generateLevel2Categories().catch(console.error);

