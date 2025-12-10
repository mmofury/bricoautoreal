import { cache } from 'react';

import { Prisma } from '@prisma/client';

import { db } from '~/lib/db';
import { getInterCarsCategoryByUrl, getProductsByInterCarsCategory } from '~/lib/db/intercars-queries';

type VehicleContext = {
  brandSlug: string;
  groupSlug: string;
  modelSlug: string;
  vehicleId: number;
  engineSlug?: string;
};

/**
 * Parse une URL InterCars pour extraire :
 * - slug + level (catégorie InterCars)
 * - et optionnellement un contexte véhicule (marque/groupe/modèle/vehicleSlug)
 *
 * Formats attendus :
 * - /pieces-detachees/slug-1
 * - /pieces-detachees/slug-1/{brand}/{group}/{model}/{vehicleId[-engineSlug]}
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseInterCarsUrl(
  slugSegments: string[],
): { slug: string; level: number; vehicle?: VehicleContext; supplierSlug?: string } | null {
  // Si on a au moins 5 segments, on considère les 4 derniers comme contexte véhicule
  let vehicle: VehicleContext | undefined;
  let categorySegments = [...slugSegments];
  let supplierSlug: string | undefined;

  // Gestion du suffixe /marque/<supplier>
  if (categorySegments.length >= 2) {
    const maybeBrand = categorySegments.slice(-2);
    if (maybeBrand[0] === 'marque') {
      supplierSlug = maybeBrand[1];
      categorySegments = categorySegments.slice(0, categorySegments.length - 2);
    }
  }

  if (slugSegments.length >= 5) {
    const vehicleSegments = slugSegments.slice(-4);
    categorySegments = slugSegments.slice(0, slugSegments.length - 4);

    const [brandSlug, groupSlug, modelSlug, vehicleSlug] = vehicleSegments;
    const matchVehicle = vehicleSlug.match(/^([0-9]+)(?:-(.+))?$/);
    if (matchVehicle) {
      vehicle = {
        brandSlug,
        groupSlug,
        modelSlug,
        vehicleId: parseInt(matchVehicle[1], 10),
        engineSlug: matchVehicle[2],
      };
    }
  }

  // Rejoindre les segments de catégorie
  const fullSlug = categorySegments.join('/');
  
  // Debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[InterCars] Parsing URL segments:', slugSegments);
    console.log('[InterCars] Category slug:', fullSlug);
    console.log('[InterCars] Vehicle context:', vehicle);
  }
  
  // Chercher le pattern -[1-4] à la fin
  const match = fullSlug.match(/^(.+)-([1-4])$/);
  
  if (!match) {
    return null;
  }

  const [, slug, levelStr] = match;
  const level = parseInt(levelStr, 10);

  if (isNaN(level) || level < 1 || level > 4) {
    return null;
  }

  return { slug, level, vehicle, supplierSlug };
}

export const getInterCarsPageData = cache(
  async (slugSegments: string[], page: number = 1, pageSize: number = 50) => {
    const parsed = parseInterCarsUrl(slugSegments);

    if (!parsed) {
      return {
        categoryInfo: null,
        products: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        vehicle: null,
      };
    }

    const { slug, level, vehicle, supplierSlug } = parsed;

    // Résoudre le supplierSlug vers un supplierName exact (pour filtrage)
    let supplierName: string | undefined;
    if (supplierSlug) {
      const suppliersLogos = await db.supplierLogo.findMany({
        select: { supplierName: true },
      });
      const suppliersProducts = await db.$queryRaw<Array<{ supplier_name: string }>>`
        SELECT DISTINCT supplier_name
        FROM products
        WHERE supplier_name IS NOT NULL AND supplier_name != ''
      `;

      const allSuppliers = [
        ...suppliersLogos.map((s) => s.supplierName),
        ...suppliersProducts.map((s) => s.supplier_name),
      ];

      supplierName = allSuppliers.find((name) => slugify(name) === supplierSlug);
    }

    // Récupérer la catégorie (avec filtre véhicule pour les catégories enfants)
    const categoryData = await getInterCarsCategoryByUrl(slug, level, vehicle?.vehicleId);

    if (!categoryData) {
      return {
        categoryInfo: null,
        products: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        vehicle: null,
      };
    }

    // Récupérer les produits avec pagination
    const offset = (page - 1) * pageSize;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[InterCars] Fetching products with vehicleId:', vehicle?.vehicleId);
    }
    
    const { products, totalCount } = await getProductsByInterCarsCategory(slug, level, {
      limit: pageSize,
      offset,
      vehicleId: vehicle?.vehicleId,
      supplierName,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[InterCars] Products found:', totalCount);
    }

    // Récupérer les autres marques disponibles pour cette catégorie (et véhicule le cas échéant)
    const suppliersForCategory = await db.$queryRaw<
      Array<{ supplier_name: string; product_count: bigint }>
    >(Prisma.sql`
      SELECT p.supplier_name, COUNT(*) AS product_count
      FROM products p
      JOIN product_intercars_categories pic ON pic.product_id = p.id
      JOIN intercars_categories icc ON icc.id = pic.intercars_category_id
      JOIN intercars_hierarchy h ON h.id = icc.hierarchy_id
      WHERE p.supplier_name IS NOT NULL AND p.supplier_name != ''
        AND ${
          level === 1
            ? Prisma.sql`h.level1_id = ${categoryData.categoryInfo.id}`
            : level === 2
              ? Prisma.sql`h.level2_id = ${categoryData.categoryInfo.id}`
              : level === 3
                ? Prisma.sql`h.level3_id = ${categoryData.categoryInfo.id}`
                : Prisma.sql`h.level4_id = ${categoryData.categoryInfo.id}`
        }
        ${vehicle?.vehicleId ? Prisma.sql`AND p.id IN (
            SELECT pc.product_id
            FROM product_compatibilities pc
            WHERE pc.vehicle_id = ${vehicle.vehicleId}
          )` : Prisma.empty}
    GROUP BY p.supplier_name
    ORDER BY product_count DESC
    `);

    const supplierNamesDistinct = Array.from(
      new Set(suppliersForCategory.map((s) => s.supplier_name)),
    );

    const supplierLogos = supplierNamesDistinct.length
      ? await db.$queryRaw<Array<{ supplier_name: string; filename: string | null; logo_url: string | null }>>(
          Prisma.sql`
            SELECT supplier_name, filename, logo_url
            FROM supplier_logos
            WHERE LOWER(supplier_name) IN (${Prisma.join(
              supplierNamesDistinct.map((n) => n.toLowerCase()),
            )})
          `,
        )
      : [];

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      categoryInfo: categoryData.categoryInfo,
      hierarchy: categoryData.hierarchy,
      products,
      totalCount,
      page,
      pageSize,
      totalPages,
      vehicle: vehicle || null,
      supplierName: supplierName || null,
      suppliersForCategory,
      supplierLogos,
      level,
    };
  },
);


