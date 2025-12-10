// Script pour construire l'arborescence depuis l'API InterCars
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const API_BASE_URL = 'https://api.webapi.intercars.eu/ic/catalog/products';
const BEARER_TOKEN = 'eyJ4NXQiOiJNRFEyTjJWaE5HWXdPR0V6WlRZeE1URmxaV1JtT1dKbU1qTmxOR0V6TURNeU5tSTBaRFV3TTJJNE9XUTJOalF3TlRSaVlqZGlNRGxrT1Rnd1pHWmxaZyIsImtpZCI6Ik1EUTJOMlZoTkdZd09HRXpaVFl4TVRGbFpXUm1PV0ptTWpObE5HRXpNRE15Tm1JMFpEVXdNMkk0T1dRMk5qUXdOVFJpWWpkaU1EbGtPVGd3WkdabFpnX1JTMjU2IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJjb250YWN0X2ZpeGNhcm8uY29tIiwiYXV0IjoiQVBQTElDQVRJT04iLCJhdWQiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwibmJmIjoxNzY1MTA3NTI4LCJhenAiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwic2NvcGUiOiJkZWZhdWx0IiwiaXNzIjoiaHR0cHM6XC9cL2lzLndlYmFwaS5pbnRlcmNhcnMuZXU6NDQzXC9vYXV0aDJcL3Rva2VuIiwiZXhwIjoxNzY1MTExMTI4LCJpYXQiOjE3NjUxMDc1MjgsImp0aSI6ImMxMTcyMjdlLTVkYmQtNGU3Zi04ZjZmLTY0N2Q5OGRkZTBjYyJ9.iLozWYkiZpvrAtRiIDfTV_XZfUDKpfq9fJ1o3BhMBOPWr04LjhTPiVUklsfZ3rxGEKKxhy60O6SqmEpfigV8qnWUZaQeHAfifxBmb6GohHOyHjvG_pXJtaBCJtvWcURuZ5Mqi6vV6J-jHemUdtwM43gkdnmTQJluhtoo6-IGmoJehtw_uOQjcDXNPY4Z0G07IMo2q_8xPtCfic1DsmyIa6k-_XHM7KQXBPA6O0LNd6b9GkOoviNcb3oeZTxsUuflq-XAapMRY7e4jBSzPWGZWxCkWLgz-U_8-84F6-GQPz47zP3qNJfv74Gao9qkgVYc-Z6ywg47MUgZEyQsv3x2Bw';

interface InterCarsProduct {
  sku: string;
  index: string;
  tecDoc: string;
  tecDocProd: string;
  articleNumber: string;
  brand: string;
  shortDescription: string;
  description: string;
  eans: string[];
  genericArticleReferences: Array<{
    genericArticleId: string;
    primary: boolean;
    name: {
      en: string;
    };
  }>;
}

interface InterCarsProductResponse {
  totalResults: number;
  hasNextPage: boolean;
  products: InterCarsProduct[];
}

interface Level3Result {
  grandParentCategoryId: string;
  grandParentLabel: string;
  parentCategoryId: string;
  parentLabel: string;
  categories: Array<{
    categoryId: string;
    label: string;
  }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchProductFromInterCars(sku: string, saveResponse: boolean = true): Promise<InterCarsProduct | null> {
  const url = `${API_BASE_URL}?pageNumber=0&sku=${encodeURIComponent(sku)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Accept-Language': 'en',
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Erreur pour SKU ${sku}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: InterCarsProductResponse = await response.json();
    
    // Sauvegarder la réponse complète
    if (saveResponse && data.products && data.products.length > 0) {
      const responsesDir = path.join(process.cwd(), '..', 'intercars', 'api-responses');
      if (!fs.existsSync(responsesDir)) {
        fs.mkdirSync(responsesDir, { recursive: true });
      }
      
      const fileName = `${sku}.json`;
      const filePath = path.join(responsesDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    
    if (data.products && data.products.length > 0) {
      return data.products[0];
    }
    return null;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération de ${sku}:`, error);
    return null;
  }
}

