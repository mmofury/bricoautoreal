// Script pour lister tous les suppliers de Product qui n'ont pas de logo
// Usage: dotenv -e ../.env.local -- tsx scripts/list-suppliers-without-logo.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Recherche des suppliers sans logo...\n");

  // Récupérer tous les supplierName uniques de Product
  const productSupplierNames = await prisma.$queryRaw<Array<{ supplier_name: string }>>`
    SELECT DISTINCT supplier_name
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
    ORDER BY supplier_name
  `;

  // Récupérer tous les supplierName de SupplierLogo
  const logoSupplierNames = await prisma.supplierLogo.findMany({
    select: { supplierName: true },
  });

  const logoSupplierNamesSet = new Set(
    logoSupplierNames.map((l) => l.supplierName.toLowerCase())
  );

  // Trouver les suppliers sans logo
  const suppliersWithoutLogo: Array<{
    name: string;
    productCount: number;
  }> = [];

  for (const product of productSupplierNames) {
    const supplierName = product.supplier_name;
    if (!supplierName) continue;

    const hasLogo = Array.from(logoSupplierNamesSet).some(
      (logoName) => logoName.toLowerCase() === supplierName.toLowerCase()
    );

    if (!hasLogo) {
      // Compter le nombre de produits pour ce supplier
      const count = await prisma.product.count({
        where: { supplierName: supplierName },
      });

      suppliersWithoutLogo.push({
        name: supplierName,
        productCount: count,
      });
    }
  }

  // Trier par nombre de produits (décroissant)
  suppliersWithoutLogo.sort((a, b) => b.productCount - a.productCount);

  console.log(`📊 ${suppliersWithoutLogo.length} suppliers sans logo trouvés\n`);

  // Afficher tous les suppliers avec leur nombre de produits
  console.log("📋 Liste complète (triée par nombre de produits):\n");
  console.log("Nom du supplier | Nombre de produits");
  console.log("----------------|-------------------");

  let totalProducts = 0;
  for (const supplier of suppliersWithoutLogo) {
    console.log(`${supplier.name.padEnd(15)} | ${supplier.productCount.toLocaleString()}`);
    totalProducts += supplier.productCount;
  }

  console.log(`\n📈 Total: ${totalProducts.toLocaleString()} produits sans logo de supplier`);

  // Afficher les top 20
  console.log("\n🏆 Top 20 suppliers sans logo (par nombre de produits):\n");
  suppliersWithoutLogo.slice(0, 20).forEach((supplier, index) => {
    console.log(
      `${(index + 1).toString().padStart(2)}. ${supplier.name.padEnd(30)} - ${supplier.productCount.toLocaleString()} produits`
    );
  });

  // Chercher des correspondances potentielles (variantes de noms)
  console.log("\n🔍 Recherche de correspondances potentielles...\n");
  const logoNames = logoSupplierNames.map((l) => l.supplierName);

  let foundMatches = 0;
  for (const supplier of suppliersWithoutLogo.slice(0, 30)) {
    const supplierLower = supplier.name.toLowerCase();
    
    // Chercher des logos avec des noms similaires
    const potentialMatches = logoNames.filter((logoName) => {
      const logoLower = logoName.toLowerCase();
      
      // Vérifier si l'un contient l'autre (sans tenir compte des espaces/tirets)
      const supplierNormalized = supplierLower.replace(/[\s\-_\.]/g, "");
      const logoNormalized = logoLower.replace(/[\s\-_\.]/g, "");
      
      return (
        supplierNormalized.includes(logoNormalized) ||
        logoNormalized.includes(supplierNormalized) ||
        supplierNormalized === logoNormalized
      );
    });

    if (potentialMatches.length > 0) {
      console.log(`   "${supplier.name}" pourrait correspondre à: ${potentialMatches.join(", ")}`);
      foundMatches++;
    }
  }

  if (foundMatches === 0) {
    console.log("   Aucune correspondance évidente trouvée.");
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

