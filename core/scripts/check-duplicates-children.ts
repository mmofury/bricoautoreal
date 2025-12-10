// Script pour vérifier les doublons dans les enfants
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  // Trouver une hiérarchie avec "collecteur" au niveau 3
  const hierarchy = await prisma.interCarsHierarchy.findFirst({
    where: {
      level3LabelFr: { contains: 'collecteur' },
    },
  });

  if (!hierarchy) {
    console.log('Aucune hiérarchie trouvée avec "collecteur"');
    await prisma.$disconnect();
    return;
  }

  console.log(`Hiérarchie trouvée: ${hierarchy.genericArticleId}`);
  console.log(`Level 3: ${hierarchy.level3LabelFr} (ID: ${hierarchy.level3Id})\n`);

  // Vérifier les childrenLevel4
  if (hierarchy.childrenLevel4) {
    try {
      const children = JSON.parse(hierarchy.childrenLevel4) as Array<{
        id: string;
        label: string;
        labelFr: string | null;
        url: string | null;
      }>;

      console.log(`Nombre d'enfants dans childrenLevel4: ${children.length}\n`);

      // Compter les doublons par ID
      const idCounts = new Map<string, number>();
      const childrenById = new Map<string, Array<{ labelFr: string | null }>>();

      for (const child of children) {
        idCounts.set(child.id, (idCounts.get(child.id) || 0) + 1);
        
        if (!childrenById.has(child.id)) {
          childrenById.set(child.id, []);
        }
        childrenById.get(child.id)!.push({ labelFr: child.labelFr });
      }

      // Afficher les doublons
      console.log('Analyse des doublons par ID:\n');
      for (const [id, count] of idCounts.entries()) {
        if (count > 1) {
          const labels = childrenById.get(id)!;
          console.log(`ID ${id} apparaît ${count} fois:`);
          labels.forEach((l, i) => {
            console.log(`  ${i + 1}. "${l.labelFr}"`);
          });
          console.log('');
        }
      }

      // Vérifier aussi les doublons par label (normalisé)
      console.log('Analyse des doublons par label (normalisé):\n');
      const labelCounts = new Map<string, number>();
      const childrenByLabel = new Map<string, Array<{ id: string; labelFr: string | null }>>();

      for (const child of children) {
        const normalizedLabel = child.labelFr?.toLowerCase().trim() || '';
        labelCounts.set(normalizedLabel, (labelCounts.get(normalizedLabel) || 0) + 1);
        
        if (!childrenByLabel.has(normalizedLabel)) {
          childrenByLabel.set(normalizedLabel, []);
        }
        childrenByLabel.get(normalizedLabel)!.push({ id: child.id, labelFr: child.labelFr });
      }

      for (const [label, count] of labelCounts.entries()) {
        if (count > 1 && label) {
          const children = childrenByLabel.get(label)!;
          console.log(`Label "${label}" apparaît ${count} fois:`);
          children.forEach((c, i) => {
            console.log(`  ${i + 1}. ID: ${c.id}, Label: "${c.labelFr}"`);
          });
          console.log('');
        }
      }

      // Vérifier dans la base : combien de hiérarchies partagent le même level3Id
      const hierarchiesWithSameLevel3 = await prisma.interCarsHierarchy.findMany({
        where: {
          level3Id: hierarchy.level3Id,
        },
        select: {
          id: true,
          genericArticleId: true,
          level3LabelFr: true,
          level4Id: true,
          level4LabelFr: true,
        },
      });

      console.log(`\nNombre de hiérarchies avec le même level3Id (${hierarchy.level3Id}): ${hierarchiesWithSameLevel3.length}`);
      
      // Compter les level4Id uniques
      const uniqueLevel4Ids = new Set(
        hierarchiesWithSameLevel3
          .map((h) => h.level4Id)
          .filter((id): id is string => id !== null)
      );

      console.log(`Nombre de level4Id uniques dans ces hiérarchies: ${uniqueLevel4Ids.size}`);
      console.log(`Nombre d'enfants dans childrenLevel4: ${children.length}`);
      console.log(`Différence: ${children.length - uniqueLevel4Ids.size} doublons potentiels\n`);

    } catch (error) {
      console.error('Erreur lors du parsing:', error);
    }
  } else {
    console.log('Aucun childrenLevel4 trouvé');
  }

  await prisma.$disconnect();
}

checkDuplicates().catch(console.error);









