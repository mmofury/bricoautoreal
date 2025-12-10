// Script Playwright pour visiter toutes les catégories TecDoc de niveau 3-5
// Installation: pnpm add playwright
// Lancement: pnpm tecdoc:visit-categories

// Utiliser playwright directement (installer avec: pnpm add playwright)
// Si playwright n'est pas installé, installer avec: pnpm add playwright
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

interface Category {
  name: string;
  id: string | null;
  level: number;
  element: any;
}

interface ProductGroup {
  id: string;
  name: string;
}

interface CategoryWithProducts {
  categoryId: string | null;
  categoryName: string;
  level: number;
  productGroups: ProductGroup[];
  url: string;
}

async function login(page: Page) {
  try {
    // Attendre que le formulaire de connexion soit chargé
    console.log('   ⏳ Attente du formulaire de connexion...');
    await page.waitForSelector('input#input28', { timeout: 15000 });
    
    // Étape 1: Remplir l'email
    console.log('   📧 Saisie de l\'email...');
    await page.fill('input#input28', 'm.autoshield@gmail.com');
    await page.waitForTimeout(500);
    
    // Étape 2: Cliquer sur le bouton après l'email (pour afficher le champ mot de passe)
    console.log('   🔘 Clic sur le bouton après l\'email...');
    await page.click('input.button');
    await page.waitForTimeout(1000);
    
    // Étape 3: Attendre que le champ mot de passe soit visible
    console.log('   ⏳ Attente du champ mot de passe...');
    await page.waitForSelector('input#input61', { timeout: 10000 });
    
    // Étape 4: Remplir le mot de passe
    console.log('   🔒 Saisie du mot de passe...');
    await page.fill('input#input61', 'Shield1st!');
    await page.waitForTimeout(500);
    
    // Étape 5: Cliquer sur le bouton de connexion final
    console.log('   🔘 Clic sur le bouton de connexion final...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
        // La navigation peut échouer si elle est déjà en cours
      }),
      page.click('input.button')
    ]);
    
    // Attendre un peu pour que la redirection se fasse
    await page.waitForTimeout(2000);
    
    // Vérifier si on est connecté (pas sur la page de login)
    const currentUrl = page.url();
    if (currentUrl.includes('login.tecalliance.net') || currentUrl.includes('/oauth2/')) {
      // Vérifier s'il y a un message d'erreur
      try {
        const errorElement = await page.locator('text=/erreur|error|invalid|incorrect/i').first();
        const errorMessage = await errorElement.textContent();
        if (errorMessage) {
          throw new Error(`La connexion a échoué: ${errorMessage}`);
        }
      } catch (e) {
        // Pas de message d'erreur trouvé
      }
      throw new Error('La connexion a échoué - toujours sur la page de login');
    }
    
    console.log('   ✅ Redirection réussie vers:', currentUrl.substring(0, 80) + '...');
  } catch (error) {
    console.error('   ❌ Erreur lors de la connexion:', error instanceof Error ? error.message : error);
    throw error;
  }
}

