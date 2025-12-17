import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

interface SearchResult {
  productName: string;
  matches: Array<{ href: string; text: string }>;
}

function prompt(question: string): Promise<void> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const onData = () => {
      process.stdin.off('data', onData);
      resolve();
    };
    process.stdin.on('data', onData);
  });
}

function loadProductNames(): string[] {
  const dirs = ['tecdoc-results', 'tecdoc-results-other-types'];
  const names = new Set<string>();

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.json') || file === '_progress.json') continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
        if (j.productName && typeof j.productName === 'string') {
          names.add(j.productName.trim());
        }
      } catch {
        // ignore
      }
    }
  }

  return Array.from(names);
}

async function run() {
  const productNames = loadProductNames();
  console.log(`📦 ${productNames.length} groupes de produits à tester`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('🌐 Ouverture de https://www.mister-auto.com/pieces-auto/ ...');
  await page.goto('https://www.mister-auto.com/pieces-auto/', { waitUntil: 'networkidle' });
  await page.waitForSelector('input#searchbar', { timeout: 10000 });
  console.log('✅ Barre de recherche trouvée');

  console.log('\n⏸️  Ferme le popup (cookies, etc.), puis appuie sur Entrée pour démarrer le batch...');
  await prompt('');
  console.log('▶️  Démarrage du batch...\n');

  const results: SearchResult[] = [];
  let idx = 0;

  for (const term of productNames) {
    idx++;
    // Clear et taper
    await page.fill('input#searchbar', '');
    await page.fill('input#searchbar', term);

    // Attente panel
    try {
      await page.waitForSelector('.ma-badge-content, ul.list-hover', { timeout: 4000 });
    } catch {
      // ignore
    }
    await page.waitForTimeout(800);

    const hasCategories = await page.$('text=Catégories');
    let matches: Array<{ href: string; text: string }> = [];
    if (hasCategories) {
      matches = await page.$$eval('ul.list-hover.ma-list li a.ma-links', (links) =>
        links.map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.replace(/\s+/g, ' ').trim() || '',
        }))
      );
    }

    results.push({ productName: term, matches });
    console.log(`   ${idx}/${productNames.length} - "${term}" -> ${matches.length} cat.`);
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const outPath = path.join(process.cwd(), `mister-auto-batch-${timestamp}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          total: productNames.length,
        },
        results,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`\n💾 Résultats sauvegardés: ${outPath}`);
  console.log('⏹️  Fermeture du navigateur...');
  await browser.close();
}

run().catch(console.error);


























