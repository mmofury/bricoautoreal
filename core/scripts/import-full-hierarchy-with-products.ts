// Script pour importer toute la hiérarchie TecDoc avec groupes de produits dans la DB
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

interface CategoryWithProducts {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  tecdocCategoryId: number | null;
  productGroups: Array<{ id: string; name: string }>;
  path: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function extractAllCategories(
  categories: Record<string, CategoryNode>,
  level: number = 1,
  parentId: string | null = null,
  path: string[] = []
): CategoryWithProducts[] {
  const result: CategoryWithProducts[] = [];
  
  for (const [id, node] of Object.entries(categories)) {
    const currentPath = [...path, node.text];
    
    result.push({
      id,
      name: node.text,
      level,
      parentId,
      tecdocCategoryId: null,
      productGroups: [],
      path: currentPath,
    });
    
    // Récursivement extraire les enfants
    if (node.children && Object.keys(node.children).length > 0) {
      result.push(...extractAllCategories(node.children, level + 1, id, currentPath));
    }
  }
  
  return result;
}

async function importFullHierarchy() {
  console.log('🚀 Import de la hiérarchie complète avec groupes de produits...\n');
  
  // 1. Charger l'arborescence finale
  console.log('📂 Chargement de l\'arborescence finale...');
  const arborescencePath = path.join(process.cwd(), '..', 'arborescence finale.json');
  const arborescence: ArborescenceData = JSON.parse(fs.readFileSync(arborescencePath, 'utf-8'));
  
  const allCategories = extractAllCategories(arborescence.categories);
  console.log(`   ✅ ${allCategories.length} catégories extraites (tous niveaux)\n`);
  
  // 2. Indexer les catégories par ID TecDoc et par nom
  const categoriesByTecDocId = new Map<number, CategoryWithProducts>();
  const categoriesByName = new Map<string, CategoryWithProducts[]>();
  
  allCategories.forEach(cat => {
    if (cat.tecdocCategoryId) {
      categoriesByTecDocId.set(cat.tecdocCategoryId, cat);
    }
    if (!categoriesByName.has(cat.name)) {
      categoriesByName.set(cat.name, []);
    }
    categoriesByName.get(cat.name)!.push(cat);
  });
  
  // 3. Charger les fichiers TecDoc scrappés pour enrichir avec les groupes de produits
  console.log('📂 Chargement des fichiers TecDoc scrappés...');
  const tecdocFiles = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('tecdoc-categories-products-') && f.endsWith('.json'))
    .sort();
  
  for (const file of tecdocFiles) {
    try {
      const data: TecDocData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      console.log(`   📄 ${file}: ${data.categories.length} catégories`);
      
      data.categories.forEach(tecdocCat => {
        // Chercher la catégorie correspondante
        let matchedCategory: CategoryWithProducts | null = null;
        
        // Méthode 1: Par ID TecDoc
        if (tecdocCat.categoryId) {
          const tecdocId = parseInt(tecdocCat.categoryId);
          if (!isNaN(tecdocId)) {
            matchedCategory = categoriesByTecDocId.get(tecdocId) || null;
          }
        }
        
        // Méthode 2: Par nom (chercher dans tous les niveaux)
        if (!matchedCategory) {
          const candidates = categoriesByName.get(tecdocCat.categoryName);
          if (candidates && candidates.length > 0) {
            // Prendre la première qui correspond au niveau (ou la plus proche)
            matchedCategory = candidates.find(c => c.level === tecdocCat.level) || candidates[0];
          }
        }
        
        if (matchedCategory) {
          // Enrichir la catégorie
          if (tecdocCat.categoryId) {
            const tecdocId = parseInt(tecdocCat.categoryId);
            if (!isNaN(tecdocId)) {
              matchedCategory.tecdocCategoryId = tecdocId;
              categoriesByTecDocId.set(tecdocId, matchedCategory);
            }
          }
          
          // Ajouter les groupes de produits (éviter les doublons)
          tecdocCat.productGroups.forEach(pg => {
            const exists = matchedCategory!.productGroups.some(
              existing => existing.id === pg.id
            );
            if (!exists) {
              matchedCategory!.productGroups.push(pg);
            }
          });
        }
      });
    } catch (e) {
      console.warn(`   ⚠️  Erreur lors du chargement de ${file}`);
    }
  }
  
