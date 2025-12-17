import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getVehiclePageData } from './page-data';

interface Props {
  params: Promise<{
    locale: string;
    brand: string;
    group: string;
    model: string;
    vehicle: string;
  }>;
}

export default async function VehicleCompatibilityPage(props: Props) {
  const { locale, brand, group, model, vehicle } = await props.params;
  setRequestLocale(locale);

  const ctx = await getVehiclePageData({
    brand,
    group,
    model,
    vehicleSlug: vehicle,
  });

  if (!ctx) {
    return notFound();
  }

  const engineLabel = ctx.vehicle.typeEngineName || ctx.vehicle.engineSlug || '';
  const vehicleSlugForCategory = `${ctx.vehicle.vehicleId}${engineLabel ? `-${ctx.vehicle.engineSlug || ''}` : ''}`;

  const baseCategoryUrl = `/${locale}/pieces-detachees`;

  // Extraire le slug de catégorie depuis l'URL (ex: /pieces-detachees/moteur-1 -> moteur-1)
  const getCategorySlug = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/\/pieces-detachees\/(.+)-(\d+)$/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        Compatibilité — {ctx.manufacturer.name} {ctx.modelGroup.displayName} ({ctx.model.modelName})
      </h1>
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Informations techniques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start">
            <span className="text-sm font-medium text-gray-600 min-w-[120px]">Moteur :</span>
            <span className="text-sm text-gray-900">{engineLabel || 'Non spécifié'}</span>
          </div>
          {ctx.vehicle.constructionIntervalStart && (
            <div className="flex items-start">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Période :</span>
              <span className="text-sm text-gray-900">
                {ctx.vehicle.constructionIntervalStart.substring(0, 4)}
                {ctx.vehicle.constructionIntervalEnd
                  ? ` - ${ctx.vehicle.constructionIntervalEnd.substring(0, 4)}`
                  : ''}
              </span>
            </div>
          )}
          {ctx.vehicle.fuelType && (
            <div className="flex items-start">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Carburant :</span>
              <span className="text-sm text-gray-900 flex items-center gap-1">
                {ctx.vehicle.fuelType === 'Essence' && '⛽'}
                {ctx.vehicle.fuelType === 'Diesel' && '🛢️'}
                {ctx.vehicle.fuelType === 'Électrique' && '🔌'}
                {ctx.vehicle.fuelType === 'Hybride' && '🔋'}
                {ctx.vehicle.fuelType}
              </span>
            </div>
          )}
          {ctx.vehicle.bodyType && (
            <div className="flex items-start">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Carrosserie :</span>
              <span className="text-sm text-gray-900">{ctx.vehicle.bodyType}</span>
            </div>
          )}
          {ctx.vehicle.engineCodes && (
            <div className="flex items-start md:col-span-2">
              <span className="text-sm font-medium text-gray-600 min-w-[120px]">Codes moteur :</span>
              <span className="text-sm text-gray-900 font-mono">{ctx.vehicle.engineCodes}</span>
            </div>
          )}
        </div>
      </div>

      {ctx.categories.length > 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Catégories disponibles</h2>
          <p className="text-sm text-gray-600 mb-4">
            {ctx.categories.length} catégorie{ctx.categories.length > 1 ? 's' : ''} avec des produits compatibles :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {ctx.categories.map((category) => {
              const categorySlug = getCategorySlug(category.url);
              if (!categorySlug) return null;

              const categoryUrl = `${baseCategoryUrl}/${categorySlug}-1/${brand}/${group}/${model}/${vehicleSlugForCategory}`;
              const label = category.labelFr || category.label;

              return (
                <a
                  key={category.id}
                  href={categoryUrl}
                  className="block p-3 rounded-md border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                </a>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold">Aucune catégorie disponible</p>
          <p className="mt-1">
            Aucun produit compatible n'a été trouvé pour ce véhicule dans les catégories InterCars.
          </p>
        </div>
      )}
    </div>
  );
}

