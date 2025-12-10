// Script pour récupérer les catégories niveau 2 de l'API InterCars
import * as fs from 'fs';
import * as path from 'path';

interface Level1Category {
  categoryId: string;
  label: string;
}

interface Level2Category {
  categoryId: string;
  label: string;
}

interface Level2Result {
  parentCategoryId: string;
  parentLabel: string;
  categories: Level2Category[];
}

const API_BASE_URL = 'https://api.webapi.intercars.eu/ic/catalog/category';
const BEARER_TOKEN = 'eyJ4NXQiOiJNRFEyTjJWaE5HWXdPR0V6WlRZeE1URmxaV1JtT1dKbU1qTmxOR0V6TURNeU5tSTBaRFV3TTJJNE9XUTJOalF3TlRSaVlqZGlNRGxrT1Rnd1pHWmxaZyIsImtpZCI6Ik1EUTJOMlZoTkdZd09HRXpaVFl4TVRGbFpXUm1PV0ptTWpObE5HRXpNRE15Tm1JMFpEVXdNMkk0T1dRMk5qUXdOVFJpWWpkaU1EbGtPVGd3WkdabFpnX1JTMjU2IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJjb250YWN0X2ZpeGNhcm8uY29tIiwiYXV0IjoiQVBQTElDQVRJT04iLCJhdWQiOiJ4aU9meXZqUm1UakZKb2YySUZWOXR6R0dON0VhIiwibmJmIjoxNzY0OTQwOTQ0LCJhenAiOiJ4aU9meXZqUm1UakZKb2YySUZWOXR6R0dON0VhIiwic2NvcGUiOiJkZWZhdWx0IiwiaXNzIjoiaHR0cHM6XC9cL2lzLndlYmFwaS5pbnRlcmNhcnMuZXU6NDQzXC9vYXV0aDJcL3Rva2VuIiwiZXhwIjoxNzY0OTQ0NTQ0LCJpYXQiOjE3NjQ5NDA5NDQsImp0aSI6IjY5OTc1MGE1LWRjZmYtNDA4Mi04MTg1LTI5OTA2MjYxYWZjNiJ9.NWG_ltySfPqtMKzJ2c8xkREjoEqByP1vezxi9x-K4K5UCvvFmvnmfARJKBMV7fn-vYBOX4hNJ2zKm9s4qfqwehHh94RxquOXee9skHZsg6DMs-NhnKk_tgINDwnM4YYykv8QONMhhSeWdhmmtod4z6nJ4cl2B5aZlgioaEASnZ45Ts3zm5LIzGgRXOVwy0mNolSe5MnEPyZbLoUuRzCkLT3rahPF4RMrH6TNfuStZrC8nO69uoqzCy4uuKvZeC-9bmaPuxDawpBQL0jrfh_OxXqJpvFEISsJGWKdAtpVKJnMHq36U9eTTEUzdoxAv7v8HrpumOhUCDwBthQ1dey1jQ';

async function fetchLevel2Categories(categoryId: string): Promise<Level2Category[]> {
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

    const data: Level2Category[] = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération de ${categoryId}:`, error);
    return [];
  }
}

async function fetchAllLevel2Categories() {
  console.log('🚀 Récupération des catégories niveau 2 depuis l\'API InterCars...\n');

  // Charger level1.json
  const level1Path = path.join(process.cwd(), '..', 'intercars', 'level1.json');
  if (!fs.existsSync(level1Path)) {
    console.error(`❌ Fichier introuvable: ${level1Path}`);
    return;
  }

  const level1Categories: Level1Category[] = JSON.parse(
    fs.readFileSync(level1Path, 'utf-8')
  );

  console.log(`📂 ${level1Categories.length} familles niveau 1 à traiter\n`);

  const results: Level2Result[] = [];
  let processed = 0;

  // Traiter chaque famille niveau 1
  for (const level1Cat of level1Categories) {
    processed++;
    console.log(`[${processed}/${level1Categories.length}] Récupération de "${level1Cat.label}" (${level1Cat.categoryId})...`);

    const level2Categories = await fetchLevel2Categories(level1Cat.categoryId);

    results.push({
      parentCategoryId: level1Cat.categoryId,
      parentLabel: level1Cat.label,
      categories: level2Categories,
    });

    console.log(`   ✅ ${level2Categories.length} catégories niveau 2 trouvées`);

    // Attendre un peu pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Sauvegarder les résultats
  const outputPath = path.join(process.cwd(), '..', 'intercars', 'level2.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  // Statistiques
  const totalLevel2 = results.reduce((sum, r) => sum + r.categories.length, 0);
  const familiesWithCategories = results.filter(r => r.categories.length > 0).length;

  console.log('\n📊 Statistiques:');
  console.log(`   📁 Familles niveau 1 traitées: ${level1Categories.length}`);
  console.log(`   📦 Familles avec catégories niveau 2: ${familiesWithCategories}`);
  console.log(`   🔗 Total catégories niveau 2: ${totalLevel2}`);
  console.log(`\n💾 Résultats sauvegardés dans: ${outputPath}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de résultats:');
  results.slice(0, 5).forEach(result => {
    if (result.categories.length > 0) {
      console.log(`\n   ${result.parentLabel} (${result.parentCategoryId}):`);
      result.categories.slice(0, 3).forEach(cat => {
        console.log(`      - ${cat.label} (${cat.categoryId})`);
      });
      if (result.categories.length > 3) {
        console.log(`      ... et ${result.categories.length - 3} autres`);
      }
    }
  });
}

fetchAllLevel2Categories().catch(console.error);

























