import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import * as XLSX from 'xlsx';

interface GroupItem {
  name: string;
  href: string | null;
}

interface CategoryRow {
  categoryName: string;
  url: string;
}

async function scrapeGroups(page: Page, url: string): Promise<GroupItem[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForSelector('.ma-badge-content', { timeout: 8000 });
  } catch {
    return [];
  }

  const groups = await page.$$eval('.ma-badge-content', (nodes) =>
    nodes
      .map((n) => {
        const name = n.textContent?.trim() || '';
        const a = n.closest('a') as HTMLAnchorElement | null;
        return {
          name,
          href: a?.href || null,
        };
      })
      .filter((g) => g.name)
  );

  return groups;
}

function loadCategoriesFromXlsx(): CategoryRow[] {
  const xlsxPath = path.join(process.cwd(), 'tecdoc-results', 'datatable.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Fichier introuvable: ${xlsxPath}`);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const categories: CategoryRow[] = [];
  for (const row of rows) {
    const colA = row[0]?.toString().trim() || '';
    const colB = row[1]?.toString().trim() || '';

    // url peut être en colB ou colA si colB vide
    const url = colB.startsWith('http') ? colB : colA.startsWith('http') ? colA : '';
    if (!url) continue;

    const categoryName = colA && !colA.startsWith('http') ? colA : colB && !colB.startsWith('http') ? colB : url;

    categories.push({ categoryName, url });
  }

  // dédoublonnage par URL
  const seen = new Set<string>();
  const unique = categories.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  return unique;
}

async function main() {
  console.log('🚀 Démarrage du scrap Mister-Auto (groupes par catégorie)...');

  const categories = loadCategoriesFromXlsx();
  console.log(`📂 ${categories.length} catégories (niveau 2) à traiter`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: Array<{ categoryName: string; url: string; groups: GroupItem[] }> = [];

  let processed = 0;
  for (const cat of categories) {
    try {
      const groups = await scrapeGroups(page, cat.url);
      results.push({ categoryName: cat.categoryName, url: cat.url, groups });
      processed++;
      console.log(`   ✅ ${cat.categoryName} (${groups.length} groupes) [${processed}/${categories.length}]`);
    } catch (e) {
      console.warn(`   ⚠️  ${cat.categoryName}: erreur ${e instanceof Error ? e.message : 'inconnue'}`);
    }
  }

  await browser.close();

  const timestamp = new Date().toISOString().split('T')[0];
  const output = {
    metadata: {
      scrapedAt: new Date().toISOString(),
      totalCategories: categories.length,
      processed,
    },
    categories: results,
  };

  const outPath = path.join(process.cwd(), `mister-auto-groups-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`💾 Résultat enregistré dans: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

























