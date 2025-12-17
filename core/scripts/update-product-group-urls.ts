import { db } from '../lib/db';

async function updateUrls() {
  console.log('🔄 Mise à jour des URLs des groupes de produits...\n');

  const groups = await db.productGroup.findMany({
    select: {
      id: true,
      slug: true,
      displayId: true,
      url: true,
    },
  });

  console.log(`📦 ${groups.length} groupes trouvés\n`);

  let updated = 0;

  for (const group of groups) {
    // Remplacer /produit/ ou /categorie/ par /pieces-detachees/
    const newUrl = `/pieces-detachees/${group.slug}-${group.displayId}`;

    if (group.url !== newUrl) {
      await db.productGroup.update({
        where: { id: group.id },
        data: { url: newUrl },
      });
      updated++;
    }
  }

  console.log(`✅ ${updated} URLs mises à jour\n`);
  await db.$disconnect();
}

updateUrls().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});































