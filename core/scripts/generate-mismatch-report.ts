import * as fs from 'fs';
import * as path from 'path';

interface ProductResult {
  productName: string;
  productId?: number;
  searchText: string;
  found: boolean;
  hasMatch: boolean;
  arborescence?: any;
  arborescenceText?: string;
  productIdsInArbo?: number[];
  matchedProductIds?: number[];
  closestProductIds?: Array<{
    productId: number;
    productName: string;
  }>;
  error?: string;
  timestamp: string;
}

interface MismatchSummary {
  productName: string;
  productId?: number;
  hasArborescence: boolean;
  productIdsFound?: number[];
  closestProducts?: Array<{ productId: number; productName: string }>;
  error?: string;
  arborescenceText?: string;
}

/**
 * Charge tous les résultats depuis le dossier
 */
function loadAllResults(resultsDir: string): ProductResult[] {
  const files = fs.readdirSync(resultsDir);
  const results: ProductResult[] = [];

  for (const file of files) {
    if (file.endsWith('.json') && file !== '_progress.json') {
      const filePath = path.join(resultsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = JSON.parse(content) as ProductResult;
        results.push(result);
      } catch (error) {
        console.error(`Erreur lors de la lecture de ${file}:`, error);
      }
    }
  }

  return results;
}

/**
 * Génère le rapport détaillé
 */
