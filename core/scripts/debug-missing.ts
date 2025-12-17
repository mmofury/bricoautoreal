import { db } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function debugMissing() {
  // Prendre un groupe sans catégorie
  const group = await db.productGroup.findFirst({
    where: {
      categories: {
        none: {},
      },
    },
    select: {
      productName: true,
      slug: true,
      tecdocProductId: true,
    },
  });

  if (!group) {
    console.log('Aucun groupe sans catégorie trouvé');
    return;
  }

  console.log(`🔍 Groupe test: ${group.productName}`);
  console.log(`   Slug: ${group.slug}`);
  console.log(`   TecDoc ProductId: ${group.tecdocProductId}\n`);

  // Chercher dans tecdoc-results
  const tecdocResultsPath = path.join(process.cwd(), 'tecdoc-results');
  const tecdocFiles = fs.readdirSync(tecdocResultsPath).filter(f => f.endsWith('.json'));

  console.log(`📂 Recherche dans ${tecdocFiles.length} fichiers...\n`);

  // Chercher par slug exact
  let foundBySlug = false;
  for (const file of tecdocFiles) {
    const filePath = path.join(tecdocResultsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.productName) {
      const fileSlug = slugify(data.productName);
      if (fileSlug === group.slug) {
        foundBySlug = true;
        console.log(`✅ Trouvé par slug: ${file}`);
        console.log(`   ProductName dans fichier: ${data.productName}`);
        console.log(`   ProductId dans fichier: ${data.productId}`);
        console.log(`   Has arborescence: ${!!data.arborescence}`);
        console.log(`   Has arborescencePaths: ${!!data.arborescencePaths}`);
        
        if (data.arborescencePaths && data.arborescencePaths.length > 0) {
          console.log(`   ArborescencePaths: ${data.arborescencePaths.length} chemins`);
          for (const pathData of data.arborescencePaths.slice(0, 2)) {
            console.log(`     - ${pathData.path.join(' > ')} (categoryId: ${pathData.finalCategoryId})`);
          }
        }
        break;
      }
    }
  }

  if (!foundBySlug) {
    console.log(`❌ Non trouvé par slug exact`);
    
    // Chercher par productId
    console.log(`\n🔍 Recherche par tecdocProductId (${group.tecdocProductId})...`);
    let foundById = false;
    for (const file of tecdocFiles.slice(0, 100)) { // Limiter pour la démo
      const filePath = path.join(tecdocResultsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.productId === group.tecdocProductId) {
        foundById = true;
        console.log(`✅ Trouvé par productId: ${file}`);
        console.log(`   ProductName dans fichier: ${data.productName}`);
        console.log(`   Slug calculé: ${slugify(data.productName)}`);
        console.log(`   Slug attendu: ${group.slug}`);
        break;
      }
    }
    
    if (!foundById) {
      console.log(`❌ Non trouvé par productId non plus`);
    }
  }

  await db.$disconnect();
}

debugMissing().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});































