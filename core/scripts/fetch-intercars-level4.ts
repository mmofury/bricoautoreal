// Script pour récupérer les catégories niveau 4 de l'API InterCars
import * as fs from 'fs';
import * as path from 'path';

interface Level4Category {
  categoryId: string;
  label: string;
}

interface Level4Result {
  grandGrandParentCategoryId: string;
  grandGrandParentLabel: string;
  grandParentCategoryId: string;
  grandParentLabel: string;
  parentCategoryId: string;
  parentLabel: string;
  categories: Level4Category[];
}

const API_BASE_URL = 'https://api.webapi.intercars.eu/ic/catalog/category';
const BEARER_TOKEN = 'eyJ4NXQiOiJNRFEyTjJWaE5HWXdPR0V6WlRZeE1URmxaV1JtT1dKbU1qTmxOR0V6TURNeU5tSTBaRFV3TTJJNE9XUTJOalF3TlRSaVlqZGlNRGxrT1Rnd1pHWmxaZyIsImtpZCI6Ik1EUTJOMlZoTkdZd09HRXpaVFl4TVRGbFpXUm1PV0ptTWpObE5HRXpNRE15Tm1JMFpEVXdNMkk0T1dRMk5qUXdOVFJpWWpkaU1EbGtPVGd3WkdabFpnX1JTMjU2IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJjb250YWN0X2ZpeGNhcm8uY29tIiwiYXV0IjoiQVBQTElDQVRJT04iLCJhdWQiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwibmJmIjoxNzY0OTU3Nzg5LCJhenAiOiIyZ0dvclF1R3NRZF95ODR4am5wWmh0SDhSTFlhIiwic2NvcGUiOiJkZWZhdWx0IiwiaXNzIjoiaHR0cHM6XC9cL2lzLndlYmFwaS5pbnRlcmNhcnMuZXU6NDQzXC9vYXV0aDJcL3Rva2VuIiwiZXhwIjoxNzY0OTYxMzg5LCJpYXQiOjE3NjQ5NTc3ODksImp0aSI6ImE2MzMwNjE2LTA1NjEtNDgxOC04OTQyLTA5MTI1MGM1NWE5MiJ9.lf7B3MlVNM6151T6qTTcSXPb1tTli17O-m8h7Ty1293VLnFkGFEv590nFh9slfXkrDfkcQWhuMiPj2MRDX5Z71esL7aRtOZGrAwHETEOH5H5pSAUUaE_sgQnR6MrhOf7FD2TvUi9BBXJMJ7eKVrVxgSDg0hVaCcfphzQL_M6Ebw8yqzIiY8KaSGcM9X5utE89YQihsa1W3RZPq4k8NvCcGsfsOtixbxoHZhnQjJK-esa1qz5LDHeGGTJSyYNXXxn-XRxZyPsERviQjWPxM_H6pTSwcnlQWLvoo659mSpcZAIvJojbVPRaJHRCGNdPtwXnPAOjuMB5NDpGCnFVHpEUg';

async function fetchLevel4Categories(categoryId: string): Promise<Level4Category[]> {
  const url = `${API_BASE_URL}?categoryId=${encodeURIComponent(categoryId)}`;
  
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
      console.error(`❌ Erreur pour ${categoryId}: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: Level4Category[] = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération de ${categoryId}:`, error);
    return [];
  }
}

async function fetchAllLevel4Categories() {
  console.log('🚀 Récupération des catégories niveau 4 depuis l\'API InterCars...\n');

  // Charger level3.json
  const level3Path = path.join(process.cwd(), '..', 'intercars', 'level3.json');
  if (!fs.existsSync(level3Path)) {
    console.error(`❌ Fichier introuvable: ${level3Path}`);
    return;
  }

  const level3Data: Array<{
    grandParentCategoryId: string;
    grandParentLabel: string;
    parentCategoryId: string;
    parentLabel: string;
    categories: Array<{
      categoryId: string;
      label: string;
    }>;
  }> = JSON.parse(fs.readFileSync(level3Path, 'utf-8'));

  console.log(`📂 ${level3Data.length} groupes de catégories niveau 3 chargés\n`);

  const level4Results: Level4Result[] = [];
  let totalProcessed = 0;
  let totalCategories = 0;
  const processedSalesClassificationNodes = new Set<string>();

  // Parcourir tous les groupes de level3
  for (const level3Group of level3Data) {
    // Parcourir toutes les catégories de ce groupe
    for (const level3Cat of level3Group.categories) {
      // On ne s'intéresse qu'aux SalesClassificationNode (pas aux GenericArticle)
      if (!level3Cat.categoryId.startsWith('SalesClassificationNode_')) {
        continue;
      }

      // Éviter les doublons
      if (processedSalesClassificationNodes.has(level3Cat.categoryId)) {
        continue;
      }
      processedSalesClassificationNodes.add(level3Cat.categoryId);

      totalProcessed++;
      process.stdout.write(`[${totalProcessed}] ${level3Cat.label} (${level3Cat.categoryId})... `);

      // Récupérer les enfants (niveau 4)
      const level4Categories = await fetchLevel4Categories(level3Cat.categoryId);

      if (level4Categories.length > 0) {
        level4Results.push({
          grandGrandParentCategoryId: level3Group.grandParentCategoryId,
          grandGrandParentLabel: level3Group.grandParentLabel,
          grandParentCategoryId: level3Group.parentCategoryId,
          grandParentLabel: level3Group.parentLabel,
          parentCategoryId: level3Cat.categoryId,
          parentLabel: level3Cat.label,
          categories: level4Categories,
        });
        totalCategories += level4Categories.length;
        console.log(`✅ ${level4Categories.length} catégories niveau 4`);
      } else {
        console.log('⏭️  aucune catégorie');
      }

      // Attendre un peu pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Sauvegarder les résultats
  const outputPath = path.join(process.cwd(), '..', 'intercars', 'level4.json');
  fs.writeFileSync(outputPath, JSON.stringify(level4Results, null, 2), 'utf-8');

  console.log('\n\n📊 Statistiques:');
  console.log(`   📦 SalesClassificationNode traités: ${totalProcessed}`);
  console.log(`   ✅ Groupes avec catégories niveau 4: ${level4Results.length}`);
  console.log(`   📁 Total catégories niveau 4: ${totalCategories}`);
  console.log(`\n💾 Résultats sauvegardés dans: ${outputPath}`);
}

fetchAllLevel4Categories().catch(console.error);


