function generateReport(results: ProductResult[], outputPath: string): void {
  // Catégoriser les résultats
  const exactMatches: ProductResult[] = [];
  const wrongProductIds: MismatchSummary[] = [];
  const noArborescence: MismatchSummary[] = [];
  const errors: MismatchSummary[] = [];

  for (const result of results) {
    if (result.hasMatch) {
      exactMatches.push(result);
    } else if (result.error) {
      errors.push({
        productName: result.productName,
        productId: result.productId,
        hasArborescence: false,
        error: result.error,
      });
    } else if (result.found && result.productIdsInArbo && result.productIdsInArbo.length > 0) {
      // Arborescence trouvée mais mauvais productId
      wrongProductIds.push({
        productName: result.productName,
        productId: result.productId,
        hasArborescence: true,
        productIdsFound: result.productIdsInArbo,
        closestProducts: result.closestProductIds,
        arborescenceText: result.arborescenceText,
      });
    } else {
      // Pas d'arborescence trouvée
      noArborescence.push({
        productName: result.productName,
        productId: result.productId,
        hasArborescence: false,
      });
    }
  }

  // Générer le rapport texte
  const lines: string[] = [];
  
  lines.push('='.repeat(100));
  lines.push('RAPPORT DÉTAILLÉ DES NON-CORRESPONDANCES TECDOC');
  lines.push('='.repeat(100));
  lines.push('');
  lines.push(`Date: ${new Date().toLocaleString('fr-FR')}`);
  lines.push(`Total de produits analysés: ${results.length}`);
  lines.push('');
  lines.push('RÉSUMÉ GLOBAL:');
  lines.push(`  ✅ Matchs exacts: ${exactMatches.length}`);
  lines.push(`  ❌ Non-matchs (mauvais ProductIds): ${wrongProductIds.length}`);
  lines.push(`  ❌ Sans arborescence: ${noArborescence.length}`);
  lines.push(`  ⚠️  Erreurs: ${errors.length}`);
  lines.push('');
  lines.push('='.repeat(100));
  lines.push('');

  // Section 1: Produits avec mauvais ProductIds
  if (wrongProductIds.length > 0) {
    lines.push('┌'.padEnd(100, '─') + '┐');
    lines.push('│ PRODUITS AVEC MAUVAIS PRODUCTIDS'.padEnd(100) + '│');
    lines.push('└'.padEnd(100, '─') + '┘');
    lines.push('');
    lines.push(`Total: ${wrongProductIds.length} produits`);
    lines.push('');
    
    wrongProductIds.forEach((mismatch, index) => {
      lines.push(`${index + 1}. ${mismatch.productName}`);
      if (mismatch.productId) {
        lines.push(`   ProductId attendu: ${mismatch.productId}`);
      }
      if (mismatch.productIdsFound) {
        lines.push(`   ProductIds trouvés dans l'arborescence: ${mismatch.productIdsFound.slice(0, 10).join(', ')}${mismatch.productIdsFound.length > 10 ? ` ... (${mismatch.productIdsFound.length} au total)` : ''}`);
      }
      
      if (mismatch.closestProducts && mismatch.closestProducts.length > 0) {
        lines.push(`   Produits les plus proches trouvés:`);
        mismatch.closestProducts.forEach(closest => {
          lines.push(`     - [${closest.productId}] ${closest.productName}`);
        });
      }
      
      if (mismatch.arborescenceText) {
        lines.push(`   Arborescence trouvée:`);
        const arboLines = mismatch.arborescenceText.split('\n');
        arboLines.forEach(line => {
          lines.push(`     ${line}`);
        });
      }
      
      lines.push('');
    });
    
    lines.push('');
    lines.push('='.repeat(100));
    lines.push('');
  }

  // Section 2: Produits sans arborescence
  if (noArborescence.length > 0) {
    lines.push('┌'.padEnd(100, '─') + '┐');
    lines.push('│ PRODUITS SANS ARBORESCENCE TROUVÉE'.padEnd(100) + '│');
    lines.push('└'.padEnd(100, '─') + '┘');
    lines.push('');
    lines.push(`Total: ${noArborescence.length} produits`);
    lines.push('');
    
    noArborescence.forEach((mismatch, index) => {
      lines.push(`${index + 1}. ${mismatch.productName}`);
      if (mismatch.productId) {
        lines.push(`   ProductId: ${mismatch.productId}`);
      }
      lines.push('');
    });
    
    lines.push('');
    lines.push('='.repeat(100));
    lines.push('');
  }

  // Section 3: Erreurs
  if (errors.length > 0) {
    lines.push('┌'.padEnd(100, '─') + '┐');
    lines.push('│ ERREURS TECHNIQUES'.padEnd(100) + '│');
    lines.push('└'.padEnd(100, '─') + '┘');
    lines.push('');
    lines.push(`Total: ${errors.length} erreurs`);
    lines.push('');
    
    errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error.productName}`);
      if (error.productId) {
        lines.push(`   ProductId: ${error.productId}`);
      }
      if (error.error) {
        lines.push(`   Erreur: ${error.error.substring(0, 200)}`);
      }
      lines.push('');
    });
  }

  // Sauvegarder le rapport
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  
  // Générer aussi un JSON avec les statistiques
  const jsonReport = {
    summary: {
      total: results.length,
      exactMatches: exactMatches.length,
      wrongProductIds: wrongProductIds.length,
      noArborescence: noArborescence.length,
      errors: errors.length,
    },
    wrongProductIds: wrongProductIds,
    noArborescence: noArborescence,
    errors: errors,
    timestamp: new Date().toISOString(),
  };
  
  const jsonPath = outputPath.replace('.txt', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
  
  console.log('='.repeat(100));
  console.log('📊 RAPPORT GÉNÉRÉ');
  console.log('='.repeat(100));
  console.log(`✅ Matchs exacts: ${exactMatches.length}`);
  console.log(`❌ Non-matchs (mauvais ProductIds): ${wrongProductIds.length}`);
  console.log(`❌ Sans arborescence: ${noArborescence.length}`);
  console.log(`⚠️  Erreurs: ${errors.length}`);
  console.log('');
  console.log(`💾 Rapport texte: ${outputPath}`);
  console.log(`💾 Rapport JSON: ${jsonPath}`);
  console.log('='.repeat(100));
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  const resultsDirArgIndex = args.indexOf('--results-dir');
  const resultsDir = resultsDirArgIndex !== -1 && args[resultsDirArgIndex + 1]
    ? args[resultsDirArgIndex + 1]
    : 'tecdoc-results';
  
  const outputArgIndex = args.indexOf('--output');
  const outputFile = outputArgIndex !== -1 && args[outputArgIndex + 1]
    ? args[outputArgIndex + 1]
    : 'tecdoc-mismatch-report.txt';

  console.log('='.repeat(100));
  console.log('📊 GÉNÉRATION DU RAPPORT DES NON-CORRESPONDANCES');
  console.log('='.repeat(100));
  console.log();

  const resultsPath = path.join(process.cwd(), resultsDir);
  
  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ Dossier introuvable: ${resultsPath}`);
    process.exit(1);
  }

  console.log(`📂 Chargement des résultats depuis: ${resultsPath}`);
  const results = loadAllResults(resultsPath);
  console.log(`✅ ${results.length} fichiers de résultats chargés`);
  console.log();

  const outputPath = path.join(process.cwd(), outputFile);
  generateReport(results, outputPath);
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

















