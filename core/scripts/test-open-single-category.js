// Script de TEST pour ouvrir une seule catégorie dans un nouvel onglet
// Test avec "Accessoires pour vélos"
// Copiez-collez ce script dans la console (F12)

(async function() {
  console.log('🧪 Test: Ouverture de "Accessoires pour vélos" dans un nouvel onglet...\n');

  // Trouver le conteneur
  const container = document.querySelector('div#pn_id_848_content') || 
                    document.querySelector('.p-tree') || 
                    document.querySelector('[role="tree"]') ||
                    document.querySelector('.p-tree-container');

  if (!container) {
    console.error('❌ Conteneur non trouvé!');
    return;
  }

  // Fonction pour calculer le niveau
  function calculateLevel(element, container) {
    let level = 1;
    let current = element;
    while (current && current !== container) {
      if (current.parentElement && current.parentElement.tagName === 'UL') {
        level++;
      }
      current = current.parentElement;
    }
    return level;
  }

  // Trouver le lien "Accessoires pour vélos"
  const allLinks = container.querySelectorAll('a.node-link, a[ta-value], a[data-id], li[role="treeitem"] a, li[aria-expanded] a');

  let targetLink = null;
  let targetLevel = null;

  allLinks.forEach(link => {
    const name = link.textContent.trim();
    if (name === 'Accessoires pour vélos' || name.includes('Accessoires pour vélos')) {
      targetLink = link;
      targetLevel = calculateLevel(link, container);
      return;
    }
  });

  if (!targetLink) {
    console.error('❌ Lien "Accessoires pour vélos" non trouvé!');
    console.log('💡 Vérifiez que la catégorie est visible sur la page.');
    return;
  }

  console.log(`✅ Lien trouvé: "${targetLink.textContent.trim()}"`);
  console.log(`   Niveau: ${targetLevel}`);
  console.log(`   ID: ${targetLink.getAttribute('ta-value') || targetLink.getAttribute('data-id') || 'N/A'}`);

  // Obtenir l'URL ou construire à partir des attributs
  let href = targetLink.getAttribute('href');
  let categoryId = targetLink.getAttribute('ta-value') || targetLink.getAttribute('data-id');
  
  // Si pas d'href, construire l'URL à partir de l'ID de catégorie
  if (!href && categoryId) {
    // Essayer de construire l'URL basée sur la structure de la PWA
    // Généralement: /category/{id} ou /categories/{id} ou similaire
    const currentPath = window.location.pathname;
    const baseUrl = window.location.origin;
    
    // Essayer plusieurs formats d'URL possibles
    const possibleUrls = [
      `${baseUrl}/category/${categoryId}`,
      `${baseUrl}/categories/${categoryId}`,
      `${baseUrl}/categorie/${categoryId}`,
      `${baseUrl}/cat/${categoryId}`,
      `${baseUrl}/?category=${categoryId}`,
      `${baseUrl}/?id=${categoryId}`,
    ];
    
    console.log('💡 Pas d\'href trouvé, construction de l\'URL à partir de l\'ID...');
    console.log(`   ID de catégorie: ${categoryId}`);
    console.log(`   URLs possibles à essayer: ${possibleUrls.length}`);
    
    // Cliquer normalement sur le lien (navigation directe, pas nouvel onglet)
    console.log('\n📂 Navigation vers la catégorie...');
    try {
      // Cliquer normalement (sans Ctrl/Cmd)
      targetLink.click();
      console.log('✅ Clic effectué, navigation en cours...');
      
      // Attendre que la page se charge
      console.log('⏳ Attente du chargement de la page (3 secondes)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Revenir en arrière
      console.log('🔙 Retour en arrière...');
      window.history.back();
      
      // Attendre un peu pour que la page revienne
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Retour effectué!');
      
    } catch (e) {
      console.error('❌ Erreur:', e.message);
      // Essayer de revenir en arrière même en cas d'erreur
      try {
        window.history.back();
      } catch (e2) {
        console.error('❌ Impossible de revenir en arrière');
      }
    }
    
    return;
  }
  
  // Si on a un href, naviguer directement puis revenir
  if (href) {
    // Construire l'URL complète
    function getFullUrl(href) {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      if (href.startsWith('//')) {
        return window.location.protocol + href;
      }
      if (href.startsWith('/')) {
        return window.location.origin + href;
      }
      return window.location.origin + '/' + href;
    }

    const fullUrl = getFullUrl(href);
    console.log(`   URL: ${fullUrl}\n`);

    // Naviguer directement (pas nouvel onglet)
    console.log('📂 Navigation vers la catégorie...');
    try {
      // Naviguer directement
      window.location.href = fullUrl;
      
      // Attendre que la page se charge
      console.log('⏳ Attente du chargement de la page (3 secondes)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Revenir en arrière
      console.log('🔙 Retour en arrière...');
      window.history.back();
      
      // Attendre un peu pour que la page revienne
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Retour effectué!');
      
    } catch (e) {
      console.error('❌ Erreur:', e.message);
      // Essayer de revenir en arrière même en cas d'erreur
      try {
        window.history.back();
      } catch (e2) {
        console.error('❌ Impossible de revenir en arrière');
      }
    }
  }
})();
