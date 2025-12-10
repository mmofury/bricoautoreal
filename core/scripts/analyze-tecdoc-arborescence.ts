import * as fs from 'fs';
import * as path from 'path';

interface CategoryNode {
  name: string; // Clé française
  categoryId: number | null;
  level: number;
  children: Record<string, CategoryNode>;
  productId?: number;
}

interface TecDocResult {
  productName: string;
  arborescence: Record<string, CategoryNode>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début/fin
}

function parseArborescence(
  arbo: Record<string, CategoryNode>,
  currentPath: string[] = [],
  level: number = 1
): Array<{
  name: string;
  slug: string;
  categoryId: number | null;
  level: number;
  path: string;
  fullPath: string[];
  productId?: number;
}> {
  const nodes: Array<{
    name: string;
    slug: string;
    categoryId: number | null;
    level: number;
    path: string;
    fullPath: string[];
    productId?: number;
  }> = [];

  for (const [key, value] of Object.entries(arbo)) {
    // key = nom en français (clé de l'objet)
    const slug = slugify(key);
    const fullPath = [...currentPath, slug];
    const pathString = fullPath.join('/');

    const node = {
      name: key, // ← Utiliser la clé (français), IGNORER value.categoryName
      slug,
      categoryId: value.categoryId,
      level: value.level || level,
      path: pathString,
      fullPath,
      productId: value.productId,
    };

    nodes.push(node);

    // Récursivement parser les enfants
    if (value.children && Object.keys(value.children).length > 0) {
      const childNodes = parseArborescence(value.children, fullPath, level + 1);
      nodes.push(...childNodes);
    }
  }

  return nodes;
}

function analyzeTecDocFile(filePath: string) {
  console.log(`\n=== Analyse de ${path.basename(filePath)} ===\n`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const data: TecDocResult = JSON.parse(content);

  console.log(`ProductName: ${data.productName}`);
  console.log(`ProductId TecDoc: ${data.productId || 'N/A'}\n`);

  // Parser l'arborescence en utilisant uniquement les clés françaises
  const nodes = parseArborescence(data.arborescence);

  console.log('=== ARBORESCENCE (clés françaises uniquement) ===\n');

  // Afficher l'arborescence de manière hiérarchique
  function displayTree(
    arbo: Record<string, CategoryNode>,
    indent: string = '',
    isLast: boolean = true
  ) {
    const keys = Object.keys(arbo);
    keys.forEach((key, index) => {
      const value = arbo[key];
      const isLastItem = index === keys.length - 1;
      const prefix = isLastItem ? '└── ' : '├── ';
      const nextIndent = indent + (isLastItem ? '    ' : '│   ');

      const categoryIdStr = value.categoryId ? ` [ID: ${value.categoryId}]` : '';
      const productIdStr = value.productId ? ` → ProductId: ${value.productId}` : '';
      const categoryNameNote = value.categoryName && value.categoryName !== key
        ? ` (categoryName: "${value.categoryName}" - IGNORÉ)`
        : '';

      console.log(
        `${indent}${prefix}${key}${categoryIdStr} (Niveau ${value.level || '?'})${productIdStr}${categoryNameNote}`
      );

      if (value.children && Object.keys(value.children).length > 0) {
        displayTree(value.children, nextIndent, isLastItem);
      }
    });
  }

  displayTree(data.arborescence);

  console.log('\n=== CHEMINS DE NAVIGATION (chemins les plus courts) ===\n');

  // Extraire tous les chemins avec productId, triés par longueur (plus court d'abord)
  const pathsWithProduct = nodes
    .filter((node) => node.productId)
    .map((node) => ({
      path: node.path,
      level: node.level,
      categoryId: node.categoryId,
    }))
    .sort((a, b) => a.level - b.level); // Trier par niveau (plus court = niveau plus bas)

  // Prendre uniquement les chemins les plus courts (même niveau minimum)
  const minLevel = pathsWithProduct[0]?.level;
  const shortestPaths = pathsWithProduct.filter((p) => p.level === minLevel);

  console.log(`Chemins les plus courts (niveau ${minLevel}):\n`);
  shortestPaths.forEach((item) => {
    console.log(`/categorie/${item.path} [ID: ${item.categoryId}]`);
  });

  if (pathsWithProduct.length > shortestPaths.length) {
    console.log(`\n⚠️  ${pathsWithProduct.length - shortestPaths.length} chemin(s) plus long(s) ignoré(s)`);
  }

  console.log('\n=== TOUS LES NOEUDS ===\n');
  nodes.forEach((node) => {
    console.log(
      `Niveau ${node.level}: ${node.name} → /categorie/${node.path} ${
        node.categoryId ? `[ID: ${node.categoryId}]` : ''
      } ${node.productId ? `→ ProductId: ${node.productId}` : ''}`
    );
  });
}

// Analyser le fichier spécifié
const fileName = process.argv[2] || 'Actuateur,_arbre_excentrique_(levée_variable).json';
// Le script est dans core/scripts, donc tecdoc-results est dans core/tecdoc-results
const filePath = path.join(process.cwd(), 'tecdoc-results', fileName);

if (!fs.existsSync(filePath)) {
  console.error(`Fichier non trouvé: ${filePath}`);
  process.exit(1);
}

analyzeTecDocFile(filePath);

