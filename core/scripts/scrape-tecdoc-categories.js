/**
 * Script pour scraper les catégories TecDoc depuis la page
 * À exécuter dans la console du navigateur sur la page TecDoc
 */

(function() {
  console.log('🚀 Démarrage du scraping des catégories TecDoc...\n');

  // Fonction pour extraire les données d'un nœud
  function extractNodeData(node) {
    const link = node.querySelector('a.node-link');
    if (!link) return null;

    const name = link.textContent.trim();
    const dataId = link.getAttribute('data-id');
    const taValue = link.getAttribute('ta-value');
    const taName = link.getAttribute('ta-name');

    return {
      name: name,
      id: dataId || taValue || null,
      taName: taName,
      taValue: taValue,
    };
  }

  // Fonction récursive pour parcourir l'arbre
  function traverseTree(container, level = 1, parent = null) {
    const result = [];
    
    // Trouver tous les nœuds de l'arbre (li avec role="treeitem")
    const treeItems = container.querySelectorAll('li[role="treeitem"]');
    
    // Créer une map pour organiser les nœuds par leur parent
    const nodeMap = new Map();
    const rootNodes = [];

    treeItems.forEach((item) => {
      const nodeData = extractNodeData(item);
      if (!nodeData) return;

      // Trouver le niveau en comptant les parents
      let currentLevel = 1;
      let parentElement = item.parentElement;
      while (parentElement && parentElement !== container) {
        if (parentElement.tagName === 'UL' || parentElement.classList.contains('p-treenode-children')) {
          currentLevel++;
        }
        parentElement = parentElement.parentElement;
      }

      // Trouver le parent dans la structure
      let parentNode = null;
      let parentLi = item.parentElement.closest('li[role="treeitem"]');
      if (parentLi) {
        const parentData = extractNodeData(parentLi);
        if (parentData) {
          parentNode = parentData.name;
        }
      }

      const node = {
        name: nodeData.name,
        id: nodeData.id,
        level: currentLevel,
        parent: parentNode,
        taName: nodeData.taName,
        taValue: nodeData.taValue,
      };

      result.push(node);
    });

    return result;
  }

  // Méthode alternative : utiliser la structure PrimeNG Tree
  function extractFromPrimeNGTree(container) {
    const result = [];
    
    // Trouver le conteneur principal
    const treeContainer = container.querySelector('.p-tree') || container;
    
    // Fonction récursive pour parcourir les nœuds
    function processNode(nodeElement, level = 1, parentName = null) {
      // Trouver le lien du nœud
      const link = nodeElement.querySelector('a.node-link');
      if (!link) return;

      const name = link.textContent.trim();
      const dataId = link.getAttribute('data-id');
      const taValue = link.getAttribute('ta-value');
      const taName = link.getAttribute('ta-name');

      const node = {
        name: name,
        id: dataId || taValue || null,
        level: level,
        parent: parentName,
        taName: taName,
        taValue: taValue,
      };

      result.push(node);

      // Trouver les enfants
      const childrenContainer = nodeElement.querySelector('.p-treenode-children, ul[role="group"]');
      if (childrenContainer) {
        const childNodes = childrenContainer.querySelectorAll('li[role="treeitem"]');
        childNodes.forEach((childNode) => {
          processNode(childNode, level + 1, name);
        });
      }
    }

    // Trouver tous les nœuds racine
    const rootNodes = treeContainer.querySelectorAll('> ul > li[role="treeitem"], .p-treenode-content');
    rootNodes.forEach((rootNode) => {
      const treeItem = rootNode.closest('li[role="treeitem"]') || rootNode;
      processNode(treeItem, 1, null);
    });

    return result;
  }

  // Essayer de trouver le conteneur
  let container = document.querySelector('div#pn_id_848_content');
  
  if (!container) {
    // Essayer d'autres sélecteurs possibles
    container = document.querySelector('.p-tree') || 
                document.querySelector('[role="tree"]') ||
                document.querySelector('div.p-tree-container');
  }

  if (!container) {
    console.error('❌ Conteneur non trouvé. Essayez de spécifier le bon sélecteur.');
    console.log('Sélecteurs testés:');
    console.log('  - div#pn_id_848_content');
    console.log('  - .p-tree');
    console.log('  - [role="tree"]');
    return;
  }

  console.log('✅ Conteneur trouvé:', container);

  // Extraire les catégories
  let categories = extractFromPrimeNGTree(container);
  
  // Si la méthode PrimeNG ne fonctionne pas, utiliser la méthode alternative
  if (categories.length === 0) {
    console.log('⚠️  Méthode PrimeNG échouée, utilisation de la méthode alternative...');
    categories = traverseTree(container);
  }

  if (categories.length === 0) {
    console.error('❌ Aucune catégorie trouvée. Vérifiez la structure HTML de la page.');
    console.log('Structure HTML du conteneur:', container.innerHTML.substring(0, 500));
    return;
  }

  console.log(`\n✅ ${categories.length} catégories trouvées\n`);

  // Afficher les statistiques
  const byLevel = {};
  categories.forEach(cat => {
    byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
  });

  console.log('📊 Statistiques:');
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`   Niveau ${level}: ${byLevel[level]} catégories`);
  });

  // Construire la structure hiérarchique (comme arbo.json)
  function buildHierarchy(categories) {
    const root = {};
    const nodeMap = new Map();

    // Créer tous les nœuds
    categories.forEach(cat => {
      nodeMap.set(cat.name, {
        name: cat.name,
        id: cat.id,
        level: cat.level,
        children: {},
      });
    });

    // Construire la hiérarchie
    categories.forEach(cat => {
      const node = nodeMap.get(cat.name);
      
      if (cat.parent === null || !cat.parent) {
        // Nœud racine
        root[cat.name] = node;
      } else {
        // Trouver le parent
        const parent = nodeMap.get(cat.parent);
        if (parent) {
          parent.children[cat.name] = node;
        } else {
          // Parent non trouvé, mettre à la racine
          root[cat.name] = node;
        }
      }
    });

    return root;
  }

  // Générer les deux formats de sortie
  const flatList = categories.map(cat => ({
    name: cat.name,
    id: cat.id,
    level: cat.level,
    parent: cat.parent,
    taName: cat.taName,
    taValue: cat.taValue,
  }));

  const hierarchy = buildHierarchy(categories);

  // Afficher un aperçu
  console.log('\n📋 Aperçu (10 premières catégories):');
  flatList.slice(0, 10).forEach(cat => {
    const indent = '  '.repeat(cat.level - 1);
    console.log(`${indent}${cat.level > 1 ? '└─' : '🌲'} ${cat.name} (ID: ${cat.id || 'N/A'}, Parent: ${cat.parent || 'racine'})`);
  });

  // Copier les résultats dans le presse-papiers (si possible)
  const output = {
    flat: flatList,
    hierarchy: hierarchy,
    stats: {
      total: categories.length,
      byLevel: byLevel,
    },
  };

  // Créer un lien de téléchargement
  const dataStr = JSON.stringify(output, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tecdoc-categories-${new Date().toISOString().split('T')[0]}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('\n✅ Fichier JSON téléchargé!');
  console.log('\n💾 Les données sont également disponibles dans la variable globale:');
  console.log('   window.tecdocCategories');
  
  // Stocker dans une variable globale pour inspection
  window.tecdocCategories = output;
  
  console.log('\n📋 Format des données:');
  console.log('   - window.tecdocCategories.flat : Liste plate avec tous les niveaux');
  console.log('   - window.tecdocCategories.hierarchy : Structure hiérarchique');
  console.log('   - window.tecdocCategories.stats : Statistiques');

  return output;
})();






























