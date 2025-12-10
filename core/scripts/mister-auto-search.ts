import { chromium } from 'playwright';

function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const onData = (data: Buffer) => {
      process.stdin.off('data', onData);
      resolve(data.toString().trim());
    };
    process.stdin.on('data', onData);
  });
}

async function run() {
  const browser = await chromium.launch({
    headless: false, // headful
  });
  const page = await browser.newPage();

  console.log('🌐 Ouverture de https://www.mister-auto.com/pieces-auto/ ...');
  await page.goto('https://www.mister-auto.com/pieces-auto/', { waitUntil: 'networkidle' });
  await page.waitForSelector('input#searchbar', { timeout: 10000 });
  console.log('✅ Barre de recherche trouvée');

  console.log('\n⏸️  Fermez le popup (cookies / etc), puis appuyez sur Entrée pour commencer les recherches...');
  await prompt('');

  while (true) {
    const term = await prompt('\n⏩ Entrer un groupe de produit (laisser vide pour quitter): ');
    if (!term) {
      console.log('🔚 Fin des recherches.');
      break;
    }

    console.log(`🔎 Recherche pour: "${term}"`);
    await page.fill('input#searchbar', ''); // clear
    await page.fill('input#searchbar', term);
    console.log('⌛ Attente du popup...');

    // Attendre que le popup apparaisse (ou continuer après délai)
    try {
      await page.waitForSelector('.ma-badge-content, ul.list-hover', { timeout: 4000 });
      console.log('✅ Popup détecté');
    } catch {
      console.log('⚠️  Popup non détecté automatiquement, on continue quand même...');
    }

    await page.waitForTimeout(800); // petite attente supplémentaire

    const hasCategories = await page.$('text=Catégories');
    if (!hasCategories) {
      console.log(`❌ Aucune section "Catégories" pour: ${term}`);
      continue;
    }

    const items = await page.$$eval('ul.list-hover.ma-list li a.ma-links', (links) =>
      links.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: a.textContent?.replace(/\s+/g, ' ').trim() || '',
      }))
    );

    console.log(`Résultats pour: "${term}" (${items.length} entrées)`);
    if (items.length === 0) {
      console.log('⚠️ Aucune entrée trouvée dans la liste.');
    } else {
      console.table(items.slice(0, 15));
    }
  }

  console.log('⏹️  Fermeture du navigateur...');
  await browser.close();
}

run().catch(console.error);

