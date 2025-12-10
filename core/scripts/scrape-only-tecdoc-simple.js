// VERSION SIMPLE - Script pour scraper les catégories TecDoc
// Copiez-collez TOUT ce script dans la console (F12)

console.log('🚀 Script démarré!');

(async function() {
  console.log('📋 Étape 1: Recherche du conteneur...');
  
  const container = document.querySelector('div#pn_id_848_content') || 
                    document.querySelector('.p-tree') || 
                    document.querySelector('[role="tree"]') ||
                    document.querySelector('.p-tree-container');

  if (!container) {
    alert('❌ Conteneur non trouvé! Vérifiez que vous êtes sur la bonne page.');
    console.error('❌ Conteneur non trouvé!');
    return;
  }

  console.log('✅ Conteneur trouvé');
  console.log('📋 Étape 2: Recherche des liens...');
  
  // Chercher tous les liens
  const allLinks = container.querySelectorAll('a.node-link, a[ta-value], a[data-id], li[role="treeitem"] a, li[aria-expanded] a');
  console.log(`✅ ${allLinks.length} liens trouvés`);
  
  if (allLinks.length === 0) {
    alert('❌ Aucun lien trouvé! Vérifiez que les nœuds sont ouverts.');
    console.error('❌ Aucun lien trouvé!');
    return;
  }

  console.log('📋 Étape 3: Extraction des catégories...');
  
  const categories = [];
  const processedIds = new Set();
  
  allLinks.forEach((link, index) => {
    const name = link.textContent.trim();
    if (!name) return;
    
    let id = link.getAttribute('ta-value') || link.getAttribute('data-id');
    if (!id) {
      const parent = link.closest('[role="treeitem"], li[aria-expanded]');
      if (parent) {
        id = parent.getAttribute('data-id') || parent.getAttribute('ta-value');
      }
    }
    
    if (id && processedIds.has(id)) return;
    if (id) processedIds.add(id);
    
    // Calculer le niveau
    let level = 1;
    let current = link;
    while (current && current !== container) {
      if (current.parentElement && current.parentElement.tagName === 'UL') {
        level++;
      }
      current = current.parentElement;
    }
    
    // Trouver le parent
    let parentName = null;
    let parentId = null;
    const parentLi = link.closest('li[role="treeitem"], li[aria-expanded]');
    if (parentLi) {
      let current = parentLi.parentElement;
      while (current && current !== container) {
        if (current.tagName === 'UL') {
          const grandParentLi = current.closest('li[role="treeitem"], li[aria-expanded]');
          if (grandParentLi && grandParentLi !== parentLi) {
            const parentLink = grandParentLi.querySelector('a.node-link, a[ta-value], a[data-id]');
            if (parentLink) {
              parentName = parentLink.textContent.trim();
              parentId = parentLink.getAttribute('ta-value') || parentLink.getAttribute('data-id');
              break;
            }
          }
        }
        current = current.parentElement;
      }
    }
    
    categories.push({
      name: name,
      id: id || null,
      level: level,
      parent: parentName,
      parentId: parentId
    });
    
    if ((index + 1) % 100 === 0) {
      console.log(`   ${index + 1}/${allLinks.length} traitées...`);
    }
  });

  console.log(`✅ ${categories.length} catégories extraites`);
  console.log('📋 Étape 4: Construction de la hiérarchie...');
  
  // Construire la hiérarchie
  const hierarchy = {};
  const nodeMapById = new Map();
  const nodeMapByName = new Map();

  categories.forEach(cat => {
    const node = {
      categoryId: cat.id ? parseInt(cat.id) : null,
      categoryName: cat.name,
      level: cat.level,
      children: {},
    };
    
    if (cat.id) nodeMapById.set(cat.id, node);
    nodeMapByName.set(cat.name, node);
  });

  categories.forEach(cat => {
    const node = cat.id ? nodeMapById.get(cat.id) : nodeMapByName.get(cat.name);
    if (!node) return;
    
    if (!cat.parentId && !cat.parent) {
      hierarchy[cat.name] = node;
    } else {
      let parent = null;
      if (cat.parentId) parent = nodeMapById.get(cat.parentId);
      if (!parent && cat.parent) parent = nodeMapByName.get(cat.parent);
      
      if (parent) {
        parent.children[cat.name] = node;
      } else {
        hierarchy[cat.name] = node;
      }
    }
  });

  // Statistiques
  const byLevel = {};
  categories.forEach(cat => {
    byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
  });

  console.log('📊 Statistiques:');
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`   Niveau ${level}: ${byLevel[level]} catégories`);
  });

  const output = {
    flat: categories,
    hierarchy: hierarchy,
    stats: {
      total: categories.length,
      byLevel: byLevel,
    },
  };

  const dataStr = JSON.stringify(output, null, 2);
  window.tecdocCategories = output;
  window.tecdocCategoriesJSON = dataStr;

  console.log('✅ Données prêtes!');
  console.log('💾 window.tecdocCategories disponible');
  console.log('📋 window.tecdocCategoriesJSON disponible');
  
  // Téléchargement
  try {
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tecdoc-categories-${new Date().toISOString().split('T')[0]}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
    console.log('✅ Téléchargement déclenché!');
  } catch (e) {
    console.error('Erreur téléchargement:', e);
  }

  // Bouton de téléchargement
  const btn = document.createElement('a');
  btn.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  btn.download = `tecdoc-categories-${new Date().toISOString().split('T')[0]}.json`;
  btn.textContent = '📥 Télécharger JSON';
  btn.style.cssText = 'position:fixed;top:10px;right:10px;padding:12px 24px;background:#007bff;color:white;text-decoration:none;border-radius:5px;z-index:99999;';
  document.body.appendChild(btn);

  console.log('✅ Script terminé!');
  alert(`✅ ${categories.length} catégories extraites! Fichier téléchargé automatiquement.`);
})();



























