// Script pour récupérer les catégories niveau 3 de l'API InterCars
import * as fs from 'fs';
import * as path from 'path';

interface Level2Category {
  categoryId: string;
  label: string;
}

interface Level2Result {
  parentCategoryId: string;
  parentLabel: string;
  categories: Level2Category[];
}

interface Level3Category {
  categoryId: string;
  label: string;
}

interface Level3Result {
  grandParentCategoryId: string;
  grandParentLabel: string;
  parentCategoryId: string;
  parentLabel: string;
  categories: Level3Category[];
}

const API_BASE_URL = 'https://api.webapi.intercars.eu/ic/catalog/category';
const BEARER_TOKEN = 'eyJ4NXQiOiJNRFEyTjJWaE5HWXdPR0V6WlRZeE1URmxaV1JtT1dKbU1qTmxOR0V6TURNeU5tSTBaRFV3TTJJNE9XUTJOalF3TlRSaVlqZGlNRGxrT1Rnd1pHWmxaZyIsImtpZCI6Ik1EUTJOMlZoTkdZd09HRXpaVFl4TVRGbFpXUm1PV0ptTWpObE5HRXpNRE15Tm1JMFpEVXdNMkk0T1dRMk5qUXdOVFJpWWpkaU1EbGtPVGd3WkdabFpnX1JTMjU2IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJjb250YWN0X2ZpeGNhcm8uY29tIiwiYXV0IjoiQVBQTElDQVRJT04iLCJhdWQiOiJ4aU9meXZqUm1UakZKb2YySUZWOXR6R0dON0VhIiwibmJmIjoxNzY0OTQwOTQ0LCJhenAiOiJ4aU9meXZqUm1UakZKb2YySUZWOXR6R0dON0VhIiwic2NvcGUiOiJkZWZhdWx0IiwiaXNzIjoiaHR0cHM6XC9cL2lzLndlYmFwaS5pbnRlcmNhcnMuZXU6NDQzXC9vYXV0aDJcL3Rva2VuIiwiZXhwIjoxNzY0OTQ0NTQ0LCJpYXQiOjE3NjQ5NDA5NDQsImp0aSI6IjY5OTc1MGE1LWRjZmYtNDA4Mi04MTg1LTI5OTA2MjYxYWZjNiJ9.NWG_ltySfPqtMKzJ2c8xkREjoEqByP1vezxi9x-K4K5UCvvFmvnmfARJKBMV7fn-vYBOX4hNJ2zKm9s4qfqwehHh94RxquOXee9skHZsg6DMs-NhnKk_tgINDwnM4YYykv8QONMhhSeWdhmmtod4z6nJ4cl2B5aZlgioaEASnZ45Ts3zm5LIzGgRXOVwy0mNolSe5MnEPyZbLoUuRzCkLT3rahPF4RMrH6TNfuStZrC8nO69uoqzCy4uuKvZeC-9bmaPuxDawpBQL0jrfh_OxXqJpvFEISsJGWKdAtpVKJnMHq36U9eTTEUzdoxAv7v8HrpumOhUCDwBthQ1dey1jQ';

async function fetchLevel3Categories(categoryId: string): Promise<Level3Category[]> {
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

    const data: Level3Category[] = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération de ${categoryId}:`, error);
    return [];
  }
}

async function fetchAllLevel3Categories() {
  console.log('🚀 Récupération des catégories niveau 3 depuis l\'API InterCars...\n');

  // Charger level2.json
  const level2Path = path.join(process.cwd(), '..', 'intercars', 'level2.json');
  if (!fs.existsSync(level2Path)) {
    console.error(`❌ Fichier introuvable: ${level2Path}`);
    return;
  }

  const level2Results: Level2Result[] = JSON.parse(
    fs.readFileSync(level2Path, 'utf-8')
  );

  // Compter le total de catégories niveau 2
  const totalLevel2Categories = level2Results.reduce((sum, r) => sum + r.categories.length, 0);
  console.log(`📂 ${level2Results.length} familles niveau 1`);
  console.log(`📦 ${totalLevel2Categories} catégories niveau 2 à traiter\n`);

  const results: Level3Result[] = [];
  let processed = 0;
  let totalProcessed = 0;

  // Traiter chaque famille niveau 1
  for (const level2Result of level2Results) {
    console.log(`\n📁 Famille: "${level2Result.parentLabel}" (${level2Result.parentCategoryId})`);
    console.log(`   ${level2Result.categories.length} catégories niveau 2 à traiter`);

    // Traiter chaque catégorie niveau 2
    for (const level2Cat of level2Result.categories) {
      totalProcessed++;
      processed++;
      
      process.stdout.write(`   [${totalProcessed}/${totalLevel2Categories}] "${level2Cat.label}" (${level2Cat.categoryId})... `);

      const level3Categories = await fetchLevel3Categories(level2Cat.categoryId);

      if (level3Categories.length > 0) {
        results.push({
          grandParentCategoryId: level2Result.parentCategoryId,
          grandParentLabel: level2Result.parentLabel,
          parentCategoryId: level2Cat.categoryId,
          parentLabel: level2Cat.label,
          categories: level3Categories,
        });
        console.log(`✅ ${level3Categories.length} catégories`);
      } else {
        console.log(`⏭️  aucune`);
      }

      // Attendre un peu pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Sauvegarder les résultats
  const outputPath = path.join(process.cwd(), '..', 'intercars', 'level3.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  // Statistiques
  const totalLevel3 = results.reduce((sum, r) => sum + r.categories.length, 0);
  const level2WithLevel3 = results.filter(r => r.categories.length > 0).length;

  console.log('\n\n📊 Statistiques:');
  console.log(`   📁 Familles niveau 1 traitées: ${level2Results.length}`);
  console.log(`   📦 Catégories niveau 2 traitées: ${totalLevel2Categories}`);
  console.log(`   ✅ Catégories niveau 2 avec catégories niveau 3: ${level2WithLevel3}`);
  console.log(`   🔗 Total catégories niveau 3: ${totalLevel3}`);
  console.log(`\n💾 Résultats sauvegardés dans: ${outputPath}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de résultats:');
  results.slice(0, 5).forEach(result => {
    if (result.categories.length > 0) {
      console.log(`\n   ${result.grandParentLabel} > ${result.parentLabel}:`);
      result.categories.slice(0, 3).forEach(cat => {
        console.log(`      - ${cat.label} (${cat.categoryId})`);
      });
      if (result.categories.length > 3) {
        console.log(`      ... et ${result.categories.length - 3} autres`);
      }
    }
  });
}

fetchAllLevel3Categories().catch(console.error);

























