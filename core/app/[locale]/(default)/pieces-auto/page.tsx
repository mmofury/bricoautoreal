import { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { db } from '~/lib/db';
import { VehicleBadgeLauncher } from '~/components/vehicle-badge/launcher';
import { removeVehicleContextFromUrl } from '~/lib/utils/vehicle-context';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  return {
    title: 'Toutes les marques de pièces auto | BricoAuto',
    description: 'Découvrez toutes les marques de véhicules pour lesquelles nous proposons des pièces de rechange. Renault, Peugeot, Citroën, BMW, Mercedes et bien plus.',
  };
}

export default async function PiecesAutoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Récupérer tous les manufacturers avec le nombre de véhicules
  const manufacturersWithCount = await db.$queryRaw<
    Array<{ id: number; name: string; vehicle_count: bigint }>
  >`
    SELECT 
      m.id,
      m.name,
      COUNT(DISTINCT v.id) as vehicle_count
    FROM manufacturers m
    LEFT JOIN vehicle_models vm ON m.id = vm.manufacturer_id
    LEFT JOIN vehicles v ON vm.id = v.model_id
    GROUP BY m.id, m.name
    ORDER BY vehicle_count DESC, m.name ASC
  `;

  const manufacturers = manufacturersWithCount.map((m) => ({
    id: m.id,
    name: m.name,
    vehicleCount: Number(m.vehicle_count),
  }));

  // Grouper par première lettre pour un affichage alphabétique
  const groupedByLetter = manufacturers.reduce((acc, manufacturer) => {
    const firstLetter = manufacturer.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(manufacturer);
    return acc;
  }, {} as Record<string, typeof manufacturers>);

  const letters = Object.keys(groupedByLetter).sort();

  const baseUrl = `/${locale}/pieces-auto`;
  const resetUrl = removeVehicleContextFromUrl(baseUrl);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
      {/* Bandeau compatibilité véhicule */}
      <div className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">
              Sélectionnez votre véhicule pour vérifier la compatibilité
            </p>
            <p className="text-sm text-[#475569]">
              Utilisez le garage pour filtrer les résultats de pièces par modèle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VehicleBadgeLauncher variant="default" />
            <Link
              href={resetUrl}
              className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#0f172a] hover:border-[#0077c7] hover:text-[#0077c7]"
            >
              Retirer le véhicule
            </Link>
          </div>
        </div>
      </div>

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#0f172a]">
          Toutes les marques de pièces auto
        </h1>
        <p className="text-gray-600 text-lg">
          Trouvez les pièces de rechange pour votre véhicule parmi {manufacturers.length} marques disponibles
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#dfe3e8] bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-[#0f172a]">{manufacturers.length}</div>
          <div className="text-sm text-[#637381]">Marques disponibles</div>
        </div>
        <div className="rounded-lg border border-[#dfe3e8] bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-[#0f172a]">
            {manufacturers.reduce((sum, m) => sum + m.vehicleCount, 0).toLocaleString()}
          </div>
          <div className="text-sm text-[#637381]">Véhicules compatibles</div>
        </div>
        <div className="rounded-lg border border-[#dfe3e8] bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-[#0f172a]">{letters.length}</div>
          <div className="text-sm text-[#637381]">Lettres</div>
        </div>
      </div>

      {/* Navigation rapide par lettre */}
      <div className="mb-6 flex flex-wrap gap-2">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="rounded-md border border-[#dfe3e8] bg-white px-3 py-1.5 text-sm font-medium text-[#0f172a] transition hover:border-[#0077c7] hover:text-[#0077c7]"
          >
            {letter}
          </a>
        ))}
      </div>

      {/* Liste des marques groupées par lettre */}
      <div className="space-y-8">
        {letters.map((letter) => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-8">
            <h2 className="mb-4 text-2xl font-bold text-[#0f172a] border-b border-[#dfe3e8] pb-2">
              {letter}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {groupedByLetter[letter].map((manufacturer) => (
                <Link
                  key={manufacturer.id}
                  href={`/${locale}/vehicule/${encodeURIComponent(manufacturer.name)}`}
                  className="group rounded-lg border border-[#dfe3e8] bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-[#0077c7] hover:shadow-md"
                >
                  <div className="mb-2 text-3xl">🚗</div>
                  <div className="font-semibold text-[#0f172a] group-hover:text-[#0077c7] transition">
                    {manufacturer.name}
                  </div>
                  {manufacturer.vehicleCount > 0 && (
                    <div className="mt-1 text-xs text-[#637381]">
                      {manufacturer.vehicleCount} {manufacturer.vehicleCount === 1 ? 'véhicule' : 'véhicules'}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