async function visitCategories() {
  console.log('🚀 Démarrage du script Playwright...\n');

  // Récupérer l'URL depuis les arguments de ligne de commande
  const customUrl = process.argv[2];
  const defaultUrl = 'https://web.tecalliance.net/tecdoc/fr/parts/universal/assemblies?expanded=705103,700292,705160,701230,701253,700202,701240,700200,701187,705856,700302,701287,700203,700294,704450,700305,703521,700286,705972,701236,701273,704170,704415,705705,700180,701941,700001,701304,703042,703012,706563,703524,700289,700283,700310,705095,700308,701281,700201,703527,700332';
  const startUrl = customUrl || defaultUrl;
  
  if (customUrl) {
    console.log(`📌 URL personnalisée fournie: ${customUrl.substring(0, 100)}...\n`);
  } else {
    console.log(`📌 Utilisation de l'URL par défaut (universelle)\n`);
  }

  // Lancer le navigateur
  const browser = await chromium.launch({
    headless: false, // Afficher le navigateur pour voir ce qui se passe
    slowMo: 100, // Ralentir un peu pour voir les actions
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    
    console.log('📂 Navigation vers la page de départ...');
    await page.goto(startUrl, { waitUntil: 'networkidle' });
    
    // Vérifier si on est redirigé vers la page de login
    const currentUrl = page.url();
    if (currentUrl.includes('login.tecalliance.net') || currentUrl.includes('/oauth2/')) {
      console.log('🔐 Page de connexion détectée, connexion en cours...');
      await login(page);
      console.log('✅ Connexion réussie\n');
      
      // Attendre un peu puis naviguer vers la page de départ
      await page.waitForTimeout(2000);
      await page.goto(startUrl, { waitUntil: 'networkidle' });
    }
    
    console.log('✅ Page chargée\n');

    // Cliquer sur le bouton avec l'icône ta-icon-align-right pour afficher le conteneur
    try {
      console.log('🔘 Recherche du bouton avec icône align-right...');
      const alignRightButton = page.locator('button:has(i.ta-icon-align-right), button.btn-white:has(i.ta-icon-align-right)');
      const buttonCount = await alignRightButton.count();
      
      if (buttonCount > 0) {
        console.log('   ✅ Bouton trouvé, clic en cours...');
        await alignRightButton.first().click({ timeout: 5000 });
        console.log('   ✅ Clic sur le bouton align-right effectué');
        await page.waitForTimeout(1000); // Attendre que le conteneur s'affiche
      } else {
        console.log('   ℹ️  Bouton align-right non trouvé, on continue...');
      }
    } catch (btnError) {
      console.warn(`   ⚠️  Erreur lors du clic sur le bouton align-right: ${btnError instanceof Error ? btnError.message : 'Erreur inconnue'}`);
      console.log('   ℹ️  On continue quand même...');
    }

    // Attendre que le conteneur soit visible
    console.log('⏳ Attente du chargement du conteneur...');
    await page.waitForSelector('div#pn_id_848_content, .p-tree, [role="tree"]', { timeout: 15000 });
    console.log('✅ Conteneur trouvé\n');

    // Ouvrir tous les nœuds
    console.log('📂 Ouverture de tous les nœuds...');
    await openAllNodes(page);
    console.log('✅ Tous les nœuds ouverts\n');

    // Extraire toutes les catégories de niveau 3-5
    console.log('🔍 Extraction des catégories de niveau 3-5...');
    const categories = await extractCategories(page);
    console.log(`✅ ${categories.length} catégories trouvées\n`);

    // Statistiques
    const categoryCountByLevel: Record<number, number> = {};
    categories.forEach(cat => {
      categoryCountByLevel[cat.level] = (categoryCountByLevel[cat.level] || 0) + 1;
    });
    console.log('📊 Répartition:');
    Object.keys(categoryCountByLevel).sort().forEach(level => {
      console.log(`   Niveau ${level}: ${categoryCountByLevel[parseInt(level)]} catégories`);
    });
    console.log('');

    // Option pour tester avec un nombre limité de catégories
    const TEST_MODE = false; // Mettre à false pour scraper toutes les catégories
    const TEST_CATEGORIES_COUNT = 10; // Nombre de catégories à tester en mode test
    const maxCategories = TEST_MODE ? Math.min(TEST_CATEGORIES_COUNT, categories.length) : categories.length;

    // Demander confirmation
    console.log(`\n⚠️  Vous allez visiter ${maxCategories} catégories${TEST_MODE ? ` (MODE TEST - ${TEST_CATEGORIES_COUNT} catégories)` : ` (TOUTES les ${categories.length} catégories)`}.`);
    console.log('Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler...');
    // En production, vous pouvez décommenter cette ligne pour une vraie confirmation
    // await new Promise(resolve => process.stdin.once('data', resolve));

    // Visiter chaque catégorie
    console.log('\n📂 Début de la visite des catégories...\n');
    
    // Structure pour sauvegarder les données
    const allData: CategoryWithProducts[] = [];
    
    let visited = 0;
    let failed = 0;
    let withProducts = 0;
    const pageLoadDelay = 1500; // Réduit de 3000 à 1500ms
    const returnDelay = 500; // Réduit de 1000 à 500ms
    const startTime = Date.now();

    for (let i = 0; i < maxCategories; i++) {
      const category = categories[i];
      
      // Afficher la progression avec statistiques
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const avgTimePerCategory = visited > 0 ? elapsed / visited : 0;
      const estimatedRemaining = Math.floor(avgTimePerCategory * (maxCategories - i));
      const progressPercent = Math.floor((i / maxCategories) * 100);
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   [${i + 1}/${maxCategories}] ${category.name} (niveau ${category.level})`);
      console.log(`   📊 Progression: ${progressPercent}% | ✅ ${visited} visitées | 📦 ${withProducts} avec produits | ❌ ${failed} échecs`);
      console.log(`   ⏱️  Temps écoulé: ${elapsed}s | Temps restant estimé: ${estimatedRemaining}s`);
      if (TEST_MODE && i === 0) {
        console.log(`   🧪 MODE TEST: ${maxCategories} catégories seront visitées`);
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      try {
        // Vérifier si on est toujours connecté (au cas où la session expire)
        const currentUrl = page.url();
        if (currentUrl.includes('login.tecalliance.net') || currentUrl.includes('/oauth2/')) {
          console.warn(`   ⚠️  Session expirée, reconnexion...`);
          await login(page);
          await page.waitForTimeout(2000);
          await page.goto(startUrl, { waitUntil: 'networkidle' });
          // Réouvrir les nœuds rapidement
          await openAllNodes(page);
          await page.waitForTimeout(1000);
        }
        
        // Stocker l'URL avant
        const urlBefore = page.url();

        try {
          console.log(`      🔍 Navigation vers: ${category.name}${category.id ? ` (ID: ${category.id})` : ''}`);
          
          // Construire l'URL directement à partir de l'ID de la catégorie
          let urlAfter: string;
          let hasNavigated = false;
          
          if (category.id) {
            // Construire l'URL de la page de catégorie
            // Format observé: /parts/cars/assigned?assemblyGroupId=100733&targetId=4151&typeNumber=4151
            const baseUrl = new URL(startUrl);
            const targetId = baseUrl.searchParams.get('targetId') || '';
            const typeNumber = baseUrl.searchParams.get('typeNumber') || '';
            
            // Construire la nouvelle URL
            const categoryUrl = `${baseUrl.origin}${baseUrl.pathname.replace('/assemblies', '/assigned')}?assemblyGroupId=${category.id}${targetId ? `&targetId=${targetId}` : ''}${typeNumber ? `&typeNumber=${typeNumber}` : ''}${baseUrl.hash}`;
            
            console.log(`      🌐 Navigation directe vers l'URL...`);
            await page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(pageLoadDelay);
            
            urlAfter = page.url();
            hasNavigated = true;
            console.log(`      📍 URL après: ${urlAfter.substring(0, 100)}...`);
            console.log(`      🔄 Navigation détectée: ${hasNavigated}`);
          } else {
            // Fallback: essayer de trouver et cliquer sur l'élément
            console.log(`      ⚠️  Pas d'ID disponible, tentative avec clic sur l'élément...`);
            const selector = `text="${category.name}"`;
            const element = page.locator(selector).first();
            const elementCount = await element.count();
            
            if (elementCount === 0) {
              throw new Error(`Élément non trouvé: ${category.name}`);
            }
            
            await element.scrollIntoViewIfNeeded();
            await element.click({ timeout: 5000 });
            await page.waitForTimeout(pageLoadDelay);
            
            urlAfter = page.url();
            hasNavigated = urlAfter !== urlBefore;
            console.log(`      📍 URL avant: ${urlBefore.substring(0, 100)}...`);
            console.log(`      📍 URL après: ${urlAfter.substring(0, 100)}...`);
            console.log(`      🔄 Navigation détectée: ${hasNavigated}`);
          }
          
          // Vérifier si on est redirigé vers la page de login
          if (urlAfter.includes('login.tecalliance.net') || urlAfter.includes('/oauth2/')) {
            console.warn(`      ⚠️  Redirection vers la page de login détectée`);
            await login(page);
            await page.waitForTimeout(2000);
            await page.goto(startUrl, { waitUntil: 'networkidle' });
            await openAllNodes(page);
            await page.waitForTimeout(1000);
            failed++;
            continue;
          }
          
          // Scraper les groupes de produits directement (sans cliquer sur btn-main)
          let productGroups: ProductGroup[] = [];
          
          // Attendre que le multiselect soit présent (il est déjà sur la page)
          try {
            await page.waitForSelector('p-multiselect[ta-name="product-group-selector"]', { timeout: 5000 });
            await page.waitForTimeout(500); // Réduit de 1000 à 500ms
          } catch (e) {
            console.log(`      ⚠️  Multiselect non trouvé`);
          }
          
          productGroups = await scrapeProductGroups(page);
          
          if (productGroups.length > 0) {
            console.log(`      ✅ ${productGroups.length} groupe(s) de produits`);
          } else {
            console.log(`      ℹ️  Aucun groupe de produits`);
          }
          
          // Détecter catalog-not-found
          const isCatalogNotFound = urlAfter.includes('catalog-not-found') || 
                                    await page.locator('text=/catalog.*not.*found/i').count() > 0;
          console.log(`      🔍 Catalog-not-found détecté: ${isCatalogNotFound}`);
          
          if (hasNavigated || isCatalogNotFound) {
            // Sauvegarder les données si on a navigué (même sans groupes de produits pour garder la hiérarchie)
            if (hasNavigated && !isCatalogNotFound) {
              allData.push({
                categoryId: category.id,
                categoryName: category.name,
                level: category.level,
                productGroups: productGroups,
                url: urlAfter
              });
              if (productGroups.length > 0) {
                withProducts++;
              }
            }
            
            // Revenir à la page de départ
            console.log(`      🔙 Retour à la page de départ...`);
            try {
              await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 30000 });
              console.log(`      ✅ Navigation vers la page de départ réussie`);
            } catch (e) {
              // Si la navigation échoue, essayer goBack
              console.log(`      ⚠️  Navigation directe échouée, tentative avec goBack()...`);
              try {
                await page.goBack({ waitUntil: 'networkidle', timeout: 10000 });
              } catch (e2) {
                console.log(`      ❌ goBack() a aussi échoué: ${e2 instanceof Error ? e2.message : 'Erreur inconnue'}`);
                failed++;
                continue;
              }
            }
            await page.waitForTimeout(returnDelay);
            
            // Vérifier si le bouton align-right doit être cliqué
            try {
              const alignRightButton = page.locator('button:has(i.ta-icon-align-right)');
              const buttonCount = await alignRightButton.count();
              if (buttonCount > 0) {
                const isVisible = await alignRightButton.first().isVisible().catch(() => false);
                if (isVisible) {
                  console.log(`      🔘 Clic sur le bouton align-right...`);
                  await alignRightButton.first().click({ timeout: 3000 });
                  await page.waitForTimeout(500);
                }
              }
            } catch (e) {
              // Ignorer si le bouton n'est pas trouvé
            }
            
            // Réouvrir les nœuds (ils se referment souvent après navigation)
            await openAllNodes(page);
            
            if (isCatalogNotFound) {
              failed++;
            } else {
              visited++;
            }
          } else {
            if (i < 10) {
              console.warn(`      ⚠️  Navigation non détectée`);
            }
          }
        } catch (clickError) {
          // Si le sélecteur ne fonctionne pas, essayer de trouver par texte
          try {
            await page.locator(`text="${category.name}"`).first().click({ timeout: 3000 });
            await page.waitForTimeout(pageLoadDelay);
            await page.goBack({ waitUntil: 'networkidle' });
            await page.waitForTimeout(returnDelay);
            visited++;
          } catch (e) {
            failed++;
            console.error(`      ❌ Erreur: ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
          }
        }
      } catch (e) {
        failed++;
        console.error(`   [${i + 1}/${maxCategories}] ${category.name} - ❌ Erreur: ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
        
        // Essayer de revenir en arrière en cas d'erreur
        try {
          if (page.url() !== startUrl) {
            await page.goBack({ waitUntil: 'networkidle' });
            await page.waitForTimeout(returnDelay);
          }
        } catch (e2) {
          // Si on ne peut pas revenir, naviguer directement vers l'URL de départ
          try {
            await page.goto(startUrl, { waitUntil: 'networkidle' });
          } catch (e3) {
            console.error('      ❌ Impossible de revenir à la page de départ');
          }
        }
      }
    }

    // Construire la hiérarchie
    console.log('\n🌲 Construction de la hiérarchie...');
    
    // Grouper par niveau pour faciliter la construction de la hiérarchie
    const byLevel: Record<number, CategoryWithProducts[]> = {};
    allData.forEach(cat => {
      if (!byLevel[cat.level]) byLevel[cat.level] = [];
      byLevel[cat.level].push(cat);
    });
    
    // Sauvegarder les données en JSON
    console.log('💾 Sauvegarde des données...');
    const fs = require('fs');
    const path = require('path');
    
    const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
    
    const outputData = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalCategories: allData.length,
        categoriesWithProducts: withProducts,
        totalProductGroups: allData.reduce((sum, cat) => sum + cat.productGroups.length, 0),
        testMode: TEST_MODE,
        timeElapsed: `${totalElapsed}s`,
        byLevel: Object.keys(byLevel).sort().reduce((acc, level) => {
          acc[`niveau${level}`] = {
            count: byLevel[parseInt(level)].length,
            withProducts: byLevel[parseInt(level)].filter(c => c.productGroups.length > 0).length
          };
          return acc;
        }, {} as Record<string, { count: number; withProducts: number }>)
      },
      categories: allData
    };
    
    // Déterminer le type de page pour le nom de fichier
    const pageType = startUrl.includes('/parts/cars/') ? 'cars' : 'universal';
    const outputPath = path.join(process.cwd(), `tecdoc-categories-products-${pageType}-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`✅ Données sauvegardées dans: ${outputPath}`);
    console.log(`   📂 ${allData.length} catégories au total`);
    console.log(`   📦 ${withProducts} catégories avec groupes de produits`);
    console.log(`   🎯 ${outputData.metadata.totalProductGroups} groupes de produits au total`);
    console.log(`   ⏱️  Temps total: ${totalElapsed}s\n`);

    // Résumé détaillé
    console.log('📊 Résumé par niveau:');
    Object.keys(byLevel).sort().forEach(level => {
      const cats = byLevel[parseInt(level)];
      const withProds = cats.filter(c => c.productGroups.length > 0).length;
      console.log(`   Niveau ${level}: ${cats.length} catégories (${withProds} avec produits)`);
    });
    console.log('');
    console.log('📊 Statistiques finales:');
    console.log(`   ✅ ${visited} catégories visitées`);
    if (failed > 0) {
      console.log(`   ❌ ${failed} échecs`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  } finally {
    console.log('🔒 Fermeture du navigateur...');
    await browser.close();
    console.log('✅ Script terminé!');
  }
}

async function openAllNodes(page: Page) {
  try {
    let totalOpened = 0;
    let iterations = 0;
    const maxIterations = 50;
    let stuckCount = 0;
    
    while (iterations < maxIterations) {
      iterations++;
      
      // Compter les nœuds fermés avant
      const beforeCount = await page.locator('li.p-treenode[aria-expanded="false"], li[aria-expanded="false"]').count();
      
      if (beforeCount === 0) {
        break;
      }
      
      // Ouvrir tous les nœuds fermés en une fois avec JavaScript
      const openedThisRound = await page.evaluate(() => {
        let opened = 0;
        const collapsedNodes = document.querySelectorAll('li.p-treenode[aria-expanded="false"], li[aria-expanded="false"]');
        
        collapsedNodes.forEach((node: Element) => {
          const ariaExpanded = node.getAttribute('aria-expanded');
          if (ariaExpanded === 'false') {
            const toggler = node.querySelector('.p-tree-toggler, .p-treenode-toggler, span.p-tree-toggler-icon, button.p-tree-toggler, [class*="toggler"]') as HTMLElement;
            if (toggler) {
              toggler.click();
              opened++;
            }
          }
        });
        
        return opened;
      });
      
      totalOpened += openedThisRound;
      
      // Attendre un peu pour que le DOM se mette à jour
      await page.waitForTimeout(50); // Réduit de 100 à 50ms
      
      // Compter les nœuds fermés après
      const afterCount = await page.locator('li.p-treenode[aria-expanded="false"], li[aria-expanded="false"]').count();
      
      // Si le nombre ne change pas et qu'on n'a rien ouvert, on est bloqué
      if (beforeCount === afterCount && openedThisRound === 0) {
        stuckCount++;
        if (stuckCount > 5) {
          break;
        }
      } else {
        stuckCount = 0;
      }
    }
    
    // Attendre un peu pour que le DOM se stabilise
    await page.waitForTimeout(300); // Réduit de 500 à 300ms
    
  } catch (e) {
    // Ignorer les erreurs
  }
}

async function scrapeProductGroups(page: Page): Promise<ProductGroup[]> {
  try {
    // Utiliser JavaScript directement pour ouvrir le dropdown et extraire les données
    // Cette approche est basée sur ce qui fonctionne dans la console du navigateur
    const result = await page.evaluate(() => {
      const groups: Array<{ id: string; name: string }> = [];
      
      // Trouver le multiselect
      const multiselect = document.querySelector('p-multiselect[ta-name="product-group-selector"]');
      if (!multiselect) {
        return { success: false, groups: [], navigated: false };
      }
      
      // Sauvegarder l'URL avant
      const urlBefore = window.location.href;
      
      // Ouvrir le dropdown en cliquant sur le trigger
      const trigger = multiselect.querySelector('.p-multiselect-trigger') as HTMLElement;
      if (!trigger) {
        return { success: false, groups: [], navigated: false };
      }
      
      trigger.click();
      
      // Attendre que le menu s'ouvre (simulation synchrone)
      const start = Date.now();
      while (Date.now() - start < 800) {
        // Attendre 800ms (réduit de 1000ms)
      }
      
      // Vérifier qu'on n'a pas navigué
      if (window.location.href !== urlBefore) {
        return { success: false, groups: [], navigated: true };
      }
      
      // Chercher les options dans toute la page (y compris les overlays)
      const options = document.querySelectorAll('span[ta-name="product-group-selector__option"]');
      
      options.forEach((option) => {
        const name = option.textContent?.trim();
        const id = option.getAttribute('ta-value');
        
        if (name && id) {
          groups.push({ id, name });
        }
      });
      
      // Fermer le dropdown en cliquant sur le body
      document.body.click();
      
      return { success: true, groups, navigated: false };
    }) as { success: boolean; groups: Array<{ id: string; name: string }>; navigated: boolean };
    
    // Si une navigation a été détectée, retourner immédiatement
    if (result.navigated) {
      return [];
    }
    
    return result.groups;
    
  } catch (error) {
    return [];
  }
}

async function extractCategories(page: Page): Promise<Category[]> {
  console.log('   🔍 Recherche de tous les liens...');
  const categories: Category[] = [];
  const processedIds = new Set<string>();

  // Trouver tous les liens - plusieurs sélecteurs pour être sûr
  const links = await page.locator('a.node-link, a[ta-name="assembly-subgroup-id"], a[ta-value], a[data-id], li[role="treeitem"] a, li.p-treenode a, li[aria-expanded] a').all();
  console.log(`   📋 ${links.length} liens trouvés, traitement en cours...`);

  // Debug: afficher quelques exemples
  if (links.length > 0) {
    console.log('   🔍 Examen des premiers liens pour déboguer...');
    for (let i = 0; i < Math.min(3, links.length); i++) {
      try {
        const link = links[i];
        const name = (await link.textContent())?.trim();
        const id = await link.getAttribute('ta-value') || await link.getAttribute('data-id');
        const className = await link.getAttribute('class');
        console.log(`      Lien ${i + 1}: "${name}" (ID: ${id}, class: ${className})`);
      } catch (e) {
        // Ignorer
      }
    }
  }

  for (const link of links) {
    try {
      const name = (await link.textContent())?.trim();
      if (!name || name.length === 0) continue;

      let id = await link.getAttribute('ta-value') || await link.getAttribute('data-id');
      if (!id) {
        const parent = await link.evaluateHandle(el => el.closest('[role="treeitem"], li[aria-expanded], li.p-treenode'));
        if (parent) {
          const parentElement = parent.asElement();
          if (parentElement) {
            id = await parentElement.getAttribute('data-id') || await parentElement.getAttribute('ta-value');
          }
        }
      }

      if (!id) continue; // Ignorer si pas d'ID
      if (processedIds.has(id)) continue;
      processedIds.add(id);

      // Calculer le niveau de plusieurs façons
      const level = await link.evaluate((el) => {
        // Méthode 1: Compter les <ul> parents
        let level1 = 1;
        let current: Element | null = el;
        while (current && current !== document.body) {
          const parent = current.parentElement;
          if (parent && (parent.tagName === 'UL' || parent.classList.contains('p-treenode-children'))) {
            level1++;
          }
          current = parent;
        }

        // Méthode 2: Compter les <li.p-treenode> parents
        let level2 = 1;
        current = el;
        while (current) {
          const parent = current.closest('li.p-treenode');
          if (parent && parent !== current.closest('li.p-treenode')) {
            level2++;
            current = parent;
          } else {
            break;
          }
        }

        // Méthode 3: Utiliser l'indentation CSS (margin-left)
        let level3 = 1;
        current = el;
        while (current) {
          const style = window.getComputedStyle(current);
          const marginLeft = parseInt(style.marginLeft) || 0;
          if (marginLeft > 0) {
            level3 = Math.max(level3, Math.floor(marginLeft / 20) + 1);
          }
          const parent = current.parentElement;
          if (parent && parent.classList.contains('p-treenode')) {
            level3++;
          }
          current = parent;
          if (!current || current.tagName === 'BODY') break;
        }

        // Prendre le maximum des méthodes
        return Math.max(level1, level2, level3);
      });

      // Debug pour les premiers éléments
      if (categories.length < 5) {
        console.log(`      Catégorie trouvée: "${name}" (ID: ${id}, niveau: ${level})`);
      }

      // Sur la page cars, on veut scraper toutes les catégories (pas seulement 3-5)
      // Mais on garde le filtre pour la page universelle
      const url = page.url();
      const isCarsPage = url.includes('/parts/cars/');
      
      if (isCarsPage) {
        // Pour les pages cars, inclure tous les niveaux (sauf niveau 1 qui est souvent juste le conteneur)
        if (level >= 2) {
          categories.push({
            name,
            id,
            level,
            element: link,
          });
        }
      } else {
        // Pour la page universelle, filtrer les niveaux 3-5
        if (level >= 3 && level <= 5) {
          categories.push({
            name,
            id,
            level,
            element: link,
          });
        }
      }
    } catch (e) {
      // Ignorer les erreurs mais logger pour debug
      if (categories.length < 5) {
        console.log(`      ⚠️  Erreur lors du traitement d'un lien: ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
      }
    }
  }

  console.log(`   ✅ Extraction terminée: ${categories.length} catégories de niveau 3-5 trouvées`);
  
  // Afficher la répartition par niveau
  const byLevel: Record<number, number> = {};
  categories.forEach(cat => {
    byLevel[cat.level] = (byLevel[cat.level] || 0) + 1;
  });
  console.log('   📊 Répartition par niveau:');
  Object.keys(byLevel).sort().forEach(level => {
    console.log(`      Niveau ${level}: ${byLevel[parseInt(level)]} catégories`);
  });
  
  return categories;
}

// Lancer le script
visitCategories().catch(console.error);