  // 4. Enrichir avec les fichiers tecdoc-results (qui contiennent les chemins complets)
  console.log('\n📂 Enrichissement avec les fichiers tecdoc-results...');
  const dir1 = path.join(process.cwd(), 'tecdoc-results');
  const dir2 = path.join(process.cwd(), 'tecdoc-results-other-types');
  
  const processTecDocResultFile = (filePath: string) => {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content.arborescencePaths && content.productName) {
        // Trouver le ProductGroup correspondant
        const productGroupName = content.productName;
        
        content.arborescencePaths.forEach((pathData: any) => {
          if (pathData.path && pathData.path.length > 0) {
            // Le chemin contient les noms des catégories de haut en bas
            // On va chercher la catégorie la plus profonde (dernier élément)
            const categoryName = pathData.path[pathData.path.length - 1];
            const candidates = categoriesByName.get(categoryName);
            
            if (candidates && candidates.length > 0) {
              // Prendre la catégorie qui correspond au niveau du chemin
              const level = pathData.path.length;
              let matchedCategory = candidates.find(c => c.level === level);
              if (!matchedCategory) {
                matchedCategory = candidates[0];
              }
              
              // Ajouter le groupe de produits si on le trouve dans la DB
              // On va le faire plus tard lors de l'import
              // Pour l'instant, on marque juste que cette catégorie a des produits
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
      processTecDocResultFile(path.join(dir1, file));
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
      processTecDocResultFile(path.join(dir2, file));
    }
    console.log(`   ✅ ${files2.length} fichiers traités dans tecdoc-results-other-types`);
  }
  
  console.log(`\n✅ Enrichissement terminé\n`);
  
  // 3. Créer un index des catégories par ID pour la création des relations parent-enfant
  const categoriesById = new Map<string, CategoryWithProducts>();
  allCategories.forEach(cat => {
    categoriesById.set(cat.id, cat);
  });
  
  // 4. Importer dans la base de données
  console.log('💾 Import dans la base de données...\n');
  
  const createdCategories = new Map<string, number>(); // id -> dbId
  let imported = 0;
  let withProducts = 0;
  let productGroupRelations = 0;
  
  // Charger tous les slugs existants dans la DB une fois
  console.log('   🔍 Vérification des slugs existants...');
  const existingCategories = await db.tecDocCategory.findMany({
    select: { slug: true, displayId: true },
  });
  const existingSlugs = new Set<string>(existingCategories.map(c => c.slug));
  const slugToDisplayId = new Map<string, string>();
  existingCategories.forEach(c => {
    if (c.displayId) {
      slugToDisplayId.set(c.slug, c.displayId);
    }
  });
  console.log(`   ✅ ${existingSlugs.size} slugs existants chargés\n`);
  
  // Trier par niveau pour créer les parents avant les enfants
  const sortedCategories = allCategories.sort((a, b) => a.level - b.level);
  
  // Track des slugs utilisés dans cette session pour éviter les conflits
  const usedSlugs = new Set<string>();
  
  for (const category of sortedCategories) {
    try {
      // Générer le slug de base
      let baseSlug = slugify(category.name);
      const displayId = category.id;
      
      // Trouver un slug unique
      let finalSlug = baseSlug;
      let suffix = 1;
      
      // Vérifier si le slug existe déjà (dans cette session ou dans la DB)
      while (usedSlugs.has(finalSlug) || 
             (existingSlugs.has(finalSlug) && slugToDisplayId.get(finalSlug) !== displayId)) {
        finalSlug = `${baseSlug}-${displayId}${suffix > 1 ? `-${suffix}` : ''}`;
        suffix++;
        if (suffix > 1000) {
          // Fallback: utiliser le displayId complet
          finalSlug = `cat-${displayId}`;
          break;
        }
      }
      
      usedSlugs.add(finalSlug);
      
      // Trouver le parent DB ID
      let parentDbId: number | null = null;
      if (category.parentId) {
        parentDbId = createdCategories.get(category.parentId) || null;
      }
      
      // Générer l'URL (basée sur le chemin complet)
      let urlPath = category.path.map(slugify).join('/');
      let url = `/pieces-detachees/${urlPath}`;
      
      // Vérifier si l'URL existe déjà et la rendre unique si nécessaire
      const existingUrl = await db.tecDocCategory.findFirst({
        where: { url },
        select: { displayId: true },
      });
      
      if (existingUrl && existingUrl.displayId !== displayId) {
        // Ajouter le displayId à l'URL pour la rendre unique
        url = `/pieces-detachees/${urlPath}-${displayId}`;
      }
      
      // Chercher la catégorie existante par displayId
      let dbCategory = await db.tecDocCategory.findFirst({
        where: { displayId },
      });
      
      // Préparer les données
      const categoryData: any = {
        name: category.name,
        slug: finalSlug,
        level: category.level,
        parentId: parentDbId,
        url,
      };
      
      // N'inclure tecdocCategoryId que s'il n'est pas null et n'est pas déjà utilisé par une autre catégorie
      if (category.tecdocCategoryId !== null) {
        const existingWithTecDocId = await db.tecDocCategory.findFirst({
          where: { 
            tecdocCategoryId: category.tecdocCategoryId,
            NOT: dbCategory ? { id: dbCategory.id } : { displayId },
          },
        });
        
        if (!existingWithTecDocId) {
          categoryData.tecdocCategoryId = category.tecdocCategoryId;
        } else {
          // Ce tecdocCategoryId est déjà utilisé par une autre catégorie
          // Ne pas l'assigner pour éviter le conflit
          console.warn(`   ⚠️  tecdocCategoryId ${category.tecdocCategoryId} déjà utilisé, ignoré pour "${category.name}"`);
        }
      }
      
      if (dbCategory) {
        // Mettre à jour la catégorie existante
        dbCategory = await db.tecDocCategory.update({
          where: { id: dbCategory.id },
          data: categoryData,
        });
      } else {
        // Créer une nouvelle catégorie
        dbCategory = await db.tecDocCategory.create({
          data: {
            ...categoryData,
            displayId,
          },
        });
      }
      
      createdCategories.set(category.id, dbCategory.id);
      imported++;
      
      if (category.productGroups.length > 0) {
        withProducts++;
      }
      
      if (imported % 100 === 0) {
        console.log(`   📊 ${imported}/${sortedCategories.length} catégories importées...`);
      }
    } catch (e) {
      console.error(`   ❌ Erreur pour "${category.name}": ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
    }
  }
  
  // Créer les relations ProductGroup-Category en batch après avoir créé toutes les catégories
  console.log('\n🔗 Création des relations ProductGroup-Category...');
  
  // Charger tous les ProductGroup une fois
  const allProductGroups = await db.productGroup.findMany({
    select: {
      id: true,
      productName: true,
    },
  });
  
  // Créer deux maps : une pour correspondance exacte, une pour correspondance flexible
  const productGroupMapExact = new Map<string, number>();
  const productGroupList = allProductGroups.map(pg => ({ id: pg.id, name: pg.productName }));
  
  allProductGroups.forEach(pg => {
    productGroupMapExact.set(pg.productName, pg.id);
    // Aussi indexer par nom normalisé pour correspondance exacte normalisée
    productGroupMapExact.set(normalizeString(pg.productName), pg.id);
  });
  
  console.log(`   ✅ ${allProductGroups.length} ProductGroup chargés\n`);
  
  let exactMatches = 0;
  let similarMatches = 0;
  let noMatches = 0;
  
  // Créer les relations pour toutes les catégories
  for (const category of sortedCategories) {
    if (category.productGroups.length > 0) {
      const dbCategoryId = createdCategories.get(category.id);
      if (!dbCategoryId) continue;
      
      for (const pg of category.productGroups) {
        try {
          let productGroupId: number | null = null;
          
          // Méthode 1: Correspondance exacte
          productGroupId = productGroupMapExact.get(pg.name) || productGroupMapExact.get(normalizeString(pg.name)) || null;
          
          if (productGroupId) {
            exactMatches++;
          } else {
            // Méthode 2: Correspondance flexible (similarité)
            let bestMatch: { id: number; similarity: number } | null = null;
            
            for (const dbPg of productGroupList) {
              const similarity = calculateSimilarity(pg.name, dbPg.name);
              if (similarity > 0 && (!bestMatch || similarity > bestMatch.similarity)) {
                bestMatch = { id: dbPg.id, similarity };
              }
            }
            
            if (bestMatch && bestMatch.similarity >= 0.8) {
              productGroupId = bestMatch.id;
              similarMatches++;
            } else {
              noMatches++;
            }
          }
          
          if (productGroupId) {
            try {
              await db.productGroupCategory.create({
                data: {
                  productGroupId: productGroupId,
                  tecdocCategoryId: dbCategoryId,
                },
              });
              productGroupRelations++;
            } catch (e: any) {
              // Ignorer si la relation existe déjà
              if (!e.message?.includes('Unique constraint')) {
                // Ignorer silencieusement
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs
        }
      }
    }
  }
  
  console.log(`   📊 Correspondances: ${exactMatches} exactes, ${similarMatches} similaires, ${noMatches} sans match\n`);
  
  // Enrichir avec les fichiers tecdoc-results pour créer des relations supplémentaires
  console.log('\n📂 Enrichissement des relations depuis tecdoc-results...');
  const tecdocResultsDirs = [dir1, dir2].filter(d => fs.existsSync(d));
  
  let tecdocResultsExact = 0;
  let tecdocResultsSimilar = 0;
  let tecdocResultsNoMatch = 0;
  
  for (const dir of tecdocResultsDirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_progress.json');
    let processed = 0;
    
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        if (content.arborescencePaths && content.productName) {
          let productGroupId: number | null = null;
          
          // Méthode 1: Correspondance exacte
          productGroupId = productGroupMapExact.get(content.productName) || productGroupMapExact.get(normalizeString(content.productName)) || null;
          
          if (!productGroupId) {
            // Méthode 2: Correspondance flexible
            let bestMatch: { id: number; similarity: number } | null = null;
            
            for (const dbPg of productGroupList) {
              const similarity = calculateSimilarity(content.productName, dbPg.name);
              if (similarity > 0 && (!bestMatch || similarity > bestMatch.similarity)) {
                bestMatch = { id: dbPg.id, similarity };
              }
            }
            
            if (bestMatch && bestMatch.similarity >= 0.8) {
              productGroupId = bestMatch.id;
              tecdocResultsSimilar++;
            } else {
              tecdocResultsNoMatch++;
            }
          } else {
            tecdocResultsExact++;
          }
          
          if (productGroupId) {
            for (const pathData of content.arborescencePaths) {
              if (pathData.path && pathData.path.length > 0) {
                const categoryName = pathData.path[pathData.path.length - 1];
                const candidates = categoriesByName.get(categoryName);
                
                if (candidates && candidates.length > 0) {
                  const level = pathData.path.length;
                  let matchedCategory = candidates.find(c => c.level === level);
                  if (!matchedCategory) {
                    matchedCategory = candidates[0];
                  }
                  
                  const dbCategoryId = createdCategories.get(matchedCategory.id);
                  if (dbCategoryId) {
                    try {
                      await db.productGroupCategory.create({
                        data: {
                          productGroupId: productGroupId,
                          tecdocCategoryId: dbCategoryId,
                        },
                      });
                      productGroupRelations++;
                    } catch (e: any) {
                      // Ignorer si la relation existe déjà
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignorer les erreurs
      }
      
      processed++;
      if (processed % 500 === 0) {
        console.log(`   📊 ${processed}/${files.length} fichiers traités...`);
      }
    }
  }
  
  console.log(`   📊 tecdoc-results: ${tecdocResultsExact} exactes, ${tecdocResultsSimilar} similaires, ${tecdocResultsNoMatch} sans match\n`);
  
  console.log(`\n✅ Import terminé!\n`);
  
  // 5. Statistiques
  console.log('📊 Statistiques:');
  console.log(`   📁 ${imported} catégories importées`);
  console.log(`   📦 ${withProducts} catégories avec groupes de produits`);
  console.log(`   🔗 ${productGroupRelations} relations ProductGroup-Category créées`);
  
  // Statistiques par niveau
  const byLevel: Record<number, number> = {};
  sortedCategories.forEach(cat => {
    byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
  });
  
  console.log(`\n📊 Répartition par niveau:`);
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`   Niveau ${level}: ${byLevel[parseInt(level)]} catégories`);
  });
  
  console.log('');
}

importFullHierarchy()
  .catch(console.error)
  .finally(() => db.$disconnect());

