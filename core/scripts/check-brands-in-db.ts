// Script pour vérifier quelles marques du JSON existent dans la base de données
// Usage: tsx scripts/check-brands-in-db.ts <chemin-vers-json>

import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BrandData {
  name: string;
  url: string;
  filename: string;
}

async function main() {
  const jsonPath = process.argv[2];
  
  if (!jsonPath) {
    console.error('❌ Usage: tsx scripts/check-brands-in-db.ts <chemin-vers-json>');
    console.error('   Exemple: tsx scripts/check-brands-in-db.ts C:\\Users\\yohan\\Downloads\\autodoc-brands-urls.json');
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable: ${jsonPath}`);
    process.exit(1);
  }

  console.log(`📖 Lecture du fichier: ${jsonPath}\n`);

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const brands: BrandData[] = JSON.parse(jsonContent);

  console.log(`📦 ${brands.length} marques dans le fichier JSON\n`);

  // Récupérer toutes les marques de la base de données
  console.log('🔍 Recherche des marques dans la base de données...\n');
  
  const dbManufacturers = await prisma.manufacturer.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`📊 ${dbManufacturers.length} marques dans la base de données\n`);

  // Créer un Map pour une recherche rapide (insensible à la casse)
  const dbManufacturersMap = new Map<string, { id: number; name: string }>();
  dbManufacturers.forEach((m) => {
    const key = m.name.toLowerCase().trim();
    if (!dbManufacturersMap.has(key)) {
      dbManufacturersMap.set(key, m);
    }
  });

  // Comparer
  const found: Array<{ json: BrandData; db: { id: number; name: string } }> = [];
  const notFound: BrandData[] = [];
  const similar: Array<{ json: BrandData; suggestions: Array<{ id: number; name: string }> }> = [];

  brands.forEach((brand) => {
    const brandNameLower = brand.name.toLowerCase().trim();
    
    // Recherche exacte
    const exactMatch = dbManufacturersMap.get(brandNameLower);
    if (exactMatch) {
      found.push({ json: brand, db: exactMatch });
      return;
    }

    // Recherche de similarité (contient ou est contenu)
    const suggestions = dbManufacturers.filter((m) => {
      const dbNameLower = m.name.toLowerCase().trim();
      return (
        brandNameLower.includes(dbNameLower) ||
        dbNameLower.includes(brandNameLower) ||
        brandNameLower.replace(/\s+/g, '') === dbNameLower.replace(/\s+/g, '') ||
        brandNameLower.replace(/[.-]/g, ' ') === dbNameLower.replace(/[.-]/g, ' ')
      );
    });

    if (suggestions.length > 0) {
      similar.push({ json: brand, suggestions: suggestions.slice(0, 5) }); // Limiter à 5 suggestions
    } else {
      notFound.push(brand);
    }
  });

  // Afficher les résultats
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ MARQUES TROUVÉES (${found.length}):\n`);
  if (found.length > 0) {
    found.slice(0, 20).forEach((item) => {
      console.log(`   ✓ ${item.json.name} → DB: ${item.db.name} (ID: ${item.db.id})`);
    });
    if (found.length > 20) {
      console.log(`   ... et ${found.length - 20} autres`);
    }
  } else {
    console.log('   Aucune marque trouvée');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log(`🔍 MARQUES SIMILAIRES (${similar.length}):\n`);
  if (similar.length > 0) {
    similar.slice(0, 10).forEach((item) => {
      console.log(`   ? ${item.json.name}`);
      item.suggestions.forEach((suggestion) => {
        console.log(`      → Possible correspondance: ${suggestion.name} (ID: ${suggestion.id})`);
      });
    });
    if (similar.length > 10) {
      console.log(`   ... et ${similar.length - 10} autres avec suggestions`);
    }
  } else {
    console.log('   Aucune marque similaire trouvée');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log(`❌ MARQUES NON TROUVÉES (${notFound.length}):\n`);
  if (notFound.length > 0) {
    notFound.slice(0, 30).forEach((brand) => {
      console.log(`   ✗ ${brand.name}`);
    });
    if (notFound.length > 30) {
      console.log(`   ... et ${notFound.length - 30} autres`);
    }
  } else {
    console.log('   Toutes les marques ont été trouvées !');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📊 RÉSUMÉ:\n');
  console.log(`   Total dans le JSON: ${brands.length}`);
  console.log(`   ✅ Trouvées exactement: ${found.length} (${((found.length / brands.length) * 100).toFixed(1)}%)`);
  console.log(`   🔍 Similaires: ${similar.length} (${((similar.length / brands.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Non trouvées: ${notFound.length} (${((notFound.length / brands.length) * 100).toFixed(1)}%)`);
  console.log(`   📊 Total dans la DB: ${dbManufacturers.length}`);

  // Exporter les résultats dans un fichier JSON
  const resultsPath = jsonPath.replace('.json', '-db-comparison.json');
  const results = {
    summary: {
      totalInJson: brands.length,
      found: found.length,
      similar: similar.length,
      notFound: notFound.length,
      totalInDb: dbManufacturers.length,
    },
    found: found.map((item) => ({
      jsonName: item.json.name,
      dbName: item.db.name,
      dbId: item.db.id,
      logoUrl: item.json.url,
    })),
    similar: similar.map((item) => ({
      jsonName: item.json.name,
      suggestions: item.suggestions.map((s) => ({
        name: s.name,
        id: s.id,
      })),
      logoUrl: item.json.url,
    })),
    notFound: notFound.map((item) => ({
      name: item.name,
      logoUrl: item.url,
      filename: item.filename,
    })),
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Résultats détaillés exportés dans: ${resultsPath}`);
}

main()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