async function buildArborescenceFromInterCarsAPI() {
  console.log('🚀 Construction de l\'arborescence depuis l\'API InterCars...\n');

  // Se connecter à la base de données
  await prisma.$connect();
  console.log('✅ Connecté à la base de données');

  // Vérifier que le modèle existe
  console.log('🔍 Vérification des modèles Prisma disponibles...');
  const prismaKeys = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
  console.log(`   Modèles disponibles: ${prismaKeys.join(', ')}`);
  
  if (!prisma.tecDocCategory) {
    console.error('\n❌ Erreur: prisma.tecDocCategory est undefined.');
    await prisma.$disconnect();
    process.exit(1);
  }
  
  try {
    await prisma.tecDocCategory.count();
    console.log('✅ Modèle TecDocCategory disponible\n');
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'accès au modèle:');
    console.error(`   ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Charger level3.json pour le mapping
  const level3Path = path.join(process.cwd(), '..', 'intercars', 'level3.json');
  if (!fs.existsSync(level3Path)) {
    console.error(`❌ Fichier introuvable: ${level3Path}`);
    return;
  }

  const level3Data: Level3Result[] = JSON.parse(
    fs.readFileSync(level3Path, 'utf-8')
  );

  // Charger level4.json pour le mapping des GenericArticle niveau 4
  const level4Path = path.join(process.cwd(), '..', 'intercars', 'level4.json');
  let level4Data: Array<{
    grandGrandParentCategoryId: string;
    grandGrandParentLabel: string;
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{ categoryId: string; label: string }>;
  }> = [];

  if (fs.existsSync(level4Path)) {
    level4Data = JSON.parse(fs.readFileSync(level4Path, 'utf-8'));
    console.log(`📂 ${level4Data.length} groupes de catégories niveau 4 chargés`);
  } else {
    console.log(`⚠️  Fichier level4.json non trouvé, on utilisera uniquement level3.json`);
  }

  // Créer un index pour mapper genericArticleId -> chemin complet
  const genericArticleMap = new Map<string, {
    level1Id: string;
    level1Label: string;
    level2Id: string;
    level2Label: string;
    level3Id: string;
    level3Label: string;
  }>();

  // Créer aussi un index pour les SalesClassificationNode (niveau 2) par nom
  const salesClassificationNodeMap = new Map<string, {
    level1Id: string;
    level1Label: string;
    level2ParentId: string; // Le parentCategoryId du SalesClassificationNode
    level2ParentLabel: string;
    level2Id: string; // Le SalesClassificationNode lui-même
    level2Label: string;
  }>();

  // Créer un index pour mapper GenericArticle (niveau 4) -> chemin complet depuis level4.json
  const genericArticleLevel4Map = new Map<string, {
    level1Id: string;
    level1Label: string;
    level2Id: string;
    level2Label: string;
    level3Id: string; // Le SalesClassificationNode
    level3Label: string;
    level4Id: string; // Le GenericArticle
    level4Label: string;
  }>();

  // Indexer les GenericArticle niveau 4 depuis level4.json
  for (const level4Result of level4Data) {
    for (const level4Cat of level4Result.categories) {
      if (level4Cat.categoryId.startsWith('GenericArticle_')) {
        genericArticleLevel4Map.set(level4Cat.categoryId, {
          level1Id: level4Result.grandGrandParentCategoryId,
          level1Label: level4Result.grandGrandParentLabel,
          level2Id: level4Result.grandParentCategoryId,
          level2Label: level4Result.grandParentLabel,
          level3Id: level4Result.parentCategoryId,
          level3Label: level4Result.parentLabel,
          level4Id: level4Cat.categoryId,
          level4Label: level4Cat.label,
        });
      }
    }
  }

  if (genericArticleLevel4Map.size > 0) {
    console.log(`📂 ${genericArticleLevel4Map.size} GenericArticle (niveau 4) indexés depuis level4.json`);
  }

  for (const level3Result of level3Data) {
    for (const level3Cat of level3Result.categories) {
      // Indexer les GenericArticle (niveau 3)
      if (level3Cat.categoryId.startsWith('GenericArticle_')) {
        genericArticleMap.set(level3Cat.categoryId, {
          level1Id: level3Result.grandParentCategoryId,
          level1Label: level3Result.grandParentLabel,
          level2Id: level3Result.parentCategoryId,
          level2Label: level3Result.parentLabel,
          level3Id: level3Cat.categoryId,
          level3Label: level3Cat.label,
        });
      }
      
      // Indexer les SalesClassificationNode (niveau 2) par nom pour recherche
      if (level3Cat.categoryId.startsWith('SalesClassificationNode_')) {
        const normalizedName = level3Cat.label.toLowerCase().trim();
        salesClassificationNodeMap.set(normalizedName, {
          level1Id: level3Result.grandParentCategoryId,
          level1Label: level3Result.grandParentLabel,
          level2ParentId: level3Result.parentCategoryId, // Le parent du SalesClassificationNode
          level2ParentLabel: level3Result.parentLabel,
          level2Id: level3Cat.categoryId, // Le SalesClassificationNode lui-même
          level2Label: level3Cat.label,
        });
      }
    }
  }

  console.log(`📂 ${genericArticleMap.size} GenericArticle (niveau 3) indexés`);
  console.log(`📂 ${salesClassificationNodeMap.size} SalesClassificationNode (niveau 2) indexés\n`);

  // Récupérer tous les ProductSample
  console.log('📦 Chargement des ProductSample...');
  const productSamples = await prisma.productSample.findMany({
    orderBy: { productName: 'asc' },
  });

  console.log(`   ✅ ${productSamples.length} échantillons à traiter\n`);

  // Map pour stocker les catégories créées
  const createdCategories = new Map<string, number>(); // key: `${level}-${categoryId}` -> dbId
  const categoryIdToDbId = new Map<string, number>(); // InterCars categoryId -> dbId

  let productsProcessed = 0;
  let productsWithCategories = 0;
  let categoriesCreated = 0;
  let relationsCreated = 0;
  const missingCategories = new Set<string>(); // Pour tracker les catégories manquantes

  // Fichier de checkpoint pour sauvegarder le progrès
  const checkpointPath = path.join(process.cwd(), '..', 'intercars', 'checkpoint-arborescence.json');
  const processedProductIds = new Set<number>(); // IDs des produits déjà traités

  // Charger le checkpoint s'il existe
  if (fs.existsSync(checkpointPath)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
      if (checkpoint.processedProductIds) {
        checkpoint.processedProductIds.forEach((id: number) => processedProductIds.add(id));
        productsProcessed = checkpoint.productsProcessed || 0;
        productsWithCategories = checkpoint.productsWithCategories || 0;
        categoriesCreated = checkpoint.categoriesCreated || 0;
        relationsCreated = checkpoint.relationsCreated || 0;
        if (checkpoint.missingCategories) {
          checkpoint.missingCategories.forEach((cat: string) => missingCategories.add(cat));
        }
        console.log(`📂 Checkpoint chargé: ${productsProcessed} produits déjà traités\n`);
      }
    } catch (error) {
      console.log('⚠️  Erreur lors du chargement du checkpoint, on repart de zéro\n');
    }
  }

  // Fonction pour sauvegarder le checkpoint
  const saveCheckpoint = async () => {
    const checkpoint = {
      timestamp: new Date().toISOString(),
      productsProcessed,
      productsWithCategories,
      categoriesCreated,
      relationsCreated,
      missingCategories: Array.from(missingCategories),
      processedProductIds: Array.from(processedProductIds),
      totalProducts: productSamples.length,
    };
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  };

  // Traiter chaque ProductSample
  for (const sample of productSamples) {
    // Skip si déjà traité
    if (sample.id && processedProductIds.has(sample.id)) {
      continue;
    }
    if (!sample.csvId) {
      console.log(`⏭️  Skipping ${sample.productName} (pas de csvId)`);
      continue;
    }

    productsProcessed++;
    process.stdout.write(`[${productsProcessed}/${productSamples.length}] ${sample.productName} (${sample.csvId})... `);

    // Récupérer le produit depuis l'API InterCars
    const product = await fetchProductFromInterCars(sample.csvId);

    if (!product || !product.genericArticleReferences || product.genericArticleReferences.length === 0) {
      console.log('⏭️  pas de catégories');
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }

    productsWithCategories++;
    console.log(`✅ ${product.genericArticleReferences.length} catégorie(s)`);

    // Lire la réponse API complète depuis le fichier sauvegardé
    let apiResponseJson: string | null = null;
    try {
      const responsePath = path.join(process.cwd(), '..', 'intercars', 'api-responses', `${sample.csvId}.json`);
      if (fs.existsSync(responsePath)) {
        apiResponseJson = fs.readFileSync(responsePath, 'utf-8');
      }
    } catch (error) {
      // Ignorer les erreurs de lecture
    }

    // Pour chaque genericArticleReference (catégorie niveau 3)
    for (const genericArticleRef of product.genericArticleReferences) {
      // Enregistrer la correspondance dans InterCarsCategory
      try {
        await prisma.interCarsCategory.create({
          data: {
            productName: sample.productName || '',
            csvId: sample.csvId,
            genericArticleId: genericArticleRef.genericArticleId,
            categoryName: genericArticleRef.name.en,
            isPrimary: genericArticleRef.primary || false,
            apiResponse: apiResponseJson,
          },
        });
      } catch (error: any) {
        // Ignorer les doublons (unique constraint)
        if (error.code !== 'P2002') {
          console.error(`   ⚠️  Erreur lors de l'enregistrement: ${error.message}`);
        }
      }
      const genericArticleId = genericArticleRef.genericArticleId;
      let categoryInfo = genericArticleMap.get(genericArticleId);
      let level3SalesClassificationNodeId: string | null = null;

      // Si le GenericArticle n'est pas trouvé dans level3, chercher dans level4
      if (!categoryInfo) {
        const level4Info = genericArticleLevel4Map.get(genericArticleId);
        
        if (level4Info) {
          // Trouvé dans level4.json - c'est un GenericArticle niveau 4
          categoryInfo = {
            level1Id: level4Info.level1Id,
            level1Label: level4Info.level1Label,
            level2Id: level4Info.level2Id,
            level2Label: level4Info.level2Label,
            level3Id: genericArticleId, // Temporaire, sera remplacé par le SalesClassificationNode
            level3Label: genericArticleRef.name.en,
          };
          level3SalesClassificationNodeId = level4Info.level3Id; // Le SalesClassificationNode niveau 3
          console.log(`   ✅ GenericArticle ${genericArticleId} trouvé dans level4.json (niveau 4)`);
        } else {
          // Pas trouvé dans level4, chercher un SalesClassificationNode parent par nom
          const normalizedName = genericArticleRef.name.en.toLowerCase().trim();
          let parentNode = salesClassificationNodeMap.get(normalizedName);
          
          // Si pas trouvé, chercher par mots-clés
          if (!parentNode) {
            const keywords = normalizedName.split(/[\s,]+/).filter(k => k.length > 3);
            for (const [nodeName, node] of salesClassificationNodeMap.entries()) {
              const nodeKeywords = nodeName.split(/[\s,]+/).filter(k => k.length > 3);
              const matchingKeywords = keywords.filter(k => nodeKeywords.some(nk => nk.includes(k) || k.includes(nk)));
              if (matchingKeywords.length >= 1) {
                parentNode = node;
                break;
              }
            }
          }
          
          if (parentNode) {
            // Créer une catégorie info avec le parent trouvé (niveau 3, pas niveau 4)
            categoryInfo = {
              level1Id: parentNode.level1Id,
              level1Label: parentNode.level1Label,
              level2Id: parentNode.level2ParentId,
              level2Label: parentNode.level2ParentLabel,
              level3Id: genericArticleId,
              level3Label: genericArticleRef.name.en,
            };
            console.log(`   💡 GenericArticle ${genericArticleId} non trouvé dans level4, mais parent trouvé: ${parentNode.level2Label}`);
          } else {
            missingCategories.add(genericArticleId);
            console.log(`   ⚠️  Catégorie ${genericArticleId} non trouvée (ni dans level3, ni dans level4, ni parent)`);
            continue;
          }
        }
      }

      // Créer l'arborescence complète (niveau 1, 2, 3, 4 si nécessaire)
      let parentDbId: number | null = null;

      // Niveau 1
      const level1Key = `1-${categoryInfo.level1Id}`;
      let level1DbId = createdCategories.get(level1Key);

      if (!level1DbId) {
        const level1Slug = slugify(categoryInfo.level1Label);
        const level1 = await prisma.tecDocCategory.upsert({
          where: { slug: level1Slug },
          update: {},
          create: {
            name: categoryInfo.level1Label,
            slug: level1Slug,
            displayId: categoryInfo.level1Id.replace('SalesClassificationNode_', ''),
            level: 1,
            parentId: null,
            url: `/categorie/${level1Slug}-${categoryInfo.level1Id.replace('SalesClassificationNode_', '')}`,
          },
        });
        level1DbId = level1.id;
        createdCategories.set(level1Key, level1DbId);
        categoryIdToDbId.set(categoryInfo.level1Id, level1DbId);
        categoriesCreated++;
      } else {
        level1DbId = createdCategories.get(level1Key)!;
      }

      parentDbId = level1DbId;

      // Niveau 2
      const level2Key = `2-${categoryInfo.level2Id}`;
      let level2DbId = createdCategories.get(level2Key);

      if (!level2DbId) {
        const level2Slug = slugify(categoryInfo.level2Label);
        const level2 = await prisma.tecDocCategory.upsert({
          where: { slug: level2Slug },
          update: {
            parentId: parentDbId,
            level: 2,
          },
          create: {
            name: categoryInfo.level2Label,
            slug: level2Slug,
            displayId: categoryInfo.level2Id.replace('SalesClassificationNode_', ''),
            level: 2,
            parentId: parentDbId,
            url: `/categorie/${level2Slug}-${categoryInfo.level2Id.replace('SalesClassificationNode_', '')}`,
          },
        });
        level2DbId = level2.id;
        createdCategories.set(level2Key, level2DbId);
        categoryIdToDbId.set(categoryInfo.level2Id, level2DbId);
        categoriesCreated++;
      } else {
        level2DbId = createdCategories.get(level2Key)!;
        // Mettre à jour le parent si nécessaire
        await prisma.tecDocCategory.update({
          where: { id: level2DbId },
          data: { parentId: parentDbId },
        });
      }

      parentDbId = level2DbId;

      // Si on a un SalesClassificationNode pour le niveau 3, le créer
      let level3DbId: number;
      if (level3SalesClassificationNodeId) {
        // Créer le niveau 3 (SalesClassificationNode)
        const level3SalesKey = `3-${level3SalesClassificationNodeId}`;
        let level3SalesDbId = createdCategories.get(level3SalesKey);
        
        if (!level3SalesDbId) {
          // Récupérer le label du SalesClassificationNode depuis le parentNode trouvé précédemment
          // On doit le retrouver depuis salesClassificationNodeMap
          let level3SalesLabel = 'Unknown';
          for (const [nodeName, node] of salesClassificationNodeMap.entries()) {
            if (node.level2Id === level3SalesClassificationNodeId) {
              level3SalesLabel = node.level2Label;
              break;
            }
          }
          const level3SalesSlug = slugify(level3SalesLabel);
          
          // Utiliser le displayId complet pour éviter les collisions
          const salesDisplayId = level3SalesClassificationNodeId; // Garder le préfixe
          
          // Vérifier si une catégorie avec ce displayId existe déjà
          let existingSalesCategory = await prisma.tecDocCategory.findUnique({
            where: { displayId: salesDisplayId },
          });

          if (existingSalesCategory) {
            level3SalesDbId = existingSalesCategory.id;
            createdCategories.set(level3SalesKey, level3SalesDbId);
            categoryIdToDbId.set(level3SalesClassificationNodeId, level3SalesDbId);
            await prisma.tecDocCategory.update({
              where: { id: level3SalesDbId },
              data: { parentId: parentDbId, level: 3 },
            });
          } else {
            try {
              const level3Sales = await prisma.tecDocCategory.create({
                data: {
                  name: level3SalesLabel,
                  slug: level3SalesSlug,
                  displayId: salesDisplayId,
                  level: 3,
                  parentId: parentDbId,
                  url: `/categorie/${level3SalesSlug}-${salesDisplayId}`,
                },
              });
              level3SalesDbId = level3Sales.id;
              createdCategories.set(level3SalesKey, level3SalesDbId);
              categoryIdToDbId.set(level3SalesClassificationNodeId, level3SalesDbId);
              categoriesCreated++;
            } catch (error: any) {
              // Si erreur de contrainte unique, essayer de trouver la catégorie existante
              if (error.code === 'P2002') {
                existingSalesCategory = await prisma.tecDocCategory.findFirst({
                  where: {
                    OR: [
                      { slug: level3SalesSlug },
                      { displayId: salesDisplayId },
                    ],
                  },
                });
                if (existingSalesCategory) {
                  level3SalesDbId = existingSalesCategory.id;
                  createdCategories.set(level3SalesKey, level3SalesDbId);
                  categoryIdToDbId.set(level3SalesClassificationNodeId, level3SalesDbId);
                  await prisma.tecDocCategory.update({
                    where: { id: level3SalesDbId },
                    data: { parentId: parentDbId, level: 3 },
                  });
                } else {
                  throw error;
                }
              } else {
                throw error;
              }
            }
          }
        } else {
          level3SalesDbId = createdCategories.get(level3SalesKey)!;
          await prisma.tecDocCategory.update({
            where: { id: level3SalesDbId },
            data: { parentId: parentDbId },
          });
        }
        
        parentDbId = level3SalesDbId;
        level3DbId = level3SalesDbId;
      }

      // Niveau 3 ou 4 (GenericArticle)
      const level3Key = `3-${categoryInfo.level3Id}`;
      let level3GenericDbId = createdCategories.get(level3Key);
      const targetLevel = level3SalesClassificationNodeId ? 4 : 3;

      if (!level3GenericDbId) {
        const level3Slug = slugify(categoryInfo.level3Label);
        // Utiliser le displayId complet pour éviter les collisions
        const displayId = genericArticleId; // Garder le préfixe GenericArticle_
        
        // Vérifier si une catégorie avec ce displayId existe déjà
        let existingCategory = await prisma.tecDocCategory.findUnique({
          where: { displayId: displayId },
        });

        if (existingCategory) {
          // Réutiliser la catégorie existante
          level3GenericDbId = existingCategory.id;
          createdCategories.set(level3Key, level3GenericDbId);
          categoryIdToDbId.set(categoryInfo.level3Id, level3GenericDbId);
          // Mettre à jour le parent et le niveau si nécessaire
          await prisma.tecDocCategory.update({
            where: { id: level3GenericDbId },
            data: { parentId: parentDbId, level: targetLevel },
          });
        } else {
          // Créer une nouvelle catégorie
          try {
            const level3Generic = await prisma.tecDocCategory.create({
              data: {
                name: categoryInfo.level3Label,
                slug: level3Slug,
                displayId: displayId,
                level: targetLevel,
                parentId: parentDbId,
                url: `/categorie/${level3Slug}-${displayId}`,
              },
            });
            level3GenericDbId = level3Generic.id;
            createdCategories.set(level3Key, level3GenericDbId);
            categoryIdToDbId.set(categoryInfo.level3Id, level3GenericDbId);
            categoriesCreated++;
          } catch (error: any) {
            // Si erreur de contrainte unique (slug ou displayId), essayer de trouver la catégorie existante
            if (error.code === 'P2002') {
              existingCategory = await prisma.tecDocCategory.findFirst({
                where: {
                  OR: [
                    { slug: level3Slug },
                    { displayId: displayId },
                  ],
                },
              });
              if (existingCategory) {
                level3GenericDbId = existingCategory.id;
                createdCategories.set(level3Key, level3GenericDbId);
                categoryIdToDbId.set(categoryInfo.level3Id, level3GenericDbId);
                await prisma.tecDocCategory.update({
                  where: { id: level3GenericDbId },
                  data: { parentId: parentDbId, level: targetLevel },
                });
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }
      } else {
        level3GenericDbId = createdCategories.get(level3Key)!;
        await prisma.tecDocCategory.update({
          where: { id: level3GenericDbId },
          data: { parentId: parentDbId, level: targetLevel },
        });
      }

      // Trouver ou créer le ProductGroup par productName
      if (sample.productName) {
        const productGroup = await prisma.productGroup.findUnique({
          where: { productName: sample.productName },
        });

        if (productGroup) {
          // Créer la relation ProductGroupCategory avec la catégorie niveau 3 ou 4
          try {
            await prisma.productGroupCategory.upsert({
              where: {
                productGroupId_tecdocCategoryId: {
                  productGroupId: productGroup.id,
                  tecdocCategoryId: level3GenericDbId,
                },
              },
              update: {},
              create: {
                productGroupId: productGroup.id,
                tecdocCategoryId: level3GenericDbId,
              },
            });
            relationsCreated++;
          } catch (error) {
            // Relation déjà existante, ignorer
          }
        }
      }
    }

    // Marquer le produit comme traité
    if (sample.id) {
      processedProductIds.add(sample.id);
    }

    // Sauvegarder le checkpoint après chaque produit
    await saveCheckpoint();

    // Attendre un peu pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Statistiques finales
  const totalCategories = await prisma.tecDocCategory.count();
  const totalRelations = await prisma.productGroupCategory.count();

  console.log('\n\n📊 Statistiques finales:');
  console.log(`   📦 Produits traités: ${productsProcessed}`);
  console.log(`   ✅ Produits avec catégories: ${productsWithCategories}`);
  console.log(`   📁 Catégories créées: ${categoriesCreated}`);
  console.log(`   🔗 Relations créées: ${relationsCreated}`);
  console.log(`   📊 Total catégories dans la DB: ${totalCategories}`);
  console.log(`   📊 Total relations dans la DB: ${totalRelations}`);
  console.log(`   ⚠️  Catégories manquantes: ${missingCategories.size}`);

  // Sauvegarder le checkpoint final
  await saveCheckpoint();

  // Sauvegarder les catégories manquantes
  if (missingCategories.size > 0) {
    const missingCategoriesPath = path.join(process.cwd(), '..', 'intercars', `missing-categories-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(
      missingCategoriesPath,
      JSON.stringify(Array.from(missingCategories).sort(), null, 2),
      'utf-8'
    );
    console.log(`   💾 Catégories manquantes sauvegardées dans: ${missingCategoriesPath}\n`);
  } else {
    console.log('');
  }

  // Supprimer le checkpoint à la fin
  if (fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
    console.log('🗑️  Checkpoint supprimé (traitement terminé)');
  }

  await prisma.$disconnect();
  console.log('✅ Terminé!');
}

buildArborescenceFromInterCarsAPI().catch(console.error);

