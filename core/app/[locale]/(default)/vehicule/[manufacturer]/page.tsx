import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { VehicleSelector } from '~/components/vehicle-selector';
import { db } from '~/lib/db';
import { getModelsByManufacturer } from '~/lib/db/queries';

interface Props {
  params: Promise<{ manufacturer: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { manufacturer } = await params;
  const decodedManufacturer = decodeURIComponent(manufacturer);

  return {
    title: `Pièces de rechange pour ${decodedManufacturer} | BricoAuto`,
    description: `Trouvez toutes les pièces de rechange compatibles avec les véhicules ${decodedManufacturer}. Large sélection de pièces auto de qualité.`,
  };
}

export default async function ManufacturerPage({ params }: Props) {
  const { manufacturer, locale } = await params;
  setRequestLocale(locale);

  const decodedManufacturer = decodeURIComponent(manufacturer);

  // Vérifier que le constructeur existe
  const manufacturerRecord = await db.manufacturer.findFirst({
    where: {
      name: {
        contains: decodedManufacturer,
      },
    },
  });

  if (!manufacturerRecord) {
    return notFound();
  }

  // Récupérer les modèles
  const models = await getModelsByManufacturer(decodedManufacturer);

  // Récupérer les catégories populaires (à adapter selon vos besoins)
  const popularCategories = [
    { name: 'Moteur', icon: '🔧', slug: 'moteur' },
    { name: 'Freins', icon: '🛑', slug: 'freins' },
    { name: 'Filtres', icon: '🔍', slug: 'filtres' },
    { name: 'Suspension', icon: '⚙️', slug: 'suspension' },
    { name: 'Éclairage', icon: '💡', slug: 'eclairage' },
    { name: 'Échappement', icon: '💨', slug: 'echappement' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Pièces de rechange pour {decodedManufacturer}
        </h1>
        <p className="text-gray-600">
          Sélectionnez votre {decodedManufacturer} pour trouver les pièces compatibles
        </p>
      </div>

      {/* Sélecteur de véhicule */}
      <VehicleSelector initialManufacturer={decodedManufacturer} />

      {/* Modèles populaires */}
      {models.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Modèles populaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {models.slice(0, 12).map((model) => (
              <a
                key={model.id}
                href={`/vehicule/${encodeURIComponent(decodedManufacturer)}/${encodeURIComponent(model.modelName)}`}
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
              >
                <div className="text-4xl mb-2">🚗</div>
                <div className="font-medium text-sm">{model.modelName}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Catégories de pièces */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Catégories de pièces de rechange</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4">
          {popularCategories.map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}?manufacturer=${encodeURIComponent(decodedManufacturer)}`}
              className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <div className="text-xs font-medium">{category.name}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Liste des modèles */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Tous les modèles {decodedManufacturer}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <a
              key={model.id}
              href={`/vehicule/${encodeURIComponent(decodedManufacturer)}/${encodeURIComponent(model.modelName)}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-blue-600"
            >
              <h3 className="text-xl font-semibold mb-2">{model.modelName}</h3>
              <p className="text-gray-600 text-sm">
                Voir les versions et produits compatibles
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

