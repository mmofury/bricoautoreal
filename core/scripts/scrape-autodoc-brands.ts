import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import * as https from 'https';
import * as http from 'http';

interface BrandLogo {
  name: string;
  logoUrl: string;
  letter: string;
}

const OUTPUT_DIR = path.join(process.cwd(), 'autodoc-brand-logos');
const BASE_URL = 'https://www.auto-doc.fr/marques-pieces-detachees';

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Suivre les redirections
        return downloadImage(response.headers.location || url, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const writer = fs.createWriteStream(filepath);
      response.pipe(writer);

      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

/**
 * Nettoie le nom du fabricant pour un nom de fichier sécurisé
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Retire les caractères interdits
    .replace(/\s+/g, '_') // Remplace les espaces par des underscores
    .trim();
}

/**
 * Scrape une page de lettre pour récupérer tous les logos
 */
async function scrapeLetterPage(page: Page, letterUrl: string, letter: string, debug: boolean = false): Promise<BrandLogo[]> {
  console.log(`📄 Scraping de la page ${letter}...`);
  
  let retries = 3;
  
  while (retries > 0) {
    try {
      // Utiliser domcontentloaded avec un timeout plus long
      await page.goto(letterUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      break; // Succès, sortir de la boucle
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error(`   ❌ Échec après 3 tentatives pour ${letter}`);
        return [];
      }
      console.log(`   ⚠️  Tentative échouée, nouvelle tentative... (${3 - retries}/3)`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  
  try {
    
    // Debug: Sauvegarder le HTML pour la première lettre
    if (debug && letter === 'A') {
      const html = await page.content();
      const debugPath = path.join(OUTPUT_DIR, 'debug-page-A.html');
      fs.writeFileSync(debugPath, html, 'utf-8');
      console.log(`   🔍 HTML sauvegardé dans ${debugPath}`);
    }
    
    // Attendre que les images soient chargées
    await page.waitForTimeout(2000);
    
    // Attendre qu'au moins une image de marque soit chargée
    try {
      await page.waitForSelector('a.brand-item-full__img img, img.lazyloaded[src*="brands/thumbs"]', { timeout: 10000 });
    } catch {
      console.log('   ⚠️  Aucun sélecteur trouvé, continuation...');
    }
    
    // Scroller pour charger toutes les images lazy-loaded
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const maxScrolls = 50; // Limiter le nombre de scrolls
        let scrollCount = 0;
        
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          const currentScroll = window.scrollY || window.pageYOffset;
          
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || 
              currentScroll + window.innerHeight >= scrollHeight ||
              scrollCount >= maxScrolls) {
            clearInterval(timer);
            // Remonter en haut
            window.scrollTo(0, 0);
            setTimeout(resolve, 1000);
          }
        }, 200);
      });
    });

    // Attendre que les images lazy-loaded se chargent
    await page.waitForTimeout(3000);

    // Extraire tous les logos et noms de fabricants
    // Structure: <a class="brand-item-full__img"><img class="lazyloaded" src="https://cdn.autodoc.de/brands/thumbs/442.png?m=0" alt="A.B.S." /></a>
    const brandsAndDebug = await page.evaluate(() => {
      const results: { name: string; logoUrl: string }[] = [];
      const seen = new Set<string>();
      const debugInfo: string[] = [];

      // Sélecteur principal : images dans les liens de marques
      // Essayer plusieurs sélecteurs au cas où la structure serait différente
      let images: HTMLImageElement[] = [];
      
      // Méthode 1: Par classe du parent
      images = Array.from(document.querySelectorAll<HTMLImageElement>('a.brand-item-full__img img'));
      debugInfo.push(`Méthode 1 (a.brand-item-full__img img): ${images.length} images`);
      
      // Méthode 2: Par classe de l'image
      if (images.length === 0) {
        images = Array.from(document.querySelectorAll<HTMLImageElement>('img.lazyloaded'));
        debugInfo.push(`Méthode 2 (img.lazyloaded): ${images.length} images`);
      }
      
      // Méthode 3: Par URL dans src
      if (images.length === 0) {
        images = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="brands/thumbs"], img[src*="cdn.autodoc.de/brands/thumbs"]'));
        debugInfo.push(`Méthode 3 (img[src*="brands/thumbs"]): ${images.length} images`);
      }
      
      // Méthode 4: Toutes les images et filtrer
      if (images.length === 0) {
        const allImgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
        images = allImgs.filter(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          return src.includes('brands/thumbs') || src.includes('cdn.autodoc.de/brands');
        });
        debugInfo.push(`Méthode 4 (filtrage manuel): ${images.length} images sur ${allImgs.length} total`);
      }
      
      debugInfo.push(`Total images sélectionnées: ${images.length}`);

      images.forEach((img) => {
        // Récupérer le nom du fabricant depuis l'attribut alt
        const name = img.getAttribute('alt') || '';
        
        // Ignorer les images sans nom
        if (!name || name.trim().length === 0) return;
        
        // Récupérer l'URL de l'image - utiliser src directement (déjà chargée avec lazyloaded)
        let logoUrl = img.getAttribute('src') || '';
        
        // Si pas de src, essayer data-src
        if (!logoUrl) {
          logoUrl = img.getAttribute('data-src') || '';
        }
        
        // Si toujours pas, essayer srcset
        if (!logoUrl) {
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            // Prendre l'URL avec m=0 (meilleure qualité) depuis srcset
            const srcsetParts = srcset.split(',');
            const highQuality = srcsetParts.find(p => p.includes('m=0'));
            if (highQuality) {
              logoUrl = highQuality.trim().split(' ')[0];
            } else {
              // Sinon prendre la première
              logoUrl = srcsetParts[0].trim().split(' ')[0];
            }
          }
        }

        // Vérifier que c'est bien une URL de logo de marque
        if (logoUrl && logoUrl.includes('brands/thumbs')) {
          // Nettoyer l'URL
          const cleanUrl = logoUrl.split(' ')[0].split(',')[0]; // Prendre la première URL si srcset
          
          // Normaliser l'URL pour avoir la meilleure qualité (m=0 = meilleure qualité)
          // Si l'URL a déjà m=0, la garder, sinon la remplacer/ajouter
          let normalizedUrl = cleanUrl;
          if (!normalizedUrl.includes('m=0')) {
            normalizedUrl = normalizedUrl.replace(/[?&]m=\d+/, ''); // Enlever les paramètres m existants
            normalizedUrl += normalizedUrl.includes('?') ? '&m=0' : '?m=0'; // Ajouter ?m=0 pour meilleure qualité
          }
          
          // S'assurer que l'URL est complète
          if (normalizedUrl.startsWith('//')) {
            normalizedUrl = `https:${normalizedUrl}`;
          } else if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = `https://${normalizedUrl}`;
          }
          
          const cleanName = name.trim();
          if (cleanName && normalizedUrl && !seen.has(cleanName.toLowerCase())) {
            seen.add(cleanName.toLowerCase());
            results.push({
              name: cleanName,
              logoUrl: normalizedUrl,
            });
          }
        }
      });

      return { results, debugInfo };
    });

    const brands = brandsAndDebug.results;
    if (brands.length === 0) {
      console.log(`   🔍 Debug: ${brandsAndDebug.debugInfo.join(', ')}`);
    }
    console.log(`   ✅ Trouvé ${brands.length} fabricants pour la lettre ${letter}`);
    
    return brands.map((brand) => ({
      ...brand,
      letter,
    }));
  } catch (error) {
    console.error(`❌ Erreur lors du scraping de la page ${letter}:`, error);
    return [];
  }
}

