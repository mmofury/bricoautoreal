// Script de test pour l'API InterCars avec un seul SKU
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'https://api.webapi.intercars.eu/ic/catalog/products';
const BEARER_TOKEN = 'eyJ4NXQiOiJNRFEyTjJWaE5HWXdPR0V6WlRZeE1URmxaV1JtT1dKbU1qTmxOR0V6TURNeU5tSTBaRFV3TTJJNE9XUTJOalF3TlRSaVlqZGlNRGxrT1Rnd1pHWmxaZyIsImtpZCI6Ik1EUTJOMlZoTkdZd09HRXpaVFl4TVRGbFpXUm1PV0ptTWpObE5HRXpNRE15Tm1JMFpEVXdNMkk0T1dRMk5qUXdOVFJpWWpkaU1EbGtPVGd3WkdabFpnX1JTMjU2IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJjb250YWN0X2ZpeGNhcm8uY29tIiwiYXV0IjoiQVBQTElDQVRJT04iLCJhdWQiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwibmJmIjoxNzY0OTU3Nzg5LCJhenAiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwic2NvcGUiOiJkZWZhdWx0IiwiaXNzIjoiaHR0cHM6XC9cL2lzLndlYmFwaS5pbnRlcmNhcnMuZXU6NDQzXC9vYXV0aDJcL3Rva2VuIiwiZXhwIjoxNzY0OTYxMzg5LCJpYXQiOjE3NjQ5NTc3ODksImp0aSI6ImE2MzMwNjE2LTA1NjEtNDgxOC04OTQyLTA5MTI1MGM1NWE5MiJ9.lf7B3MlVNM6151T6qTTcSXPb1tTli17O-m8h7Ty1293VLnFkGFEv590nFh9slfXkrDfkcQWhuMiPj2MRDX5Z71esL7aRtOZGrAwHETEOH5H5pSAUUaE_sgQnR6MrhOf7FD2TvUi9BBXJMJ7eKVrVxgSDg0hVaCcfphzQL_M6Ebw8yqzIiY8KaSGcM9X5utE89YQihsa1W3RZPq4k8NvCcGsfsOtixbxoHZhnQjJK-esa1qz5LDHeGGTJSyYNXXxn-XRxZyPsERviQjWPxM_H6pTSwcnlQWLvoo659mSpcZAIvJojbVPRaJHRCGNdPtwXnPAOjuMB5NDpGCnFVHpEUg';

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

async function fetchCategoryChildren(categoryId: string): Promise<Array<{ categoryId: string; label: string }> | null> {
  const url = `https://api.webapi.intercars.eu/ic/catalog/category?categoryId=${encodeURIComponent(categoryId)}`;
  
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
      console.error(`❌ Erreur pour categoryId ${categoryId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    // La structure de la réponse peut varier, on s'adapte
    if (data.categories && Array.isArray(data.categories)) {
      return data.categories;
    }
    return null;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des enfants de ${categoryId}:`, error);
    return null;
  }
}

