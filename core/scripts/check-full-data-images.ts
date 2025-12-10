import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

async function checkFullDataImages(filePath: string) {
  console.log('🔍 Recherche d\'images S3 dans full_data...\n');

  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let productsWithFullData = 0;
  let productsWithS3Images = 0;
  const s3ImageExamples: Array<{ productName: string; imageUrl: string }> = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;

    try {
      const product: any = JSON.parse(line);
      
      // Vérifier si full_data existe et contient des images
      if (product.supabase?.full_data) {
        const fullData = JSON.parse(product.supabase.full_data);
        productsWithFullData++;

        // Chercher des URLs S3 dans full_data
        const findS3Urls = (obj: any, path = ''): string[] => {
          const urls: string[] = [];
          
          if (typeof obj === 'string' && (obj.includes('s3://') || obj.includes('s3.amazonaws.com') || obj.includes('.s3.'))) {
            urls.push(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach((item, idx) => {
              urls.push(...findS3Urls(item, `${path}[${idx}]`));
            });
          } else if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
              if (key.toLowerCase().includes('image') || key.toLowerCase().includes('url') || key.toLowerCase().includes('photo')) {
                urls.push(...findS3Urls(obj[key], `${path}.${key}`));
              } else {
                urls.push(...findS3Urls(obj[key], `${path}.${key}`));
              }
            });
          }
          
          return urls;
        };

        const s3Urls = findS3Urls(fullData);
        
        if (s3Urls.length > 0) {
          productsWithS3Images++;
          const productName = product.articleProductName || product.productName || 'N/A';
          s3ImageExamples.push({
            productName,
            imageUrl: s3Urls[0],
          });

          if (s3ImageExamples.length <= 10) {
            console.log(`✅ Trouvé: ${productName}`);
            console.log(`   Image: ${s3Urls[0]}\n`);
          }
        }
      }

      if (lineCount % 10000 === 0) {
        console.log(`📊 Traité ${lineCount} lignes... (${productsWithS3Images} produits avec images S3 trouvés)`);
      }
    } catch (error) {
      // Ignorer les lignes invalides
    }
  }

  console.log('\n✨ Analyse terminée !');
  console.log(`📊 Statistiques:`);
  console.log(`   - Total lignes: ${lineCount}`);
  console.log(`   - Produits avec full_data: ${productsWithFullData}`);
  console.log(`   - Produits avec images S3: ${productsWithS3Images}`);
  
  if (s3ImageExamples.length > 0) {
    console.log(`\n📸 Exemples d'images S3 trouvées:`);
    s3ImageExamples.slice(0, 5).forEach((ex, idx) => {
      console.log(`   ${idx + 1}. ${ex.productName}: ${ex.imageUrl}`);
    });
  }

  await prisma.$disconnect();
}

// Utiliser le premier argument comme chemin de fichier ou le chemin par défaut
const filePath = process.argv[2] || 'C:\\Users\\yohan\\bricoauto\\merged_products.jsonl';

checkFullDataImages(filePath).catch(console.error);

