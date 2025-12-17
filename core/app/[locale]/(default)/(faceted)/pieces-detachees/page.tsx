import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { unstable_cache } from 'next/cache';

import { Link } from '~/components/link';
import { CategoriesSidebar } from '~/components/categories-page/categories-sidebar';
import { CategoryCard } from '~/components/categories-page/category-card';
import { getAllInterCarsCategoriesByLevel } from '~/lib/db/intercars-queries';

// Force dynamic rendering to prevent streaming issues
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return {
    title: 'Pièces détachées automobiles - Toutes catégories',
    description:
      'Des millions de pièces auto en ligne de grandes marques telles que BOSCH, BREMBO, ATE, DENSO, MANN-FILTER, MONROE, LEMFÖRDER, FEBI BILSTEIN, LESJÖFORS, SKF, MEYLE.',
  };
}

// Cache the categories query with Next.js unstable_cache
const getCachedCategories = unstable_cache(
  async () => getAllInterCarsCategoriesByLevel(1, 50),
  ['pieces-detachees-categories'],
  {
    revalidate: 3600, // Revalidate every hour
    tags: ['categories'],
  }
);

export default async function PiecesDetacheesPage(props: Props) {
  const startTime = performance.now();
  console.log('[PERF] PiecesDetacheesPage - Start');

  const { locale } = await props.params;
  console.log(`[PERF] Page params: locale=${locale}`);
  setRequestLocale(locale);

  console.log('[PERF] Fetching categories...');
  const categoriesStart = performance.now();
  const categories = await getCachedCategories();
  const categoriesEnd = performance.now();
  console.log(`[PERF] Categories fetched in ${categoriesEnd - categoriesStart}ms - Count: ${categories.length}`);

  // Determine image size for specific categories
  const getImageSize = (label: string): 'large' | 'small' => {
    const smallImageCategories = ['Éclairage', 'Huiles & liquides'];
    return smallImageCategories.includes(label) ? 'small' : 'large';
  };

  const renderStart = performance.now();
  console.log(`[PERF] Total page load time: ${renderStart - startTime}ms`);

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-screen-xl px-[15px] py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={`/${locale}`}
            className="text-[#637381] text-[13px] font-normal leading-[20px] hover:text-[#212B36] transition-colors"
            style={{ fontFamily: 'Inter' }}
          >
            Accueil
          </Link>
          <ChevronRight className="text-[#637381]" size={16} strokeWidth={1.5} />
          <span
            className="text-[#637381] text-[13px] font-normal leading-[20px]"
            style={{ fontFamily: 'Inter' }}
          >
            Pièces auto
          </span>
        </div>

        {/* SEO Description */}
        <div className="mb-8">
          <p
            className="text-[#212B36] text-[13px] font-normal leading-[18px]"
            style={{ fontFamily: 'Inter' }}
          >
            Des millions de pièces auto en ligne de grandes marques telles que BOSCH, BREMBO, ATE,
            DENSO, MANN-FILTER, MONROE, LEMFÖRDER, FEBI BILSTEIN, LESJÖFORS, SKF, MEYLE. Achetez
            des pièces de freinage
            <br />
            en ligne telles que des disques de frein, des plaquettes de frein et des étriers de
            frein. Livraison rapide et prix compétitifs pour les huiles moteur, les filtres à
            huile, les filtres à air, les filtres à carburant, les pièces de
            <br />
            suspension, y compris les ressorts hélicoïdaux et les amortisseurs, les pièces de
            moteur, les pièces de direction et d'échappement, et d'autres pièces détachées pour
            votre voiture. En cas de questions, n'hésitez pas
            <br />à contacter nos experts.
          </p>
        </div>

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex gap-[34px]">
          <div className="flex-shrink-0">
            <CategoriesSidebar categories={categories} locale={locale} />
          </div>

          {/* Right Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-4 gap-x-[16px] gap-y-[16px]">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  label={category.label}
                  labelFr={category.labelFr}
                  url={category.url}
                  locale={locale}
                  imageSize={getImageSize(category.labelFr || category.label)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
