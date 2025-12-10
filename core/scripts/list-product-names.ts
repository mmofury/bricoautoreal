import { db } from '../lib/db';

async function listProductNames() {
  console.log('Récupération de tous les noms de produits distincts...\n');

  // Utiliser une requête SQL brute pour obtenir les productName distincts
  const result = await db.$queryRaw<Array<{ product_name: string }>>`
    SELECT DISTINCT product_name 
    FROM products 
    WHERE product_name IS NOT NULL 
    ORDER BY product_name ASC
  `;

  const productNames = result.map((r) => r.product_name);

  console.log(`Total de noms de produits uniques: ${productNames.length}\n`);
  console.log('=== LISTE DES NOMS DE PRODUITS ===\n');

  // Afficher tous les noms
  productNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });

  // Sauvegarder dans un fichier
  const fs = await import('fs');
  const path = await import('path');
  
  const outputPath = path.join(process.cwd(), 'product-names-list.txt');
  const content = productNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
  
  fs.writeFileSync(
    outputPath,
    `Total: ${productNames.length} noms de produits uniques\n\n${content}`,
    'utf-8'
  );

  console.log(`\n\nListe sauvegardée dans: ${outputPath}`);
  
  await db.$disconnect();
}

listProductNames().catch((error) => {
  console.error('Erreur:', error);
  process.exit(1);
});

