// Script simple pour ouvrir TOUS les onglets de la page TecDoc d'un coup
// Copiez-collez ce script dans la console du navigateur (F12)

(async function() {
  console.log('🚀 Ouverture de tous les nœuds TecDoc...\n');
  
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
    
    console.error('⏹️⏹️⏹️ ARRÊT FORCÉ PAR L\'UTILISATEUR ⏹️⏹️⏹️');
  };
  
  // Rendre le bouton toujours cliquable
  stopButton.style.pointerEvents = 'auto';
  stopButton.style.userSelect = 'none';
  
  document.body.appendChild(stopButton);
  console.log('💡 Bouton d\'arrêt créé en haut à gauche de la page');
  console.log('💡 Cliquez dessus pour FORCER l\'arrêt immédiat\n');
  
  const container = document.querySelector('div#pn_id_848_content') || 
                    document.querySelector('.p-tree') || 
                    document.querySelector('[role="tree"]') ||
                    document.querySelector('.p-tree-container');

  if (!container) {
    console.error('❌ Conteneur non trouvé!');
    stopButton.remove();
    return;
  }

  console.log('✅ Conteneur trouvé\n');
  
  // Flag global pour arrêter manuellement
  window.stopExpanding = false;
  
  let totalOpened = 0;
  let iterations = 0;
  const maxIterations = 200; // Augmenté pour permettre plus d'itérations
  let consecutiveEmptyChecks = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Vérifier le flag d'arrêt manuel (vérification prioritaire)
    if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
      console.log('⏹️ Arrêt FORCÉ demandé\n');
      break;
    }
    
    // Trouver TOUS les togglers fermés d'un coup (chercher plus largement)
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
    
    if (allTogglers.length === 0 && remaining.length === 0) {
      consecutiveEmptyChecks++;
      if (consecutiveEmptyChecks >= 5) {
        // Après 5 vérifications consécutives sans rien trouver, on s'arrête vraiment
        console.log(`✅ Tous les nœuds sont ouverts! (${totalOpened} nœuds ouverts en ${iterations} itérations)\n`);
        break;
      }
      // Attendre un peu pour que de nouveaux nœuds apparaissent
      await new Promise(resolve => setTimeout(resolve, 300));
      continue;
    }
    
    // Réinitialiser le compteur si on trouve quelque chose
    consecutiveEmptyChecks = 0;
    
    if (allTogglers.length === 0 && remaining.length > 0) {
      // Si on trouve des éléments fermés mais pas de togglers, chercher plus profondément
      if (iterations % 10 === 0) {
        console.log(`   🔍 ${remaining.length} éléments fermés trouvés, recherche des togglers...`);
      }
      
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
        if (!toggler && item.children) {
          // Chercher dans les enfants directs
          for (let i = 0; i < item.children.length; i++) {
            const child = item.children[i];
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
        consecutiveEmptyChecks++;
        if (consecutiveEmptyChecks >= 10) {
          console.log(`⚠️  Impossible de trouver les togglers pour ${remaining.length} éléments fermés`);
          break;
        }
      } else {
        consecutiveEmptyChecks = 0;
      }
      
      // Attendre plus longtemps pour que le DOM se mette à jour
      await new Promise(resolve => setTimeout(resolve, 400));
      continue;
    }
    
    // Cliquer sur TOUS les togglers en même temps
    // Mais vérifier le flag pendant le clic
    for (const toggler of allTogglers) {
      // Vérifier le flag avant chaque clic
      if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
        console.log('⏹️  Arrêt FORCÉ pendant le clic\n');
        break;
      }
      try {
        toggler.click();
        totalOpened++;
      } catch (e) {}
    }
    
    // Si arrêt demandé, sortir immédiatement
    if (window.FORCE_STOP_SCRAPING || window.stopExpanding) {
      break;
    }
    
    console.log(`   Itération ${iterations}: ${allTogglers.length} nœuds ouverts (total: ${totalOpened})`);
    
    // Attendre un peu pour que le DOM se mette à jour (plus longtemps pour les niveaux profonds)
    // Mais vérifier le flag pendant l'attente
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
  
  // Vérification finale
  const finalCollapsed = container.querySelectorAll('[role="treeitem"][aria-expanded="false"]').length;
  const finalExpanded = container.querySelectorAll('[role="treeitem"][aria-expanded="true"]').length;
  
  console.log('\n📊 Résultat final:');
  console.log(`   ✅ ${finalExpanded} nœuds ouverts`);
  if (finalCollapsed > 0) {
    console.log(`   ⚠️  ${finalCollapsed} nœuds restent fermés`);
  } else {
    console.log(`   🎉 Tous les nœuds sont ouverts!`);
  }
  
  // Modifier le bouton d'arrêt pour indiquer que c'est terminé
  if (stopButton && stopButton.parentNode) {
    stopButton.textContent = '✅ Terminé';
    stopButton.style.background = '#28a745';
    stopButton.onclick = function() {
      this.remove();
    };
  }
  
  console.log('\n💡 Vous pouvez maintenant lancer le script de scraping complet.\n');
})();

