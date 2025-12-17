// Script pour comparer les suppliers dans SupplierLogo et Product
// Usage: dotenv -e ../.env.local -- tsx scripts/compare-suppliers.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Analyse des suppliers...\n");

  // 1. Compter les suppliers dans SupplierLogo
  const supplierLogoCount = await prisma.supplierLogo.count();
  console.log(`📊 Suppliers dans SupplierLogo: ${supplierLogoCount}`);

  // 2. Compter les supplierName uniques dans Product (non null)
  const uniqueSuppliersInProducts = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT supplier_name) as count
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
  `;
  const uniqueProductSuppliers = Number(uniqueSuppliersInProducts[0]?.count || 0);
  console.log(`📦 Suppliers uniques dans Product: ${uniqueProductSuppliers}`);

  // 3. Récupérer tous les supplierName uniques de Product
  const productSupplierNames = await prisma.$queryRaw<Array<{ supplier_name: string }>>`
    SELECT DISTINCT supplier_name
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
    ORDER BY supplier_name
  `;

  // 4. Récupérer tous les supplierName de SupplierLogo
  const logoSupplierNames = await prisma.supplierLogo.findMany({
    select: { supplierName: true },
    orderBy: { supplierName: "asc" },
  });

  const logoSupplierNamesSet = new Set(
    logoSupplierNames.map((l) => l.supplierName.toLowerCase())
  );

  // 5. Trouver les matches (case-insensitive)
  let matchedCount = 0;
  const matched: string[] = [];
  const notMatched: string[] = [];

  for (const product of productSupplierNames) {
    const supplierName = product.supplier_name;
    if (!supplierName) continue;

    const found = Array.from(logoSupplierNamesSet).some(
      (logoName) => logoName.toLowerCase() === supplierName.toLowerCase()
    );

    if (found) {
      matchedCount++;
      matched.push(supplierName);
    } else {
      notMatched.push(supplierName);
    }
  }

  console.log(`\n✅ Suppliers de Product avec logo: ${matchedCount}`);
  console.log(`❌ Suppliers de Product sans logo: ${notMatched.length}`);

  // 6. Trouver les logos qui ne correspondent à aucun Product
  const productSupplierNamesSet = new Set(
    productSupplierNames.map((p) => p.supplier_name.toLowerCase())
  );

  const logosWithoutProducts = logoSupplierNames.filter(
    (logo) => !productSupplierNamesSet.has(logo.supplierName.toLowerCase())
  );

  console.log(
    `\n📋 Logos sans produits correspondants: ${logosWithoutProducts.length}`
  );

  // 7. Statistiques supplémentaires
  const productsWithSupplier = await prisma.product.count({
    where: {
      supplierName: { not: null },
    },
  });

  const productsWithLogo = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM products p
    INNER JOIN supplier_logos sl ON LOWER(p.supplier_name) = LOWER(sl.supplier_name)
    WHERE p.supplier_name IS NOT NULL
  `;

  console.log(`\n📈 Statistiques détaillées:`);
  console.log(`   - Produits avec supplierName: ${productsWithSupplier}`);
  console.log(
    `   - Produits avec logo disponible: ${Number(productsWithLogo[0]?.count || 0)}`
  );

  // 8. Afficher quelques exemples
  if (notMatched.length > 0) {
    console.log(`\n⚠️  Exemples de suppliers sans logo (10 premiers):`);
    notMatched.slice(0, 10).forEach((name) => {
      console.log(`   - ${name}`);
    });
  }

  if (logosWithoutProducts.length > 0) {
    console.log(`\n📋 Exemples de logos sans produits (10 premiers):`);
    logosWithoutProducts.slice(0, 10).forEach((logo) => {
      console.log(`   - ${logo.supplierName}`);
    });
  }
}

main()
  .catch((err) => {
    console.error("❌ Erreur:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


