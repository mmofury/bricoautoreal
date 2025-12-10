import { cache } from 'react';
import { db } from '~/lib/db';
import { getInterCarsCategoriesForVehicle } from '~/lib/db/intercars-queries';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export type VehiclePageContext = {
  manufacturer: { id: number; name: string; slug: string };
  modelGroup: { id: number; groupKey: string; displayName: string; slug: string };
  model: { id: number; modelId: number; modelName: string; slug: string };
  vehicle: {
    id: number;
    vehicleId: number;
    typeEngineName: string | null;
    constructionIntervalStart: string | null;
    constructionIntervalEnd: string | null;
    fuelType: string | null;
    bodyType: string | null;
    engineCodes: string | null;
    engId: number | null;
    engineSlug: string | null;
  };
  categories: Array<{
    id: string;
    label: string;
    labelFr: string | null;
    url: string | null;
  }>;
};

async function findModelGroupForSlug(
  modelGroups: Array<{ modelGroup: { id: number; groupKey: string; displayName: string } }>,
  slug: string,
) {
  for (const mg of modelGroups) {
    const g = mg.modelGroup;
    const candidate = slugify(g.groupKey || g.displayName);
    if (candidate === slug) {
      return g;
    }
  }
  return null;
}

export const getVehiclePageData = cache(
  async (params: { brand: string; group: string; model: string; vehicleSlug: string }): Promise<VehiclePageContext | null> => {
    // Parse vehicleSlug -> vehicleId + engineSlug éventuelle
    const match = params.vehicleSlug.match(/^([0-9]+)(?:-(.+))?$/);
    if (!match) return null;
    const vehicleId = parseInt(match[1], 10);
    if (Number.isNaN(vehicleId)) return null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[VehiclePage] params:', params);
      console.log('[VehiclePage] vehicleId:', vehicleId);
    }

    const vehicle = await db.vehicle.findUnique({
      where: { vehicleId },
      include: {
        model: {
          include: {
            manufacturer: true,
            modelGroups: {
              include: { modelGroup: true },
            },
          },
        },
      },
    });

    if (!vehicle || !vehicle.model || !vehicle.model.manufacturer) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[VehiclePage] vehicle not found or missing relations');
      }
      return null;
    }

    const manufacturerSlug = slugify(vehicle.model.manufacturer.name);
    if (manufacturerSlug !== params.brand) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[VehiclePage] manufacturer slug mismatch', { manufacturerSlug, brandParam: params.brand });
      }
      return null;
    }

    const group = await findModelGroupForSlug(vehicle.model.modelGroups, params.group);
    if (!group) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[VehiclePage] model group not found for slug', params.group);
      }
      return null;
    }

    const modelSlug = slugify(vehicle.model.modelName);
    if (modelSlug !== params.model) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[VehiclePage] model slug mismatch', { modelSlug, modelParam: params.model });
      }
      return null;
    }

    const engineSlug = vehicle.typeEngineName ? slugify(vehicle.typeEngineName) : null;

    // Récupérer les catégories disponibles pour ce véhicule
    const categories = await getInterCarsCategoriesForVehicle(vehicleId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[VehiclePage] resolved ctx', {
        manufacturerSlug,
        groupSlug: slugify(group.groupKey || group.displayName),
        modelSlug,
        engineSlug,
        categoriesCount: categories.length,
      });
    }

    return {
      manufacturer: {
        id: vehicle.model.manufacturer.id,
        name: vehicle.model.manufacturer.name,
        slug: manufacturerSlug,
      },
      modelGroup: {
        id: group.id,
        groupKey: group.groupKey,
        displayName: group.displayName,
        slug: slugify(group.groupKey || group.displayName),
      },
      model: {
        id: vehicle.model.id,
        modelId: vehicle.model.modelId,
        modelName: vehicle.model.modelName,
        slug: modelSlug,
      },
      vehicle: {
        id: vehicle.id,
        vehicleId: vehicle.vehicleId,
        typeEngineName: vehicle.typeEngineName,
        constructionIntervalStart: vehicle.constructionIntervalStart,
        constructionIntervalEnd: vehicle.constructionIntervalEnd,
        fuelType: vehicle.fuelType ?? null,
        bodyType: vehicle.bodyType ?? null,
        engineCodes: vehicle.engineCodes ?? null,
        engId: (vehicle as any).engId ?? null, // champ si présent
        engineSlug,
      },
      categories,
    };
  },
);

