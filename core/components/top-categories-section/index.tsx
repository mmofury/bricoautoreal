import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Category {
  name: string;
  imageUrl: string;
  href: string;
}

interface TopCategoriesSectionProps {
  categories: Category[];
  locale?: string;
}

export function TopCategoriesSection({ categories, locale = 'fr' }: TopCategoriesSectionProps) {
  return (
    <section className="py-12">
      {/* Titre avec ligne décorative */}
      <div className="mb-8">
        <h2 className="mb-4 text-4xl">
          <span className="font-extrabold text-gray-700">TOP </span>
          <span className="font-light text-gray-700">CATEGORIES</span>
        </h2>
        <div className="flex items-center gap-0">
          <div className="h-1 w-28 rounded bg-[#FFDC4D]" />
          <div className="h-1 flex-1 rounded bg-gray-300" />
        </div>
      </div>

      {/* Grille de catégories avec fond gris */}
      <div className="rounded-lg bg-gray-100 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              key={index}
              className="group flex flex-col items-center rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
              href={category.href}
              style={{ clipPath: 'polygon(0 40px, 40px 0, 100% 0, 100% 100%, 0 100%)' }}
            >
              <div className="relative mb-4 h-32 w-32">
                <Image
                  alt={category.name}
                  className="object-contain transition-transform group-hover:scale-110"
                  width={128}
                  height={128}
                  src={category.imageUrl}
                />
              </div>
              <h3 className="text-center text-xl font-extrabold text-gray-700">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Lien "Voir plus" */}
      <div className="mt-8 flex justify-center">
        <Link
          href={`/${locale}/pieces-detachees`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFDC4D] px-6 py-3 text-lg font-bold text-gray-900 transition-all hover:bg-[#FFD633] hover:shadow-md"
        >
          <span>Voir plus</span>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
