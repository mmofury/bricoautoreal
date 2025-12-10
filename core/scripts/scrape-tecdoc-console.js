// Script à copier-coller dans la console du navigateur sur la page TecDoc
// Copiez tout le contenu ci-dessous et collez-le dans la console (F12)

(async function() {
  console.log('🚀 Scraping des catégories TecDoc...\n');

  // Créer un bouton d'arrêt visible sur la page (FORCE l'arrêt)
  const stopButton = document.createElement('button');
  stopButton.textContent = '⏹️ ARRÊTER';
  stopButton.style.cssText = 'position: fixed; top: 10px; left: 10px; padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 5px; z-index: 99999; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
  
  // Variable globale pour forcer l'arrêt
  window.FORCE_STOP_SCRAPING = false;
  
  stopButton.onclick = function() {
    // Forcer l'arrêt de toutes les façons possibles
    window.stopExpanding = true;
    window.FORCE_STOP_SCRAPING = true;
    
    // Arrêter tous les timeouts/intervals en cours
    for (let i = 1; i < 99999; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    
    this.textContent = '⏹️ ARRÊT FORCÉ';
    this.style.background = '#6c757d';
    this.style.fontSize = '16px';
    
    // Lancer une exception pour forcer l'arrêt si nécessaire
    setTimeout(() => {
      console.error('⏹️⏹️⏹️ ARRÊT FORCÉ PAR L\'UTILISATEUR ⏹️⏹️⏹️');
      console.log('💡 Le script va maintenant passer directement au scraping des nœuds déjà ouverts...');
    }, 10);
  };
  
  // Rendre le bouton toujours cliquable (même pendant les clics)
  stopButton.style.pointerEvents = 'auto';
  stopButton.style.userSelect = 'none';
  
  document.body.appendChild(stopButton);
  console.log('💡 Bouton d\'arrêt créé en haut à gauche de la page');
  console.log('💡 Cliquez dessus pour FORCER l\'arrêt immédiat\n');

  // Fonction pour ouvrir tous les nœuds (version rapide)
  async function expandAllNodes(container, stopBtn) {
    console.log('📂 Ouverture de tous les nœuds...');
    console.log('💡 Pour arrêter: cliquez sur le bouton rouge ou tapez: window.stopExpanding = true\n');
    
    // Flag global pour arrêter manuellement
    window.stopExpanding = false;
    
    let totalOpened = 0;
    let iterations = 0;
    const maxIterations = 200; // Augmenté pour permettre plus d'itérations
    const startTime = Date.now();
    let consecutiveEmptyChecks = 0;

    while (iterations < maxIterations) {
      iterations++;
      
      // Vérifier le flag d'arrêt manuel (vérification prioritaire)
      if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
        console.log('⏹️  Arrêt FORCÉ demandé\n');
        break;
      }
      
      // Trouver TOUS les togglers fermés d'un coup (méthode plus rapide)
      // Chercher de plusieurs façons pour être sûr de tout trouver
      const allTogglers = container.querySelectorAll(
        '.p-tree-toggler[aria-expanded="false"], ' +
        'button[aria-expanded="false"], ' +
        '[role="treeitem"][aria-expanded="false"] .p-tree-toggler, ' +
        '[role="treeitem"][aria-expanded="false"] button, ' +
        'li[aria-expanded="false"] .p-tree-toggler, ' +
        'li[aria-expanded="false"] button'
      );
      
      // Vérifier s'il reste des éléments fermés (chercher plus largement)
      const remaining = container.querySelectorAll('[role="treeitem"][aria-expanded="false"], li[aria-expanded="false"]');
      
      // Si plus rien à ouvrir, vérifier plusieurs fois avant de s'arrêter
      if (allTogglers.length === 0 && remaining.length === 0) {
        consecutiveEmptyChecks++;
        if (consecutiveEmptyChecks >= 5) {
          // Après 5 vérifications consécutives sans rien trouver, on s'arrête vraiment
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`✅ Tous les nœuds sont ouverts! (${totalOpened} nœuds en ${elapsed}s)\n`);
          break;
        }
        // Attendre un peu pour que de nouveaux nœuds apparaissent
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }
      
      // Réinitialiser le compteur si on trouve quelque chose
      consecutiveEmptyChecks = 0;
      
      // Si on trouve des éléments fermés mais pas de togglers, chercher plus profondément
      if (allTogglers.length === 0 && remaining.length > 0) {
        if (iterations % 10 === 0) {
          console.log(`   🔍 ${remaining.length} éléments fermés trouvés, recherche des togglers...`);
        }
        
        // Chercher les togglers dans chaque élément fermé (plus agressif)
        let clicked = false;
        for (const item of remaining) {
          // Vérifier le flag avant chaque clic
          if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
            break;
          }
          
          // Chercher le toggler de différentes manières
          let toggler = item.querySelector('.p-tree-toggler');
          if (!toggler) {
            toggler = item.querySelector('button');
          }
          if (!toggler) {
            toggler = item.querySelector('[class*="toggler"]');
          }
          if (!toggler) {
            // Chercher dans les enfants directs
            const children = item.children;
            for (let i = 0; i < children.length; i++) {
              const child = children[i];
              if (child.classList && (child.classList.contains('p-tree-toggler') || child.tagName === 'BUTTON')) {
                toggler = child;
                break;
              }
            }
          }
          
          if (toggler) {
            try {
              toggler.click();
              totalOpened++;
              clicked = true;
            } catch (e) {
              // Essayer avec dispatchEvent si click() ne fonctionne pas
              try {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                toggler.dispatchEvent(event);
                totalOpened++;
                clicked = true;
              } catch (e2) {}
            }
          }
        }
        
        // Si arrêt demandé, sortir
        if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
          break;
        }
        
        if (!clicked) {
          // Si on n'a rien cliqué, attendre un peu plus longtemps
          consecutiveEmptyChecks++;
          if (consecutiveEmptyChecks >= 10) {
            // Après 10 tentatives sans succès, on s'arrête
            console.log(`⚠️  Impossible de trouver les togglers pour ${remaining.length} éléments fermés après ${consecutiveEmptyChecks} tentatives`);
            break;
          }
        } else {
          consecutiveEmptyChecks = 0;
        }
        
        // Attendre que le DOM se mette à jour (plus longtemps pour les niveaux profonds)
        await new Promise(resolve => setTimeout(resolve, 400));
        continue;
      }
      
      // Vérifier à nouveau le flag d'arrêt avant de cliquer
      if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
        console.log('⏹️  Arrêt FORCÉ - arrêt immédiat\n');
        break;
      }
      
      // Cliquer sur TOUS les togglers en même temps (beaucoup plus rapide!)
      // Mais vérifier le flag pendant le clic
      let clickedCount = 0;
      for (const toggler of allTogglers) {
        // Vérifier le flag avant chaque clic
        if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
          console.log('⏹️  Arrêt FORCÉ pendant le clic\n');
          break;
        }
        try {
          toggler.click();
          totalOpened++;
          clickedCount++;
        } catch (e) {}
      }
      
      // Si arrêt demandé, sortir immédiatement
      if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
        break;
      }
      
      // Afficher la progression
      if (iterations % 3 === 0 || allTogglers.length < 20) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   ${totalOpened} nœuds ouverts, ${allTogglers.length} restants (${elapsed}s)`);
      }
      
      // Attendre un peu pour que le DOM se mette à jour (plus longtemps pour les niveaux profonds)
      // Mais vérifier le flag pendant l'attente aussi
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 350); // Augmenté pour laisser plus de temps aux nœuds de s'afficher
      });
      
      // Vérifier une dernière fois avant de continuer
      if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
        console.log('⏹️  Arrêt FORCÉ\n');
        break;
      }
    }

    // Attendre un peu plus pour que tout soit bien chargé (sauf si arrêté)
    if (!window.FORCE_STOP_SCRAPING && !window.stopExpanding) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const finalCollapsed = container.querySelectorAll('[role="treeitem"][aria-expanded="false"]').length;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
      console.log(`⏹️  Ouverture arrêtée par l'utilisateur (${totalOpened} nœuds ouverts en ${elapsed}s)`);
      console.log('📋 Continuation avec le scraping des nœuds déjà ouverts...\n');
    } else if (finalCollapsed > 0) {
      console.log(`⚠️  ${finalCollapsed} nœuds restent fermés après ${elapsed}s`);
    } else {
      console.log(`✅ ${totalOpened} nœuds ouverts en ${elapsed}s\n`);
    }
    
    // Réinitialiser les flags pour permettre la suite
    window.stopExpanding = false;
    window.FORCE_STOP_SCRAPING = false;
    
    // Modifier le bouton d'arrêt pour indiquer que l'ouverture est terminée
    if (stopBtn && stopBtn.parentNode) {
      stopBtn.textContent = '✅ Ouverture terminée';
      stopBtn.style.background = '#28a745';
      stopBtn.onclick = function() {
        this.remove();
      };
    }
    
    return totalOpened;
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

  console.log('✅ Conteneur trouvé');

  try {
    // Ouvrir tous les nœuds d'abord
    console.log('📂 Étape 1: Ouverture des nœuds...');
    await expandAllNodes(container, stopButton);
    console.log('✅ Étape 1 terminée\n');

    // Attendre un peu plus pour que tout soit bien rendu
    console.log('⏳ Étape 2: Attente du rendu complet...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Étape 2 terminée\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ouverture des nœuds:', error);
    console.log('⚠️  Continuons quand même avec l\'extraction...\n');
  }

  try {
    // Extraire TOUS les liens maintenant que tout est ouvert
    console.log('🔍 Étape 3: Recherche des liens...');
    
    // Chercher de plusieurs manières pour être sûr
    let allLinks = container.querySelectorAll('a.node-link');
    console.log(`   ${allLinks.length} liens trouvés avec .node-link`);
    
    // Aussi chercher par attribut ta-value ou data-id
    const linksByAttr = container.querySelectorAll('a[ta-value], a[data-id]');
    console.log(`   ${linksByAttr.length} liens trouvés avec attributs ta-value/data-id`);
    
    // Chercher aussi tous les liens dans les treeitems
    const linksInTree = container.querySelectorAll('li[role="treeitem"] a');
    console.log(`   ${linksInTree.length} liens trouvés dans les treeitems`);
    
    // Combiner et dédupliquer
    const linkSet = new Set();
    allLinks.forEach(link => linkSet.add(link));
    linksByAttr.forEach(link => linkSet.add(link));
    linksInTree.forEach(link => linkSet.add(link));
    
    allLinks = Array.from(linkSet);
    
    console.log(`✅ Étape 3 terminée: ${allLinks.length} liens uniques trouvés\n`);
    
    // Vérifier s'il reste des nœuds fermés
    const remainingCollapsed = container.querySelectorAll('[role="treeitem"][aria-expanded="false"]').length;
    if (remainingCollapsed > 0) {
      console.warn(`⚠️  ${remainingCollapsed} nœuds restent fermés. Certaines catégories peuvent manquer.\n`);
    }

    if (allLinks.length === 0) {
      console.error('❌ Aucun lien trouvé!');
      console.log('💡 Essayez de vérifier que les nœuds sont bien ouverts.');
      return;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la recherche des liens:', error);
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
    const parentLi = link.closest('li[role="treeitem"]');
    if (!parentLi) return null;

    // Remonter pour trouver le li parent (pas le li lui-même)
    let current = parentLi.parentElement;
    while (current && current !== container) {
      if (current.tagName === 'UL') {
        const grandParentLi = current.closest('li[role="treeitem"]');
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
  const processedIds = new Set(); // Pour éviter les doublons
  
  try {
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
          const parent = link.closest('[role="treeitem"]');
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

    console.log(`✅ Étape 4 terminée: ${categories.length} catégories extraites\n`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction:', error);
    throw error;
  }

  // Construire la hiérarchie
  console.log('🌲 Étape 5: Construction de la hiérarchie...');
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
    console.log('✅ Étape 5 terminée\n');

    // Statistiques
    console.log('📊 Étape 6: Calcul des statistiques...');
    categories.forEach(cat => {
      byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
    });

    console.log('📊 Statistiques:');
    Object.keys(byLevel).sort().forEach(level => {
      console.log(`   Niveau ${level}: ${byLevel[level]} catégories`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Erreur lors de la construction de la hiérarchie:', error);
    console.log('⚠️  Continuons quand même...\n');
  }

  // Aperçu
  console.log('📋 Étape 7: Aperçu des catégories...');
  categories.slice(0, 10).forEach(cat => {
    const indent = '  '.repeat(cat.level - 1);
    console.log(`${indent}${cat.level === 1 ? '🌲' : '└─'} ${cat.name} (ID: ${cat.id || 'N/A'})`);
  });
  console.log('');

  // Préparer le JSON
  console.log('💾 Étape 8: Préparation du JSON...');
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

  console.log('✅ Étape 8 terminée');
  console.log('💾 Données disponibles dans: window.tecdocCategories');
  console.log('📋 JSON disponible dans: window.tecdocCategoriesJSON\n');

  // Méthode 1: Téléchargement automatique (plus fiable)
  console.log('📥 Étape 9: Téléchargement automatique...');
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
  console.log('🔘 Étape 10: Création des boutons de téléchargement...');
  try {
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
    console.log('✅ Bouton de téléchargement créé');
    
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
      console.log('✅ Bouton de copie créé');
    }
  } catch (e) {
    console.warn('⚠️  Erreur lors de la création des boutons:', e.message);
  }

  console.log('\n💡 Options de téléchargement:');
  console.log('   1. Bouton bleu en haut à droite (téléchargement)');
  if (navigator.clipboard) {
    console.log('   2. Bouton vert (copie dans le presse-papiers)');
  }
  console.log('   3. Tapez: copy(JSON.stringify(window.tecdocCategories, null, 2))');
  console.log('   4. Ou utilisez: window.tecdocCategoriesJSON');
  console.log('\n✅ Script terminé avec succès!\n');

  return output;
})().catch(error => {
  console.error('❌ Erreur fatale dans le script:', error);
  console.error(error.stack);
});
