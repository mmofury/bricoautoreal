import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

interface CompatibleCar {
  modelId: number;
  modelName: string;
  vehicleId: number;
  typeEngineName: string | null;
  manufacturerName: string;
  constructionIntervalStart: string | null;
  constructionIntervalEnd: string | null;
}

interface Specification {
  criteriaName: string;
  criteriaValue: string | null;
}

interface OEMNumber {
  oemBrand: string;
  oemDisplayNo: string;
}

interface ProductData {
  articleNo: string;
  csvId: string;
  supplierName: string;
  articleProductName: string;
  eanNumber: string | null;
  csv: {
    description: string;
    package_weight: string;
    package_height: string;
    package_width: string;
    package_length: string;
  };
  supabase: {
    all_specifications: string;
    oem_numbers: string;
    compatible_cars: string;
    images: string;
  };
}

function parseJsonString(str: string | null): any {
  if (!str || str === 'null' || str === "''" || str === '[]') {
    return null;
  }
  try {
    let cleaned = str.trim();
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/''/g, "'");
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

async function processBatch(
  batch: ProductData[],
  manufacturerMap: Map<string, number>,
  vehicleModelMap: Map<number, number>,
  vehicleMap: Map<number, number>
) {
  const stats = {
    products: 0,
    manufacturers: 0,
    vehicleModels: 0,
    vehicles: 0,
    compatibilities: 0,
    specifications: 0,
    oemNumbers: 0,
    images: 0,
    errors: 0,
  };

  for (const product of batch) {
    try {
      // 1. Traiter les constructeurs et véhicules
      const compatibleCars = parseJsonString(product.supabase?.compatible_cars) || [];
      const vehicleIds: number[] = [];

      for (const car of compatibleCars) {
        if (!car.manufacturerName || !car.modelId || !car.vehicleId) continue;

        // Créer/récupérer constructeur
        let manufacturerId = manufacturerMap.get(car.manufacturerName);
        if (!manufacturerId) {
          const manufacturer = await prisma.manufacturer.upsert({
            where: { name: car.manufacturerName },
            update: {},
            create: { name: car.manufacturerName },
          });
          manufacturerId = manufacturer.id;
          manufacturerMap.set(car.manufacturerName, manufacturerId);
          stats.manufacturers++;
        }

        // Créer/récupérer modèle
        let vehicleModelId = vehicleModelMap.get(car.modelId);
        if (!vehicleModelId) {
          const vehicleModel = await prisma.vehicleModel.upsert({
            where: { modelId: car.modelId },
            update: {},
            create: {
              modelId: car.modelId,
              modelName: car.modelName,
              manufacturerId: manufacturerId,
            },
          });
          vehicleModelId = vehicleModel.id;
          vehicleModelMap.set(car.modelId, vehicleModelId);
          stats.vehicleModels++;
        }

        // Créer/récupérer véhicule
        let vehicleDbId = vehicleMap.get(car.vehicleId);
        if (!vehicleDbId) {
          const vehicle = await prisma.vehicle.upsert({
            where: { vehicleId: car.vehicleId },
            update: {},
            create: {
              vehicleId: car.vehicleId,
              modelId: vehicleModelId, // Utiliser l'ID interne du modèle, pas l'ID externe
              typeEngineName: car.typeEngineName || null,
              constructionIntervalStart: car.constructionIntervalStart || null,
              constructionIntervalEnd: car.constructionIntervalEnd || null,
            },
          });
          vehicleDbId = vehicle.id;
          vehicleMap.set(car.vehicleId, vehicleDbId);
          stats.vehicles++;
        }

        vehicleIds.push(car.vehicleId);
      }

      // 2. Créer le produit
      const supplierName = product.supplierName?.replace(/'/g, '') || null;
      const productName = product.articleProductName?.replace(/'/g, '') || null;

      const dbProduct = await prisma.product.upsert({
        where: { articleNo: product.articleNo },
        update: {
          csvId: product.csvId || null,
          supplierName,
          productName,
          eanNumber: product.eanNumber || null,
          description: product.csv?.description || null,
          packageWeight: product.csv?.package_weight
            ? parseFloat(product.csv.package_weight)
            : null,
          packageHeight: product.csv?.package_height
            ? parseFloat(product.csv.package_height)
            : null,
          packageWidth: product.csv?.package_width
            ? parseFloat(product.csv.package_width)
            : null,
          packageLength: product.csv?.package_length
            ? parseFloat(product.csv.package_length)
            : null,
        },
        create: {
          articleNo: product.articleNo,
          csvId: product.csvId || null,
          supplierName,
          productName,
          eanNumber: product.eanNumber || null,
          description: product.csv?.description || null,
          packageWeight: product.csv?.package_weight
            ? parseFloat(product.csv.package_weight)
            : null,
          packageHeight: product.csv?.package_height
            ? parseFloat(product.csv.package_height)
            : null,
          packageWidth: product.csv?.package_width
            ? parseFloat(product.csv.package_width)
            : null,
          packageLength: product.csv?.package_length
            ? parseFloat(product.csv.package_length)
            : null,
        },
      });

      stats.products++;

      // 3. Créer les spécifications
      const specifications = parseJsonString(product.supabase?.all_specifications) || [];
      if (specifications.length > 0) {
        await prisma.productSpecification.deleteMany({
          where: { productId: dbProduct.id },
        });

        await prisma.productSpecification.createMany({
          data: specifications.map((spec: Specification) => ({
            productId: dbProduct.id,
            criteriaName: spec.criteriaName,
            criteriaValue: spec.criteriaValue || null,
          })),
        });
        stats.specifications += specifications.length;
      }

      // 4. Créer les numéros OEM
      const oemNumbers = parseJsonString(product.supabase?.oem_numbers) || [];
      if (oemNumbers.length > 0) {
        await prisma.productOemNumber.deleteMany({
          where: { productId: dbProduct.id },
        });

        await prisma.productOemNumber.createMany({
          data: oemNumbers.map((oem: OEMNumber) => ({
            productId: dbProduct.id,
            oemBrand: oem.oemBrand,
            oemDisplayNo: oem.oemDisplayNo,
          })),
        });
        stats.oemNumbers += oemNumbers.length;
      }

      // 5. Créer les compatibilités
      if (vehicleIds.length > 0) {
        // Récupérer les IDs de véhicules depuis la DB
        const vehicles = await prisma.vehicle.findMany({
          where: { vehicleId: { in: vehicleIds } },
          select: { id: true, vehicleId: true },
        });

        const vehicleDbIds = vehicles.map((v) => v.id);

        // Supprimer les anciennes compatibilités
        await prisma.productVehicleCompatibility.deleteMany({
          where: { productId: dbProduct.id },
        });

        // Créer les nouvelles compatibilités
        // SQLite ne supporte pas skipDuplicates, on utilise createMany avec gestion d'erreur
        try {
          await prisma.productVehicleCompatibility.createMany({
            data: vehicleDbIds.map((vehicleDbId) => ({
              productId: dbProduct.id,
              vehicleId: vehicleDbId,
            })),
          });
        } catch (error: any) {
          // Si erreur de duplication, ignorer (SQLite ne supporte pas skipDuplicates)
          if (error.code !== 'P2002') {
            throw error;
          }
        }
        stats.compatibilities += vehicleDbIds.length;
      }

      // 6. Créer les images
      const images = parseJsonString(product.supabase?.images) || [];
      if (images.length > 0) {
        await prisma.productImage.deleteMany({
          where: { productId: dbProduct.id },
        });

        await prisma.productImage.createMany({
          data: images.map((img: any) => ({
            productId: dbProduct.id,
            imageUrl: img.url || null,
            imageFilename: img.filename || null,
          })),
        });
        stats.images += images.length;
      }
    } catch (error) {
      stats.errors++;
      console.error(`Erreur produit ${product.articleNo}:`, error);
    }
  }

  return stats;
}

async function importJSONL(filePath: string, batchSize = 100) {
  const fs = require('fs');
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(filePath)) {
    throw new Error(`Le fichier n'existe pas: ${filePath}`);
  }
  
  console.log('Connexion à la base de données...');
  await prisma.$connect();
  console.log('Connecté à la base de données\n');
  
  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const manufacturerMap = new Map<string, number>();
  const vehicleModelMap = new Map<number, number>();
  const vehicleMap = new Map<number, number>();

  let lineCount = 0;
  let batch: ProductData[] = [];
  const totalStats = {
    products: 0,
    manufacturers: 0,
    vehicleModels: 0,
    vehicles: 0,
    compatibilities: 0,
    specifications: 0,
    oemNumbers: 0,
    images: 0,
    errors: 0,
  };

  console.log(`Démarrage de l'importation depuis: ${filePath}`);
  console.log(`Taille du batch: ${batchSize}\n`);

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const product: ProductData = JSON.parse(line);
        batch.push(product);

        if (batch.length >= batchSize) {
          const stats = await processBatch(batch, manufacturerMap, vehicleModelMap, vehicleMap);
          Object.keys(totalStats).forEach((key) => {
            totalStats[key as keyof typeof totalStats] += stats[key as keyof typeof stats];
          });
          batch = [];
          console.log(`Traités: ${lineCount + 1} produits...`);
        }
      } catch (error) {
        console.error(`Erreur ligne ${lineCount + 1}:`, error);
      }
    }
    lineCount++;
  }

  // Traiter le dernier batch
  if (batch.length > 0) {
    const stats = await processBatch(batch, manufacturerMap, vehicleModelMap, vehicleMap);
    Object.keys(totalStats).forEach((key) => {
      totalStats[key as keyof typeof totalStats] += stats[key as keyof typeof stats];
    });
  }

  console.log('\n=== STATISTIQUES FINALES ===');
  console.log(`Produits: ${totalStats.products}`);
  console.log(`Constructeurs: ${totalStats.manufacturers}`);
  console.log(`Modèles: ${totalStats.vehicleModels}`);
  console.log(`Véhicules: ${totalStats.vehicles}`);
  console.log(`Compatibilités: ${totalStats.compatibilities}`);
  console.log(`Spécifications: ${totalStats.specifications}`);
  console.log(`Numéros OEM: ${totalStats.oemNumbers}`);
  console.log(`Images: ${totalStats.images}`);
  console.log(`Erreurs: ${totalStats.errors}`);
}

const filePath = process.argv[2] || 'C:\\Users\\yohan\\bricoauto\\merged_products.jsonl';
const batchSize = parseInt(process.argv[3]) || 100;

importJSONL(filePath, batchSize)
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.error);
  });