async function fetchProductFromInterCars(sku: string): Promise<InterCarsProduct | null> {
  const url = `${API_BASE_URL}?pageNumber=0&sku=${encodeURIComponent(sku)}`;
  
  console.log(`\n🔍 Requête API pour SKU: ${sku}`);
  console.log(`   URL: ${url}`);
  
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
      console.error(`❌ Erreur HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Détails: ${errorText}`);
      return null;
    }

    const data: InterCarsProductResponse = await response.json();
    if (data.products && data.products.length > 0) {
      return data.products[0];
    }
    console.log('⚠️  Aucun produit trouvé');
    return null;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération:`, error);
    return null;
  }
}

async function testSingleSKU() {
  console.log('🧪 Test de l\'API InterCars avec un seul SKU\n');

  // Charger level3.json pour le mapping
  const level3Path = path.join(process.cwd(), '..', 'intercars', 'level3.json');
  if (!fs.existsSync(level3Path)) {
    console.error(`❌ Fichier introuvable: ${level3Path}`);
    return;
  }

  const level3Data: Level3Result[] = JSON.parse(
    fs.readFileSync(level3Path, 'utf-8')
  );

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
    level2Id: string;
    level2Label: string;
  }>();

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
          level2Id: level3Cat.categoryId,
          level2Label: level3Cat.label,
        });
      }
    }
  }

  console.log(`📂 ${genericArticleMap.size} GenericArticle (niveau 3) indexés`);
  console.log(`📂 ${salesClassificationNodeMap.size} SalesClassificationNode (niveau 2) indexés\n`);

  // Test avec un SKU (exemple: D9BDD5 de l'exemple)
  const testSKU = 'G0U0W2'; // Tu peux changer ce SKU
  console.log(`📦 Test avec SKU: ${testSKU}\n`);

  const product = await fetchProductFromInterCars(testSKU);

  if (!product) {
    console.log('\n❌ Aucun produit récupéré');
    return;
  }

  console.log('\n✅ Produit récupéré:');
  console.log(`   SKU: ${product.sku}`);
  console.log(`   Brand: ${product.brand}`);
  console.log(`   Description: ${product.shortDescription}`);
  console.log(`   Generic Articles: ${product.genericArticleReferences?.length || 0}`);

  if (product.genericArticleReferences && product.genericArticleReferences.length > 0) {
    console.log('\n📋 Catégories trouvées:');
    for (const genericArticleRef of product.genericArticleReferences) {
      const genericArticleId = genericArticleRef.genericArticleId;
      const categoryInfo = genericArticleMap.get(genericArticleId);

      console.log(`\n   🔹 ${genericArticleId}`);
      console.log(`      Nom (EN): ${genericArticleRef.name.en}`);
      console.log(`      Primary: ${genericArticleRef.primary}`);

      if (categoryInfo) {
        console.log(`      ✅ Trouvé dans level3.json (GenericArticle):`);
        console.log(`         Niveau 1: ${categoryInfo.level1Label} (${categoryInfo.level1Id})`);
        console.log(`         Niveau 2: ${categoryInfo.level2Label} (${categoryInfo.level2Id})`);
        console.log(`         Niveau 3: ${categoryInfo.level3Label} (${categoryInfo.level3Id})`);
      } else {
        // Chercher un SalesClassificationNode parent par nom exact
        const normalizedName = genericArticleRef.name.en.toLowerCase().trim();
        let parentNode = salesClassificationNodeMap.get(normalizedName);
        
        // Si pas trouvé, chercher par mots-clés
        if (!parentNode) {
          const keywords = normalizedName.split(/[\s,]+/).filter(k => k.length > 3); // Mots de plus de 3 caractères
          for (const [nodeName, node] of salesClassificationNodeMap.entries()) {
            const nodeKeywords = nodeName.split(/[\s,]+/).filter(k => k.length > 3);
            // Vérifier si au moins 2 mots-clés correspondent
            const matchingKeywords = keywords.filter(k => nodeKeywords.some(nk => nk.includes(k) || k.includes(nk)));
            if (matchingKeywords.length >= 1) {
              parentNode = node;
              console.log(`      🔍 Recherche par mots-clés: "${keywords.join(', ')}" → "${nodeName}"`);
              break;
            }
          }
        }
        
        if (parentNode) {
          console.log(`      ⚠️  GenericArticle non trouvé, mais SalesClassificationNode parent trouvé:`);
          console.log(`         Niveau 1: ${parentNode.level1Label} (${parentNode.level1Id})`);
          console.log(`         Niveau 2: ${parentNode.level2Label} (${parentNode.level2Id})`);
          console.log(`         🔍 Récupération des enfants (niveau 4) de ${parentNode.level2Id}...`);
          
          // Récupérer les enfants du SalesClassificationNode
          const children = await fetchCategoryChildren(parentNode.level2Id);
          if (children && children.length > 0) {
            console.log(`         ✅ ${children.length} catégories niveau 4 trouvées`);
            
            // Chercher le GenericArticle dans les enfants
            const foundChild = children.find(child => child.categoryId === genericArticleId);
            if (foundChild) {
              console.log(`         ✅ GenericArticle ${genericArticleId} trouvé dans les enfants:`);
              console.log(`            Niveau 4: ${foundChild.label} (${foundChild.categoryId})`);
              console.log(`            📊 Arborescence complète:`);
              console.log(`               Niveau 1: ${parentNode.level1Label}`);
              console.log(`               Niveau 2: ${parentNode.level2Label}`);
              console.log(`               Niveau 3: (SalesClassificationNode ${parentNode.level2Id})`);
              console.log(`               Niveau 4: ${foundChild.label} (${foundChild.categoryId})`);
            } else {
              console.log(`         ⚠️  GenericArticle ${genericArticleId} non trouvé dans les ${children.length} enfants`);
              console.log(`         📋 Exemples d'enfants trouvés:`);
              children.slice(0, 5).forEach(child => {
                console.log(`            - ${child.label} (${child.categoryId})`);
              });
            }
          } else {
            console.log(`         ⚠️  Aucun enfant trouvé pour ${parentNode.level2Id}`);
          }
        } else {
          console.log(`      ⚠️  NON TROUVÉ dans level3.json (ni GenericArticle ni SalesClassificationNode parent)`);
          console.log(`      💡 Recherche suggérée: "brake", "caliper", "bellow" dans level3.json`);
        }
      }
    }
  } else {
    console.log('\n⚠️  Aucune catégorie (genericArticleReferences) trouvée');
  }

  console.log('\n✅ Test terminé!');
}

testSingleSKU().catch(console.error);