/**
 * Trouve tous les liens vers les pages de lettres
 */
async function findLetterLinks(page: Page): Promise<Map<string, string>> {
  console.log('🔍 Recherche des liens vers les pages de lettres...');
  
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Essayer plusieurs sélecteurs pour trouver les liens de lettres
  // page.evaluate() ne peut pas retourner un Map, on retourne un objet ou un array
  const letterLinksData = await page.evaluate(() => {
    const result: Record<string, string> = {};
    
    // Méthode 1: Chercher dans les liens qui contiennent /marques-pieces-detachees/
    const allLinks = document.querySelectorAll('a[href*="/marques-pieces-detachees/"]');
    
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim() || '';
      
      // Si le texte est une lettre unique
      if (href && text.length === 1 && /^[A-Z]$/i.test(text)) {
        const letter = text.toUpperCase();
        const fullUrl = href.startsWith('http') ? href : `https://www.auto-doc.fr${href}`;
        result[letter] = fullUrl;
      }
    });
    
    return result;
  });

  // Convertir l'objet en Map
  const letterLinks = new Map<string, string>();
  
  // S'assurer que letterLinksData est un objet
  if (letterLinksData && typeof letterLinksData === 'object') {
    Object.entries(letterLinksData).forEach(([letter, url]) => {
      if (typeof url === 'string' && url.length > 0) {
        letterLinks.set(letter, url);
      }
    });
  }

  // Méthode 2: Si on a trouvé quelques lettres mais pas toutes, compléter
  // AutoDoc utilise généralement le format: /marques-pieces-detachees/a, /marques-pieces-detachees/b, etc.
  if (letterLinks.size > 0 && letterLinks.size < 26) {
    // On a trouvé au moins un lien, utilisons le pattern pour générer les autres
    const firstUrl = Array.from(letterLinks.values())[0];
    if (firstUrl) {
      const baseUrl = firstUrl.replace(/\/[a-z]$/i, '');
      
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        if (!letterLinks.has(letter)) {
          letterLinks.set(letter, `${baseUrl}/${letter.toLowerCase()}`);
        }
      }
    }
  }

  // Si on n'a toujours rien trouvé, générer toutes les URLs automatiquement
  if (letterLinks.size === 0) {
    console.log('   ⚠️  Aucun lien trouvé, génération automatique des URLs...');
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i); // A-Z
      letterLinks.set(letter, `${BASE_URL}/${letter.toLowerCase()}`);
    }
  }

  // Vérification finale que c'est bien un Map
  if (!(letterLinks instanceof Map)) {
    console.error('   ❌ Erreur: letterLinks n\'est pas un Map');
    // Forcer la création d'un nouveau Map
    const newMap = new Map<string, string>();
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      newMap.set(letter, `${BASE_URL}/${letter.toLowerCase()}`);
    }
    console.log(`   ✅ Généré ${newMap.size} pages de lettres (génération automatique)`);
    return newMap;
  }

  console.log(`   ✅ Trouvé ${letterLinks.size} pages de lettres`);
  return letterLinks;
}

