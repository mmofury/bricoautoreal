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

async function analyzeMissingCategories() {
  console.log('🔍 Analyse des groupes sans catégories...\n');

  // Récupérer les groupes sans catégories
  const groupsWithoutCategories = await db.productGroup.findMany({
    where: {
      categories: {
        none: {},
      },
    },
    select: {
      id: true,
      productName: true,
      slug: true,
      tecdocProductId: true,
    },
  });

  console.log(`📦 ${groupsWithoutCategories.length} groupes sans catégories\n`);

  // Vérifier dans product-groups.json
  const productGroupsPath = path.join(process.cwd(), 'product-groups.json');
  const productGroupsContent = fs.readFileSync(productGroupsPath, 'utf-8');
  const productGroupsData: Array<{
    productName: string;
    slug: string;
    tecdocProductId: number;
    categories: Array<{
      path: string[];
      categoryId: number;
      level: number;
    }>;
  }> = JSON.parse(productGroupsContent);

  const productGroupsMap = new Map(
    productGroupsData.map(pg => [pg.slug, pg])
  );

  console.log('🔍 Vérification dans product-groups.json...\n');

  let foundInJSON = 0;
  let notFoundInJSON = 0;
  const missingCategories: Array<{ name: string; slug: string; reason: string }> = [];

  for (const group of groupsWithoutCategories) {
    const jsonData = productGroupsMap.get(group.slug);
    
    if (!jsonData) {
      notFoundInJSON++;
      missingCategories.push({
        name: group.productName,
        slug: group.slug,
        reason: 'Non trouvé dans product-groups.json',
      });
    } else if (jsonData.categories.length === 0) {
      foundInJSON++;
      missingCategories.push({
        name: group.productName,
        slug: group.slug,
        reason: 'Aucune catégorie dans product-groups.json',
      });
    } else {
      foundInJSON++;
      missingCategories.push({
        name: group.productName,
        slug: group.slug,
        reason: `Catégories dans JSON mais non importées (${jsonData.categories.length} catégories)`,
      });
    }
  }

  console.log(`✅ Trouvés dans product-groups.json: ${foundInJSON}`);
  console.log(`❌ Non trouvés dans product-groups.json: ${notFoundInJSON}\n`);

  // Vérifier dans tecdoc-results
  console.log('🔍 Vérification dans tecdoc-results...\n');
  const tecdocResultsPath = path.join(process.cwd(), 'tecdoc-results');
  const tecdocFiles = fs.readdirSync(tecdocResultsPath).filter(f => f.endsWith('.json'));

  const tecdocMap = new Map<string, boolean>();
  for (const file of tecdocFiles) {
    const filePath = path.join(tecdocResultsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.productName) {
      const slug = slugify(data.productName);
      tecdocMap.set(slug, true);
    }
  }

  let foundInTecDoc = 0;
  let notFoundInTecDoc = 0;

  for (const group of groupsWithoutCategories) {
    if (tecdocMap.has(group.slug)) {
      foundInTecDoc++;
    } else {
      notFoundInTecDoc++;
    }
  }

  console.log(`✅ Trouvés dans tecdoc-results: ${foundInTecDoc}`);
  console.log(`❌ Non trouvés dans tecdoc-results: ${notFoundInTecDoc}\n`);

  // Afficher quelques exemples
  console.log('📋 Exemples de groupes sans catégories:\n');
  for (const item of missingCategories.slice(0, 10)) {
    console.log(`   - ${item.name}`);
    console.log(`     Raison: ${item.reason}`);
    console.log('');
  }

  if (missingCategories.length > 10) {
    console.log(`   ... et ${missingCategories.length - 10} autres\n`);
  }

  await db.$disconnect();
}

analyzeMissingCategories().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























