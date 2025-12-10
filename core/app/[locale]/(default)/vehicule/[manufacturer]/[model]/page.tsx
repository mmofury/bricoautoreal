import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { VehicleSelector } from '~/components/vehicle-selector';
import { db } from '~/lib/db';
import { getVehiclesByModel } from '~/lib/db/queries';

interface Props {
  params: Promise<{ manufacturer: string; model: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { manufacturer, model } = await params;
  const decodedManufacturer = decodeURIComponent(manufacturer);
  const decodedModel = decodeURIComponent(model);

  return {
    title: `Pièces de rechange pour ${decodedManufacturer} ${decodedModel} | BricoAuto`,
    description: `Trouvez toutes les pièces de rechange compatibles avec ${decodedManufacturer} ${decodedModel}.`,
  };
}

export default async function ModelPage({ params }: Props) {
  const { manufacturer, model, locale } = await params;
  setRequestLocale(locale);

  const decodedManufacturer = decodeURIComponent(manufacturer);
  const decodedModel = decodeURIComponent(model);

  // Vérifier que le modèle existe
  const modelRecord = await db.vehicleModel.findFirst({
    where: {
      modelName: {
        contains: decodedModel,
      },
      manufacturer: {
        name: {
          contains: decodedManufacturer,
        },
      },
    },
    include: {
      manufacturer: true,
    },
  });

  if (!modelRecord) {
    return notFound();
  }

  // Récupérer les véhicules (versions) de ce modèle
  const vehicles = await getVehiclesByModel(decodedModel);

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
        <span className="text-gray-900">{decodedModel}</span>
      </nav>

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {decodedManufacturer} {decodedModel}
        </h1>
        <p className="text-gray-600">
          Sélectionnez la version de votre véhicule pour trouver les pièces compatibles
        </p>
      </div>

      {/* Sélecteur de véhicule */}
      <VehicleSelector
        initialManufacturer={decodedManufacturer}
        initialModel={decodedModel}
      />

      {/* Liste des versions */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Versions disponibles</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type de moteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période de construction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.slice(0, 50).map((vehicle) => {
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
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.typeEngineName || 'Non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{period}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`/vehicule/${encodeURIComponent(decodedManufacturer)}/${encodeURIComponent(decodedModel)}/${vehicle.vehicleId}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Voir les produits →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

