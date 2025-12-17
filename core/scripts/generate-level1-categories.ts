// Script pour générer le premier niveau de l'arborescence basé sur les données réelles
import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  text: string;
  children: Record<string, CategoryNode>;
}

interface ArborescenceData {
  categories: Record<string, CategoryNode>;
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

interface Level1Category {
  id: string;
  name: string;
  tecdocCategoryId: number | null;
  hasProducts: boolean;
  productGroupsCount: number;
  sources: string[];
}

async function generateLevel1Categories() {
  console.log('🚀 Génération du niveau 1 de l\'arborescence...\n');
  
  // 1. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));
  
  // Extraire les catégories de niveau 1
  const level1FromArbo: Map<string, { id: string; name: string }> = new Map();
  for (const [id, node] of Object.entries(arborescence.categories)) {
    level1FromArbo.set(node.text, { id, name: node.text });
  }
  
  console.log(`   ✅ ${level1FromArbo.size} catégories de niveau 1 dans l'arborescence\n`);
  
  // 2. Charger les fichiers TecDoc scrappés
  console.log('📂 Chargement des fichiers TecDoc scrappés...');
  const tecdocFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  const allTecDocCategories: TecDocCategory[] = [];
  const level1FromTecDoc: Map<string, { id: string; name: string; productGroupsCount: number }> = new Map();
  
  for (const file of tecdocFiles) {
    try {
      const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      console.log(`   📄 ${file}: ${data.categories.length} catégories`);
      
      // Extraire les catégories de niveau 2 (qui sont en fait le niveau 1 dans TecDoc)
      data.categories.forEach(cat => {
        if (cat.level === 2) {
          allTecDocCategories.push(cat);
          
          const existing = level1FromTecDoc.get(cat.categoryName);
          if (existing) {
            existing.productGroupsCount += cat.productGroups.length;
          } else {
            level1FromTecDoc.set(cat.categoryName, {
              id: cat.categoryId,
              name: cat.categoryName,
              productGroupsCount: cat.productGroups.length,
            });
          }
        }
      });
    } catch (e) {
      console.warn(`   ⚠️  Erreur lors du chargement de ${file}`);
    }
  }
  
  console.log(`   ✅ ${level1FromTecDoc.size} catégories de niveau 1 dans les fichiers TecDoc\n`);
  
  // 3. Analyser les fichiers TecDoc results pour voir quelles catégories ont des produits
  console.log('📂 Analyse des fichiers TecDoc results...');
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');
  
  const categoryUsage: Map<string, { count: number; sources: Set<string> }> = new Map();
  
  const processTecDocFile = (filePath: string, source: string) => {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content.arborescence && content.arborescencePaths) {
        content.arborescencePaths.forEach((path: any) => {
          if (path.path && path.path.length > 0) {
            const level1Name = path.path[0]; // Premier élément = niveau 1
            const existing = categoryUsage.get(level1Name);
            if (existing) {
              existing.count++;
              existing.sources.add(source);
            } else {
              categoryUsage.set(level1Name, {
                count: 1,
                sources: new Set([source]),
              });
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
      processTecDocFile(path.join(dir1, file), 'tecdoc-results');
      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed}/${files1.length} fichiers traités...`);
      }
    }
    console.log(`   ✅ ${files1.length} fichiers traités dans tecdoc-results`);
  }
  
  if (fs.existsSync(dir2)) {
    const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.json') && f !== '_progress.json');
    for (const file of files2) {
      processTecDocFile(path.join(dir2, file), 'tecdoc-results-other-types');
    }
    console.log(`   ✅ ${files2.length} fichiers traités dans tecdoc-results-other-types`);
  }
  
  console.log(`   ✅ ${categoryUsage.size} catégories de niveau 1 trouvées dans les fichiers results\n`);
  
  // 4. Fusionner toutes les sources pour créer le niveau 1
  console.log('🔗 Fusion des sources...');
  
  const finalLevel1: Map<string, Level1Category> = new Map();
  
  // Ajouter depuis l'arborescence finale
  level1FromArbo.forEach((cat, name) => {
    finalLevel1.set(name, {
      id: cat.id,
      name: cat.name,
      tecdocCategoryId: null,
      hasProducts: false,
      productGroupsCount: 0,
      sources: ['arborescence-finale'],
    });
  });
  
  // Enrichir avec les données TecDoc scrappées
  level1FromTecDoc.forEach((cat, name) => {
    const existing = finalLevel1.get(name);
    if (existing) {
      existing.tecdocCategoryId = parseInt(cat.id) || null;
      existing.productGroupsCount += cat.productGroupsCount;
      existing.hasProducts = existing.hasProducts || cat.productGroupsCount > 0;
      if (!existing.sources.includes('tecdoc-scraped')) {
        existing.sources.push('tecdoc-scraped');
      }
    } else {
      finalLevel1.set(name, {
        id: cat.id,
        name: cat.name,
        tecdocCategoryId: parseInt(cat.id) || null,
        hasProducts: cat.productGroupsCount > 0,
        productGroupsCount: cat.productGroupsCount,
        sources: ['tecdoc-scraped'],
      });
    }
  });
  
  // Enrichir avec les données des fichiers results
  categoryUsage.forEach((usage, name) => {
    const existing = finalLevel1.get(name);
    if (existing) {
      existing.hasProducts = true;
      if (!existing.sources.includes('tecdoc-results')) {
        existing.sources.push('tecdoc-results');
      }
    } else {
      // Chercher une correspondance approximative
      let matched = false;
      for (const [existingName, existingCat] of finalLevel1) {
        if (existingName.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(existingName.toLowerCase())) {
          existingCat.hasProducts = true;
          if (!existingCat.sources.includes('tecdoc-results')) {
            existingCat.sources.push('tecdoc-results');
          }
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        finalLevel1.set(name, {
          id: '', // Pas d'ID connu
          name: name,
          tecdocCategoryId: null,
          hasProducts: true,
          productGroupsCount: 0,
          sources: ['tecdoc-results'],
        });
      }
    }
  });
  
  // Convertir en array et trier
  const level1Array = Array.from(finalLevel1.values())
    .sort((a, b) => {
      // Trier par : d'abord celles avec produits, puis par nom
      if (a.hasProducts !== b.hasProducts) {
        return b.hasProducts ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  
  console.log(`   ✅ ${level1Array.length} catégories de niveau 1 générées\n`);
  
  // 5. Statistiques
  console.log('📊 Statistiques:');
  const withProducts = level1Array.filter(c => c.hasProducts).length;
  const withTecDocId = level1Array.filter(c => c.tecdocCategoryId !== null).length;
  const withProductGroups = level1Array.filter(c => c.productGroupsCount > 0).length;
  
  console.log(`   📦 ${withProducts} catégories avec produits`);
  console.log(`   🆔 ${withTecDocId} catégories avec ID TecDoc`);
  console.log(`   📊 ${withProductGroups} catégories avec groupes de produits`);
  console.log(`   📁 ${level1Array.length} catégories au total\n`);
  
  // 6. Sauvegarder
  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCategories: level1Array.length,
      withProducts: withProducts,
      withTecDocId: withTecDocId,
      withProductGroups: withProductGroups,
      sources: {
        arborescenceFinale: level1FromArbo.size,
        tecdocScraped: level1FromTecDoc.size,
        tecdocResults: categoryUsage.size,
      },
    },
    categories: level1Array,
  };
  
  const outputPath = path.join(process.cwd(), `level1-categories-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`);
  
  // 7. Afficher les catégories
  console.log('📋 Catégories de niveau 1 (20 premières):');
  level1Array.slice(0, 20).forEach((cat, index) => {
    const icons = [];
    if (cat.hasProducts) icons.push('📦');
    if (cat.tecdocCategoryId) icons.push('🆔');
    if (cat.productGroupsCount > 0) icons.push(`📊(${cat.productGroupsCount})`);
    console.log(`   ${index + 1}. ${cat.name} ${icons.join(' ')} [${cat.sources.join(', ')}]`);
  });
  
  if (level1Array.length > 20) {
    console.log(`   ... et ${level1Array.length - 20} autres catégories\n`);
  }
}

generateLevel1Categories().catch(console.error);




























