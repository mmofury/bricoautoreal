// Script pour SCRAPER uniquement les catégories TecDoc (sans ouvrir les nœuds)
// À utiliser APRÈS avoir ouvert tous les nœuds avec open-all-tecdoc-nodes.js
// Copiez-collez ce script dans la console du navigateur (F12)

console.log('📋 Script de scraping chargé...');
console.log('🚀 Démarrage du script...');

(async function() {
  try {
    console.log('🚀 Scraping des catégories TecDoc (sans ouverture)...\n');
    
    // Message immédiat pour confirmer que le script démarre
    if (typeof alert !== 'undefined') {
      console.log('✅ Script démarré! Vérifiez la console pour suivre la progression.');
    }

  // Trouver le conteneur
  const container = document.querySelector('div#pn_id_848_content') || 
                    document.querySelector('.p-tree') || 
                    document.querySelector('[role="tree"]') ||
                    document.querySelector('.p-tree-container');

  if (!container) {
    console.error('❌ Conteneur non trouvé!');
    console.log('💡 Essayez de vérifier que la page est chargée.');
    return;
  }

    console.log('✅ Conteneur trouvé\n');

    // Attendre un peu pour que tout soit bien rendu
    console.log('⏳ Attente du rendu complet...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Rendu prêt\n');

  // Extraire TOUS les liens maintenant que tout est ouvert
  console.log('🔍 Recherche des liens...');
  
  // Chercher de plusieurs manières pour être sûr
  let allLinks = container.querySelectorAll('a.node-link');
  console.log(`   ${allLinks.length} liens trouvés avec .node-link`);
  
  // Aussi chercher par attribut ta-value ou data-id
  const linksByAttr = container.querySelectorAll('a[ta-value], a[data-id]');
  console.log(`   ${linksByAttr.length} liens trouvés avec attributs ta-value/data-id`);
  
  // Chercher aussi tous les liens dans les treeitems
  const linksInTree = container.querySelectorAll('li[role="treeitem"] a, li[aria-expanded] a');
  console.log(`   ${linksInTree.length} liens trouvés dans les treeitems`);
  
  // Combiner et dédupliquer
  const linkSet = new Set();
  allLinks.forEach(link => linkSet.add(link));
  linksByAttr.forEach(link => linkSet.add(link));
  linksInTree.forEach(link => linkSet.add(link));
  
  allLinks = Array.from(linkSet);
  
  console.log(`✅ ${allLinks.length} liens uniques trouvés\n`);
  
  // Vérifier s'il reste des nœuds fermés
  const remainingCollapsed = container.querySelectorAll('[role="treeitem"][aria-expanded="false"], li[aria-expanded="false"]').length;
  if (remainingCollapsed > 0) {
    console.warn(`⚠️  ${remainingCollapsed} nœuds restent fermés. Certaines catégories peuvent manquer.\n`);
  }

  if (allLinks.length === 0) {
    console.error('❌ Aucun lien trouvé!');
    console.log('💡 Essayez de vérifier que les nœuds sont bien ouverts.');
    return;
  }

  const categories = [];
  const idMap = new Map(); // Pour stocker les catégories par ID

  // Fonction pour calculer le niveau d'un élément
  function calculateLevel(element, container) {
    let level = 1;
    let current = element;
    
    // Compter les UL parents (chaque UL imbriqué = un niveau)
    while (current && current !== container) {
      const parent = current.parentElement;
      if (parent && parent.tagName === 'UL') {
        level++;
      }
      current = parent;
    }
    
    return level;
  }

  // Fonction pour trouver le parent d'un élément
  function findParent(link, container) {
    // Chercher le li parent
    const parentLi = link.closest('li[role="treeitem"], li[aria-expanded]');
    if (!parentLi) return null;

    // Remonter pour trouver le li parent (pas le li lui-même)
    let current = parentLi.parentElement;
    while (current && current !== container) {
      if (current.tagName === 'UL') {
        const grandParentLi = current.closest('li[role="treeitem"], li[aria-expanded]');
        if (grandParentLi && grandParentLi !== parentLi) {
          const parentLink = grandParentLi.querySelector('a.node-link, a[ta-value], a[data-id]');
          if (parentLink) {
            return {
              name: parentLink.textContent.trim(),
              id: parentLink.getAttribute('ta-value') || parentLink.getAttribute('data-id')
            };
          }
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  // Extraire toutes les catégories
  console.log('📋 Extraction des catégories...');
  const processedIds = new Set(); // Pour éviter les doublons
  
  allLinks.forEach((link, index) => {
    try {
      const name = link.textContent.trim();
      
      // Essayer plusieurs méthodes pour obtenir l'ID
      let id = link.getAttribute('ta-value') || 
               link.getAttribute('data-id') ||
               link.getAttribute('taValue') ||
               link.getAttribute('dataId');
      
      // Si l'ID est dans le format "node.data.id", essayer de le parser
      if (id === 'node.data.id' || !id) {
        // Chercher dans les attributs du parent ou dans le DOM
        const parent = link.closest('[role="treeitem"], li[aria-expanded]');
        if (parent) {
          id = parent.getAttribute('data-id') || 
               parent.getAttribute('ta-value') ||
               parent.getAttribute('id');
        }
      }
      
      if (!name || name.length === 0) return;
      
      // Éviter les doublons
      if (id && processedIds.has(id)) {
        return;
      }
      if (id) {
        processedIds.add(id);
      }
      
      const level = calculateLevel(link, container);
      const parent = findParent(link, container);
      
      const category = {
        name: name,
        id: id || null,
        level: level,
        parent: parent ? parent.name : null,
        parentId: parent ? parent.id : null,
      };
      
      categories.push(category);
      
      if (id) {
        idMap.set(id, category);
      }
      
      if ((index + 1) % 100 === 0) {
        console.log(`   ${index + 1}/${allLinks.length} catégories traitées...`);
      }
    } catch (e) {
      console.warn(`⚠️  Erreur sur le lien ${index}:`, e.message);
    }
  });

  console.log(`✅ ${categories.length} catégories extraites\n`);

  // Construire la hiérarchie
  console.log('🌲 Construction de la hiérarchie...');
  let hierarchy = {};
  let byLevel = {};
  
  try {
    function buildHierarchy() {
      const root = {};
      const nodeMapById = new Map();
      const nodeMapByName = new Map();

      // Créer tous les nœuds
      categories.forEach(cat => {
        const node = {
          categoryId: cat.id ? parseInt(cat.id) : null,
          categoryName: cat.name,
          level: cat.level,
          children: {},
        };
        
        if (cat.id) {
          nodeMapById.set(cat.id, node);
        }
        nodeMapByName.set(cat.name, node);
      });

      // Construire les relations parent-enfant
      categories.forEach(cat => {
        const node = cat.id ? nodeMapById.get(cat.id) : nodeMapByName.get(cat.name);
        if (!node) return;
        
        if (!cat.parentId && !cat.parent) {
          // Nœud racine
          root[cat.name] = node;
        } else {
          // Trouver le parent
          let parent = null;
          if (cat.parentId) {
            parent = nodeMapById.get(cat.parentId);
          }
          if (!parent && cat.parent) {
            parent = nodeMapByName.get(cat.parent);
          }
          
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

    hierarchy = buildHierarchy();
    console.log('✅ Hiérarchie construite\n');

    // Statistiques
    categories.forEach(cat => {
      byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
    });

    console.log('📊 Statistiques:');
    Object.keys(byLevel).sort().forEach(level => {
      console.log(`   Niveau ${level}: ${byLevel[level]} catégories`);
    });
    console.log('');

    // Aperçu
    console.log('📋 Aperçu (10 premières):');
    categories.slice(0, 10).forEach(cat => {
      const indent = '  '.repeat(cat.level - 1);
      console.log(`${indent}${cat.level === 1 ? '🌲' : '└─'} ${cat.name} (ID: ${cat.id || 'N/A'})`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Erreur lors de la construction de la hiérarchie:', error);
    console.log('⚠️  Continuons quand même...\n');
  }

  // Préparer le JSON
  console.log('💾 Préparation du JSON...');
  const output = {
    flat: categories,
    hierarchy: hierarchy,
    stats: {
      total: categories.length,
      byLevel: byLevel,
    },
  };

  const dataStr = JSON.stringify(output, null, 2);
  
  // Stocker dans des variables globales
  window.tecdocCategories = output;
  window.tecdocCategoriesJSON = dataStr;

  console.log('✅ Données prêtes!');
  console.log('💾 Données disponibles dans: window.tecdocCategories');
  console.log('📋 JSON disponible dans: window.tecdocCategoriesJSON\n');

  // Méthode 1: Téléchargement automatique
  console.log('📥 Tentative de téléchargement automatique...');
  try {
    const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tecdoc-categories-${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Forcer le téléchargement
    setTimeout(() => {
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);
    }, 100);
    
    console.log('✅ Téléchargement automatique déclenché');
  } catch (e) {
    console.warn('⚠️  Téléchargement automatique échoué:', e.message);
  }

  // Méthode 2: Bouton visible sur la page (toujours fonctionne)
  const downloadLink = document.createElement('a');
  downloadLink.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  downloadLink.download = `tecdoc-categories-${new Date().toISOString().split('T')[0]}.json`;
  downloadLink.textContent = '📥 Télécharger le JSON';
  downloadLink.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; z-index: 99999; font-family: Arial, sans-serif; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
  downloadLink.onclick = function(e) {
    e.preventDefault();
    this.click(); // Force le téléchargement
  };
  document.body.appendChild(downloadLink);
  
  // Méthode 3: Copie dans le presse-papiers (si disponible)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const copyButton = document.createElement('button');
    copyButton.textContent = '📋 Copier JSON';
    copyButton.style.cssText = 'position: fixed; top: 60px; right: 10px; padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 5px; z-index: 99999; font-family: Arial, sans-serif; font-size: 14px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    copyButton.onclick = async function() {
      try {
        await navigator.clipboard.writeText(dataStr);
        this.textContent = '✅ Copié!';
        setTimeout(() => {
          this.textContent = '📋 Copier JSON';
        }, 2000);
      } catch (e) {
        console.error('Erreur lors de la copie:', e);
      }
    };
    document.body.appendChild(copyButton);
  }

  console.log('\n💡 Options de téléchargement:');
  console.log('   1. Téléchargement automatique (déjà tenté)');
  console.log('   2. Bouton bleu en haut à droite (téléchargement)');
  if (navigator.clipboard) {
    console.log('   3. Bouton vert (copie dans le presse-papiers)');
  }
    console.log('   4. Tapez: copy(JSON.stringify(window.tecdocCategories, null, 2))');
    console.log('   5. Ou utilisez: window.tecdocCategoriesJSON');
    console.log('\n✅ Script terminé avec succès!\n');

    return output;
  } catch (error) {
    console.error('❌ Erreur dans le script:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
})().catch(error => {
  console.error('❌ Erreur fatale dans le script:', error);
  console.error('Stack:', error.stack);
  alert('❌ Erreur dans le script! Vérifiez la console pour plus de détails.');
});