async function main() {
  console.log('🚀 Démarrage du scraping AutoDoc pour les logos de fabricants...\n');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Créer un contexte avec user-agent et plus de mémoire
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  let page = await context.newPage();

  try {
    // 1. Trouver tous les liens vers les pages de lettres
    const letterLinks = await findLetterLinks(page);
    console.log(`\n📋 Pages à scraper: ${Array.from(letterLinks.keys()).sort().join(', ')}\n`);

    // 2. Scraper chaque page de lettre
    const allBrands: BrandLogo[] = [];
    const letters = Array.from(letterLinks.keys()).sort();

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      const letterUrl = letterLinks.get(letter);
      
      if (!letterUrl) continue;

      console.log(`\n[${i + 1}/${letters.length}] Traitement de la lettre ${letter}...`);
      
      // Recréer la page si elle a crashé
      try {
        await page.url(); // Vérifier si la page est toujours valide
      } catch {
        console.log('   ⚠️  Page crashée, recréation...');
        try {
          await page.close();
        } catch {}
        page = await context.newPage();
      }
      
      const brands = await scrapeLetterPage(page, letterUrl, letter, i === 0); // Debug pour la première lettre
      allBrands.push(...brands);

      // Pause entre les requêtes pour éviter la surcharge
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ Scraping terminé ! Total: ${allBrands.length} fabricants trouvés\n`);

    // 3. Télécharger les logos
    console.log('⬇️  Téléchargement des logos...\n');
    
    const letterDirs: Record<string, string> = {};
    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < allBrands.length; i++) {
      const brand = allBrands[i];
      
      // Créer un dossier par lettre
      if (!letterDirs[brand.letter]) {
        const letterDir = path.join(OUTPUT_DIR, brand.letter);
        if (!fs.existsSync(letterDir)) {
          fs.mkdirSync(letterDir, { recursive: true });
        }
        letterDirs[brand.letter] = letterDir;
      }

      const sanitizedName = sanitizeFilename(brand.name);
      const fileExtension = brand.logoUrl.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || 'png';
      const filepath = path.join(letterDirs[brand.letter], `${sanitizedName}.${fileExtension}`);

      // Skip si le fichier existe déjà
      if (fs.existsSync(filepath)) {
        console.log(`   ⏩ [${i + 1}/${allBrands.length}] ${brand.name} (déjà téléchargé)`);
        downloaded++;
        continue;
      }

      try {
        console.log(`   ⬇️  [${i + 1}/${allBrands.length}] ${brand.name}...`);
        await downloadImage(brand.logoUrl, filepath);
        downloaded++;
      } catch (error) {
        console.error(`   ❌ Erreur pour ${brand.name}:`, error);
        failed++;
      }

      // Pause entre les téléchargements
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 4. Sauvegarder un fichier JSON avec toutes les informations
    const jsonPath = path.join(OUTPUT_DIR, 'brands.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(allBrands, null, 2),
      'utf-8'
    );

    console.log(`\n✨ Terminé !`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Total de fabricants: ${allBrands.length}`);
    console.log(`   - Logos téléchargés: ${downloaded}`);
    console.log(`   - Échecs: ${failed}`);
    console.log(`   - Dossier de sortie: ${OUTPUT_DIR}`);
    console.log(`   - Fichier JSON: ${jsonPath}`);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);

