/**
 * Utilitaires pour gérer le contexte véhicule dans les URLs
 */

export type VehicleContext = {
  brandSlug: string;
  groupSlug: string;
  modelSlug: string;
  vehicleId: number;
  engineSlug?: string;
};

/**
 * Parse le contexte véhicule depuis les segments d'URL
 * Format attendu: [brand, group, model, vehicleId[-engineSlug]]
 */
export function parseVehicleContextFromUrl(segments: string[]): VehicleContext | null {
  if (segments.length < 4) {
    return null;
  }

  // Les 4 derniers segments devraient être le contexte véhicule
  const vehicleSegments = segments.slice(-4);
  const [brandSlug, groupSlug, modelSlug, vehicleSlug] = vehicleSegments;

  // Parser vehicleSlug: "3043-1300-was21011" -> vehicleId: 3043, engineSlug: "1300-was21011"
  const match = vehicleSlug.match(/^([0-9]+)(?:-(.+))?$/);
  if (!match) {
    return null;
  }

  const vehicleId = parseInt(match[1], 10);
  if (Number.isNaN(vehicleId)) {
    return null;
  }

  return {
    brandSlug,
    groupSlug,
    modelSlug,
    vehicleId,
    engineSlug: match[2],
  };
}

/**
 * Extrait le contexte véhicule depuis une URL complète
 */
export function extractVehicleContextFromUrl(url: string): VehicleContext | null {
  const segments = url.split('/').filter(Boolean);
  return parseVehicleContextFromUrl(segments);
}

/**
 * Construit le suffixe URL pour le contexte véhicule
 */
export function buildVehicleUrlSuffix(context: VehicleContext): string {
  const vehicleSlug = `${context.vehicleId}${context.engineSlug ? `-${context.engineSlug}` : ''}`;
  return `${context.brandSlug}/${context.groupSlug}/${context.modelSlug}/${vehicleSlug}`;
}

/**
 * Ajoute ou préserve le contexte véhicule dans une URL de catégorie InterCars
 * 
 * @param categoryUrl - URL de la catégorie (ex: /pieces-detachees/moteur-1)
 * @param vehicleContext - Contexte véhicule optionnel à préserver
 * @returns URL avec le contexte véhicule si fourni
 */
export function preserveVehicleContextInCategoryUrl(
  categoryUrl: string,
  vehicleContext: VehicleContext | null
): string {
  if (!vehicleContext) {
    return categoryUrl;
  }

  // Si l'URL contient déjà le contexte véhicule, on la retourne telle quelle
  const existingContext = extractVehicleContextFromUrl(categoryUrl);
  if (existingContext && existingContext.vehicleId === vehicleContext.vehicleId) {
    return categoryUrl;
  }

  // Sinon, on ajoute le contexte véhicule
  const vehicleSuffix = buildVehicleUrlSuffix(vehicleContext);
  return `${categoryUrl}/${vehicleSuffix}`;
}

/**
 * Retire le contexte véhicule d'une URL si présent
 */
export function removeVehicleContextFromUrl(url: string): string {
  const segments = url.split('/').filter(Boolean);
  const context = parseVehicleContextFromUrl(segments);
  
  if (!context) {
    return url;
  }

  // Retirer les 4 derniers segments (contexte véhicule)
  const categorySegments = segments.slice(0, segments.length - 4);
  return '/' + categorySegments.join('/');
}







