import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '~/components/link';
import { VehicleCompatBanner } from '~/components/vehicle-compat-banner';
import { db } from '~/lib/db';

import { getAllInterCarsCategoriesByLevel } from '~/lib/db/intercars-queries';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return {
    title: 'Pièces détachées',
    description: 'Découvrez toutes nos catégories de pièces détachées automobiles',
  };
}

export default async function InterCarsIndexPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const categories = await getAllInterCarsCategoriesByLevel(1);

  // Récupérer les niveaux 2 groupés par niveau 1 pour la navigation
  const level2ByLevel1 = await db.$queryRaw<
    Array<{
      level1_id: string;
      level1_label: string | null;
      level1_label_fr: string | null;
      level2_id: string;
      level2_label: string | null;
      level2_label_fr: string | null;
      level2_url: string | null;
    }>
  >`
    SELECT DISTINCT
      level1_id,
      level1_label,
      level1_label_fr,
      level2_id,
      level2_label,
      level2_label_fr,
      level2_url
    FROM intercars_hierarchy
    WHERE level1_id IS NOT NULL AND level2_id IS NOT NULL
    ORDER BY level1_label_fr IS NULL, level1_label_fr, level1_label, level2_label_fr, level2_label
  `;

  const level1Groups = categories.map((c) => {
    const children = level2ByLevel1
      .filter((row) => row.level1_id === c.id)
      .map((row) => ({
        id: row.level2_id,
        label: row.level2_label_fr || row.level2_label || row.level2_id,
        url: row.level2_url || '#',
      }));
    return { ...c, children };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <VehicleCompatBanner locale={locale} />

      <h1 className="text-3xl font-bold mb-6">Pièces détachées</h1>
      <p className="text-gray-600 mb-8">
        Naviguez dans nos catégories de pièces détachées automobiles
      </p>

      {level1Groups.length === 0 ? (
        <p className="text-gray-500">Aucune catégorie disponible.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {level1Groups.map((category) => (
            <div
              key={category.id}
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all bg-white"
            >
              <details>
                <summary className="cursor-pointer select-none">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {category.labelFr || category.label}
                      </h2>
                      <p className="text-sm text-gray-500">{category.label}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {category.children.length} sous-catégorie
                      {category.children.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </summary>
                {category.children.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.url}
                          className="text-sm text-[#0f172a] hover:text-[#0077c7] underline-offset-2 hover:underline"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

