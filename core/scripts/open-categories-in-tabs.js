// Script pour visiter les catégories de niveau 3, 4, 5 (navigation directe puis retour)
// Le script navigue sur chaque page puis revient automatiquement en arrière
// Copiez-collez ce script dans la console du navigateur (F12)

(async function() {
  console.log('🚀 Script d\'ouverture des catégories dans de nouveaux onglets...\n');

  // Créer un bouton d'arrêt
  const stopButton = document.createElement('button');
  stopButton.textContent = '⏹️ ARRÊTER';
  stopButton.style.cssText = 'position: fixed; top: 10px; left: 10px; padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 5px; z-index: 99999; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
  window.STOP_OPENING_TABS = false;
  stopButton.onclick = function() {
    window.STOP_OPENING_TABS = true;
    this.textContent = '⏹️ Arrêt demandé...';
    this.style.background = '#6c757d';
    console.log('⏹️ Arrêt demandé');
  };
  document.body.appendChild(stopButton);
  console.log('💡 Bouton d\'arrêt créé en haut à gauche\n');

  // Trouver le conteneur
  const container = document.querySelector('div#pn_id_848_content') || 
                    document.querySelector('.p-tree') || 
                    document.querySelector('[role="tree"]') ||
                    document.querySelector('.p-tree-container');

  if (!container) {
    console.error('❌ Conteneur non trouvé!');
    return;
  }

  console.log('✅ Conteneur trouvé\n');

  // Fonction pour calculer le niveau d'un élément
  function calculateLevel(element, container) {
    let level = 1;
    let current = element;
    while (current && current !== container) {
      const parent = current.parentElement;
      if (parent && parent.tagName === 'UL') {
        level++;
      }
      current = parent;
    }
    return level;
  }

  // Trouver tous les liens
  console.log('🔍 Recherche des liens de niveau 3, 4, 5...');
  const allLinks = container.querySelectorAll('a.node-link, a[ta-value], a[data-id], li[role="treeitem"] a, li[aria-expanded] a');
  
  const linksToOpen = [];
  const processedIds = new Set();

  allLinks.forEach(link => {
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

    const level = calculateLevel(link, container);
    
    // Filtrer les niveaux 3, 4, 5
    if (level >= 3 && level <= 5) {
      // Ajouter le lien même sans href (PWA utilise des clics JavaScript)
      linksToOpen.push({
        name: name,
        id: id,
        level: level,
        href: link.getAttribute('href') || null,
        element: link
      });
    }
  });

  console.log(`✅ ${linksToOpen.length} catégories de niveau 3-5 trouvées\n`);

  if (linksToOpen.length === 0) {
    console.error('❌ Aucune catégorie de niveau 3-5 trouvée!');
    return;
  }

  // Statistiques par niveau
  const byLevel = {};
  linksToOpen.forEach(link => {
    byLevel[link.level] = (byLevel[link.level] || 0) + 1;
  });
  console.log('📊 Répartition:');
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`   Niveau ${level}: ${byLevel[level]} catégories`);
  });
  console.log('');

  // Demander confirmation
  const confirmMsg = `Voulez-vous visiter ${linksToOpen.length} catégories?\n\n` +
                     `Niveau 3: ${byLevel[3] || 0}\n` +
                     `Niveau 4: ${byLevel[4] || 0}\n` +
                     `Niveau 5: ${byLevel[5] || 0}\n\n` +
                     `⚠️ Le script va naviguer sur chaque page puis revenir automatiquement.`;
  
  if (!confirm(confirmMsg)) {
    console.log('❌ Annulé par l\'utilisateur');
    stopButton.remove();
    return;
  }

  // Stocker l'URL de départ pour pouvoir y revenir
  const startUrl = window.location.href;
  console.log('📍 URL de départ sauvegardée:', startUrl);
  console.log('');

  // Naviguer sur chaque catégorie puis revenir
  console.log('📂 Navigation sur les catégories...\n');
  console.log('💡 Cliquez sur le bouton rouge pour arrêter\n');
  console.log('⏱️  Temps estimé: ~' + Math.round(linksToOpen.length * 4 / 60) + ' minutes\n');

  let visited = 0;
  let failed = 0;
  const pageLoadDelay = 3000; // 3 secondes pour charger chaque page
  const returnDelay = 1000; // 1 seconde pour revenir

  for (let i = 0; i < linksToOpen.length; i++) {
    if (window.STOP_OPENING_TABS) {
      console.log(`\n⏹️ Arrêt demandé après ${visited} catégories visitées`);
      // Revenir à l'URL de départ si on s'arrête et qu'on n'est pas déjà dessus
      const currentUrl = window.location.href;
      if (currentUrl !== startUrl) {
        try {
          window.history.back();
          await new Promise(resolve => setTimeout(resolve, returnDelay));
        } catch (e) {
          // Si history.back() ne fonctionne pas, essayer de naviguer directement
          try {
            window.location.href = startUrl;
          } catch (e2) {}
        }
      }
      break;
    }

    const link = linksToOpen[i];
    
    // Stocker l'URL avant de cliquer
    const urlBeforeClick = window.location.href;
    
    // Afficher la progression
    if (i % 10 === 0 || i < 10) {
      console.log(`   [${i + 1}/${linksToOpen.length}] ${link.name} (niveau ${link.level})...`);
      if (i < 3) {
        console.log(`      URL avant: ${urlBeforeClick.substring(0, 100)}...`);
      }
    }

    try {
      
      // Cliquer sur le lien pour naviguer
      let element = link.element;
      
      // Vérifier que l'élément existe et est toujours dans le DOM
      if (!element || !element.parentNode) {
        // Essayer de retrouver l'élément par son ID ou son texte
        const name = link.name;
        const id = link.id;
        
        // Chercher à nouveau l'élément dans le DOM
        let foundElement = null;
        if (id) {
          foundElement = container.querySelector(`a[ta-value="${id}"], a[data-id="${id}"]`);
        }
        if (!foundElement && name) {
          // Chercher par texte
          const allLinks = container.querySelectorAll('a.node-link, a[ta-value], a[data-id]');
          for (const l of allLinks) {
            if (l.textContent.trim() === name) {
              foundElement = l;
              break;
            }
          }
        }
        
        if (!foundElement) {
          throw new Error('Élément non trouvé dans le DOM');
        }
        element = foundElement;
        // Mettre à jour l'élément dans la liste
        link.element = foundElement;
      }
      
      // S'assurer que l'élément est visible (scroller vers lui)
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        // Ignorer les erreurs de scroll
      }
      
      // Essayer plusieurs méthodes pour cliquer
      let clickSuccess = false;
      
      // Méthode 1: click() direct
      if (typeof element.click === 'function') {
        try {
          element.click();
          clickSuccess = true;
          if (i < 5) {
            console.log(`   ✓ Clic direct réussi`);
          }
        } catch (e) {
          if (i < 5) {
            console.warn(`   ⚠️  Clic direct échoué: ${e.message}`);
          }
        }
      }
      
      // Méthode 2: dispatchEvent avec MouseEvent complet
      if (!clickSuccess && element.dispatchEvent) {
        try {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            buttons: 1
          });
          element.dispatchEvent(clickEvent);
          clickSuccess = true;
          if (i < 5) {
            console.log(`   ✓ dispatchEvent réussi`);
          }
        } catch (e) {
          if (i < 5) {
            console.warn(`   ⚠️  dispatchEvent échoué: ${e.message}`);
          }
        }
      }
      
      // Méthode 3: Trouver un parent cliquable
      if (!clickSuccess) {
        const clickableParent = element.closest('a, button, [role="button"], [onclick], li[role="treeitem"]');
        if (clickableParent) {
          try {
            if (typeof clickableParent.click === 'function') {
              clickableParent.click();
              clickSuccess = true;
              if (i < 5) {
                console.log(`   ✓ Clic sur parent réussi`);
              }
            } else if (clickableParent.dispatchEvent) {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1
              });
              clickableParent.dispatchEvent(clickEvent);
              clickSuccess = true;
              if (i < 5) {
                console.log(`   ✓ dispatchEvent sur parent réussi`);
              }
            }
          } catch (e) {
            if (i < 5) {
              console.warn(`   ⚠️  Clic sur parent échoué: ${e.message}`);
            }
          }
        }
      }
      
      if (!clickSuccess) {
        throw new Error('Aucune méthode de clic n\'a fonctionné');
      }
      
      // Attendre un peu après le clic pour que la navigation commence
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Attendre que la page se charge (vérifier périodiquement)
      let urlAfterClick = window.location.href;
      let hasNavigated = false;
      let isCatalogNotFound = false;
      
      // Vérifier rapidement si on a navigué (vérification toutes les 500ms)
      for (let check = 0; check < Math.ceil(pageLoadDelay / 500); check++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        urlAfterClick = window.location.href;
        hasNavigated = urlAfterClick !== urlBeforeClick;
        
        if (i < 3 && check === 0) {
          console.log(`      URL après clic (check ${check + 1}): ${urlAfterClick.substring(0, 100)}...`);
          console.log(`      Navigation détectée: ${hasNavigated}`);
        }
        
        // Détecter si on est sur la page "catalog-not-found"
        const currentUrl = window.location.href;
        const pageTitle = document.title.toLowerCase();
        const pageText = document.body ? document.body.textContent.toLowerCase() : '';
        
        if (currentUrl.includes('catalog-not-found') || 
            currentUrl.includes('/catalog-not-found') ||
            pageTitle.includes('not found') ||
            pageTitle.includes('catalog not found') ||
            pageText.includes('catalog-not-found') ||
            pageText.includes('catalogue non trouvé')) {
          isCatalogNotFound = true;
          console.warn(`   ⚠️  Page "catalog-not-found" détectée, retour immédiat...`);
          break;
        }
        
        // Si on a navigué et que ce n'est pas catalog-not-found, on peut continuer
        if (hasNavigated && !isCatalogNotFound) {
          break;
        }
      }
      
      if (hasNavigated || isCatalogNotFound) {
        // Revenir en arrière si on a navigué OU si on est sur catalog-not-found
        window.history.back();
        
        // Attendre que la page revienne
        await new Promise(resolve => setTimeout(resolve, returnDelay));
        
        // Vérifier qu'on est bien revenu
        const urlAfterBack = window.location.href;
        if (urlAfterBack !== startUrl && urlAfterBack !== urlBeforeClick) {
          // Si on n'est pas revenu à la bonne page, essayer de naviguer directement
          console.warn(`   ⚠️  Problème de navigation, retour à l'URL de départ...`);
          window.location.href = startUrl;
          await new Promise(resolve => setTimeout(resolve, returnDelay));
        }
        
        if (isCatalogNotFound) {
          failed++;
          console.warn(`   ⚠️  Catégorie "${link.name}" → page non trouvée`);
        } else {
          visited++;
        }
      } else {
        console.warn(`   ⚠️  La navigation n'a pas changé l'URL, on continue...`);
        // Ne pas compter comme visité si la navigation n'a pas fonctionné
      }
      
    } catch (e) {
      failed++;
      console.error(`   [${i + 1}/${linksToOpen.length}] ${link.name} - ❌ Erreur: ${e.message}`);
      // Essayer de revenir à l'URL de départ en cas d'erreur
      const currentUrl = window.location.href;
      if (currentUrl !== startUrl) {
        try {
          window.history.back();
          await new Promise(resolve => setTimeout(resolve, returnDelay));
        } catch (e2) {
          // Si history.back() ne fonctionne pas, essayer de naviguer directement
          try {
            window.location.href = startUrl;
            await new Promise(resolve => setTimeout(resolve, returnDelay));
          } catch (e3) {
            console.error('   ❌ Impossible de revenir en arrière');
          }
        }
      }
    }
  }

  // Résumé
  console.log('\n📊 Résumé:');
  console.log(`   ✅ ${visited} catégories visitées`);
  if (failed > 0) {
    console.log(`   ❌ ${failed} échecs`);
  }
  console.log('');

  // Modifier le bouton
  stopButton.textContent = `✅ ${visited} visitées`;
  stopButton.style.background = '#28a745';
  stopButton.onclick = function() {
    this.remove();
  };

  console.log('✅ Script terminé!');
  alert(`✅ ${visited} catégories visitées!\n${failed > 0 ? `⚠️ ${failed} échecs` : ''}`);
})();

