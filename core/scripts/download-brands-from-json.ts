// Script Node.js pour télécharger les images depuis le fichier JSON généré
// Usage: tsx scripts/download-brands-from-json.ts <chemin-vers-json>

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface BrandData {
  name: string;
  url: string;
  filename: string;
}

// Télécharge directement dans le dossier public pour servir les images localement
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'supplier-logos');

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Suivre les redirections
        return downloadImage(response.headers.location || url, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const writer = fs.createWriteStream(filepath);
      response.pipe(writer);

      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

async function main() {
  const jsonPath = process.argv[2];
  
  if (!jsonPath) {
    console.error('❌ Usage: tsx scripts/download-brands-from-json.ts <chemin-vers-json>');
    console.error('   Exemple: tsx scripts/download-brands-from-json.ts autodoc-brands-urls.json');
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable: ${jsonPath}`);
    process.exit(1);
  }

  console.log(`📖 Lecture du fichier: ${jsonPath}\n`);

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const brands: BrandData[] = JSON.parse(jsonContent);

  console.log(`📦 ${brands.length} marques trouvées\n`);
  console.log('⬇️  Téléchargement des logos...\n');

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const filepath = path.join(OUTPUT_DIR, brand.filename);

    // Skip si le fichier existe déjà
    if (fs.existsSync(filepath)) {
      console.log(`   ⏩ [${i + 1}/${brands.length}] ${brand.name} (déjà téléchargé)`);
      skipped++;
      continue;
    }

    try {
      console.log(`   ⬇️  [${i + 1}/${brands.length}] ${brand.name}...`);
      await downloadImage(brand.url, filepath);
      downloaded++;
      console.log(`      ✅ ${brand.name} téléchargé`);
    } catch (error) {
      failed++;
      console.error(`      ❌ Erreur pour ${brand.name}:`, error instanceof Error ? error.message : error);
    }

    // Pause entre les téléchargements pour éviter la surcharge
    if (i < brands.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✨ Téléchargement terminé !`);
  console.log(`📊 Statistiques:`);
  console.log(`   - Total: ${brands.length}`);
  console.log(`   - Téléchargés: ${downloaded}`);
  console.log(`   - Ignorés (déjà existants): ${skipped}`);
  console.log(`   - Échecs: ${failed}`);
  console.log(`   - Dossier: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});


