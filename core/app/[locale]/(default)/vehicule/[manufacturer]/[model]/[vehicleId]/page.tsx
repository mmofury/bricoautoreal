import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { db } from '~/lib/db';
import { getProductsByVehicle } from '~/lib/db/queries';

interface Props {
  params: Promise<{ manufacturer: string; model: string; vehicleId: string; locale: string }>;
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { manufacturer, model, vehicleId } = await params;
  const decodedManufacturer = decodeURIComponent(manufacturer);
  const decodedModel = decodeURIComponent(model);

  return {
    title: `Pièces de rechange pour ${decodedManufacturer} ${decodedModel} | BricoAuto`,
    description: `Trouvez toutes les pièces de rechange compatibles avec votre ${decodedManufacturer} ${decodedModel}.`,
  };
}

export default async function VehicleProductsPage({ params, searchParams }: Props) {
  const { manufacturer, model, vehicleId, locale } = await params;
  const searchParamsResolved = await searchParams;
  setRequestLocale(locale);

  const decodedManufacturer = decodeURIComponent(manufacturer);
  const decodedModel = decodeURIComponent(model);
  const vehicleIdNum = parseInt(vehicleId);

  if (isNaN(vehicleIdNum)) {
    return notFound();
  }

  // Récupérer les informations du véhicule
  const vehicle = await db.vehicle.findFirst({
    where: {
      vehicleId: vehicleIdNum,
    },
    include: {
      model: {
        include: {
          manufacturer: true,
        },
      },
    },
  });

  if (!vehicle) {
    return notFound();
  }

  // Récupérer les produits compatibles
  const products = await getProductsByVehicle(vehicleIdNum);

  // Catégories populaires
  const popularCategories = [
    { name: 'Moteur', slug: 'moteur' },
    { name: 'Freins', slug: 'freins' },
    { name: 'Filtres', slug: 'filtres' },
    { name: 'Suspension', slug: 'suspension' },
    { name: 'Éclairage', slug: 'eclairage' },
  ];

  // Les dates sont stockées comme strings dans SQLite
  const startDate = vehicle.constructionIntervalStart;
  const endDate = vehicle.constructionIntervalEnd;
  const startYear = startDate ? startDate.split('-')[0] : null;
  const endYear = endDate ? endDate.split('-')[0] : null;
  const period =
    startYear && endYear
      ? `${startYear} - ${endYear}`
      : startYear
        ? `Depuis ${startYear}`
        : 'Non spécifié';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <a href="/" className="hover:text-blue-600">
          Accueil
        </a>
        {' > '}
        <a
          href={`/vehicule/${encodeURIComponent(decodedManufacturer)}`}
          className="hover:text-blue-600"
        >
          {decodedManufacturer}
        </a>
        {' > '}
        <a
          href={`/vehicule/${encodeURIComponent(decodedManufacturer)}/${encodeURIComponent(decodedModel)}`}
          className="hover:text-blue-600"
        >
          {decodedModel}
        </a>
        {' > '}
        <span className="text-gray-900">Versions</span>
      </nav>

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {decodedManufacturer} {decodedModel}
        </h1>
        <div className="text-gray-600 space-y-1">
          <p>
            <strong>Moteur:</strong> {vehicle.typeEngineName || 'Non spécifié'}
          </p>
          <p>
            <strong>Période:</strong> {period}
          </p>
          <p>
            <strong>{products.length}</strong> produits compatibles disponibles
          </p>
        </div>
      </div>

      {/* Catégories rapides */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Catégories populaires</h2>
        <div className="flex flex-wrap gap-2">
          {popularCategories.map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}?vehicleId=${vehicleIdNum}`}
              className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {category.name}
            </a>
          ))}
        </div>
      </div>

      {/* Filtres et tri */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm font-medium mr-2">Trier par:</label>
          <select className="p-2 border rounded">
            <option>Pertinence</option>
            <option>Prix croissant</option>
            <option>Prix décroissant</option>
            <option>Nom A-Z</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {products.length} produit{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
          >
            {/* Image produit */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0].imageUrl || ''}
                  alt={product.productName || ''}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-4xl">🚗</div>
              )}
            </div>

            {/* Badge Compatible */}
            <div className="px-4 pt-2">
              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                ✓ Compatible
              </span>
            </div>

            {/* Informations produit */}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {product.productName || product.articleNo}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Réf: {product.articleNo}
              </p>
              {product.supplierName && (
                <p className="text-xs text-gray-500 mb-3">
                  {product.supplierName}
                </p>
              )}

              {/* Numéros OEM */}
              {product.oemNumbers && product.oemNumbers.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">OEM:</p>
                  <div className="flex flex-wrap gap-1">
                    {product.oemNumbers.slice(0, 2).map((oem) => (
                      <span
                        key={oem.id}
                        className="text-xs bg-gray-100 px-2 py-1 rounded"
                      >
                        {oem.oemBrand} {oem.oemDisplayNo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lien vers BigCommerce si disponible */}
              {product.bigcommerceProductId ? (
                <a
                  href={`/product/${product.bigcommerceProductId}`}
                  className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Voir le produit
                </a>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  Produit non disponible
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (à implémenter si nécessaire) */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            Aucun produit compatible trouvé pour ce véhicule.
          </p>
        </div>
      )}
    </div>
  );
}

