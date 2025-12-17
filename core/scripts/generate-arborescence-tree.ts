import { db } from '../lib/db';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateArborescenceTree() {
  console.log('🌳 Génération de l\'arborescence complète...\n');

  // Récupérer toutes les catégories avec leurs relations
  const allCategories = await db.tecDocCategory.findMany({
    include: {
      parent: true,
      children: {
        orderBy: {
          name: 'asc',
        },
      },
      productGroups: {
        include: {
          productGroup: {
            select: {
              id: true,
              productName: true,
              slug: true,
              url: true,
            },
          },
        },
      },
    },
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
    ],
  });

  // Construire l'arbre à partir des catégories de niveau 1
  const rootCategories = allCategories.filter(cat => cat.parentId === null);

  console.log(`📦 Catégories totales: ${allCategories.length}`);
  console.log(`🌲 Catégories racine (niveau 1): ${rootCategories.length}\n`);

  let output = '# Arborescence des Catégories et Groupes de Produits\n\n';
  output += `Généré le: ${new Date().toLocaleString('fr-FR')}\n\n`;
  output += `- Total de catégories: ${allCategories.length}\n`;
  output += `- Catégories racine (niveau 1): ${rootCategories.length}\n\n`;
  output += '---\n\n';

  // Fonction récursive pour construire l'arbre
  function buildTree(category: any, depth: number = 0, prefix: string = ''): string {
    const indent = '  '.repeat(depth);
    const isLast = false; // On ne peut pas savoir facilement si c'est le dernier
    const connector = depth === 0 ? '🌲' : depth === 1 ? '📁' : depth === 2 ? '📂' : '  ';
    
    let tree = '';
    
    // Afficher la catégorie
    tree += `${indent}${connector} **${category.name}**\n`;
    tree += `${indent}   └─ ID: ${category.id} | TecDoc ID: ${category.tecdocCategoryId || 'N/A'} | Niveau: ${category.level}\n`;
    tree += `${indent}   └─ URL: ${category.url}\n`;
    
    // Afficher les groupes de produits associés
    if (category.productGroups.length > 0) {
      tree += `${indent}   └─ 📦 Groupes de produits (${category.productGroups.length}):\n`;
      category.productGroups.forEach((rel: any, idx: number) => {
        const pg = rel.productGroup;
        const isLastGroup = idx === category.productGroups.length - 1;
        const groupPrefix = isLastGroup ? '└─' : '├─';
        tree += `${indent}      ${groupPrefix} ${pg.productName}\n`;
        tree += `${indent}         └─ URL: ${pg.url}\n`;
      });
    }
    
    tree += '\n';

    // Afficher les enfants
    const children = allCategories.filter(cat => cat.parentId === category.id);
    if (children.length > 0) {
      children.forEach((child, idx) => {
        const isLastChild = idx === children.length - 1;
        tree += buildTree(child, depth + 1, isLastChild ? '└─' : '├─');
      });
    }

    return tree;
  }

  // Générer l'arbre pour chaque catégorie racine
  let treeCount = 0;
  for (const root of rootCategories) {
    treeCount++;
    output += `## ${root.name}\n\n`;
    output += buildTree(root, 0);
    output += '\n---\n\n';
    
    // Limiter à 50 catégories racine pour éviter un fichier trop volumineux
    if (treeCount >= 50) {
      output += `\n*... (${rootCategories.length - 50} autres catégories racine non affichées)*\n`;
      break;
    }
  }

  // Statistiques supplémentaires
  output += '\n## 📊 Statistiques\n\n';
  
  const levelStats = new Map<number, number>();
  allCategories.forEach(cat => {
    levelStats.set(cat.level, (levelStats.get(cat.level) || 0) + 1);
  });

  output += '### Répartition par niveau:\n\n';
  const sortedLevels = Array.from(levelStats.keys()).sort((a, b) => a - b);
  sortedLevels.forEach(level => {
    output += `- Niveau ${level}: ${levelStats.get(level)} catégories\n`;
  });

  // Compter les groupes de produits
  const allProductGroups = await db.productGroup.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  output += `\n### Groupes de produits:\n\n`;
  output += `- Total de groupes de produits: ${allProductGroups.length}\n`;
  output += `- Groupes avec catégories: ${allProductGroups.filter(pg => pg.categories.length > 0).length}\n`;
  output += `- Groupes sans catégories: ${allProductGroups.filter(pg => pg.categories.length === 0).length}\n`;

  // Catégories avec le plus de groupes de produits
  const categoriesWithProducts = allCategories
    .map(cat => ({
      name: cat.name,
      count: cat.productGroups.length,
      level: cat.level,
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  output += `\n### Top 20 catégories avec le plus de groupes de produits:\n\n`;
  categoriesWithProducts.forEach((cat, idx) => {
    output += `${idx + 1}. **${cat.name}** (niveau ${cat.level}): ${cat.count} groupes\n`;
  });

  // Sauvegarder le fichier
  const outputPath = join(process.cwd(), 'arborescence-tree.md');
  writeFileSync(outputPath, output, 'utf-8');

  console.log(`✅ Arborescence générée dans: ${outputPath}`);
  console.log(`📄 Taille du fichier: ${(output.length / 1024).toFixed(2)} KB\n`);

  await db.$disconnect();
}

generateArborescenceTree().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});






























