import { Menu } from 'lucide-react';
import Link from 'next/link';

interface Category {
  name: string;
  href: string;
  isSpecial?: boolean;
}

interface CategoriesNavigationProps {
  categories: Category[];
}

export function CategoriesNavigation({ categories }: CategoriesNavigationProps) {
  return (
    <nav
      className="relative bg-transparent"
      style={{ boxShadow: '0px 4px 8px rgba(55, 55, 55, 0.16)' }}
    >
      <div className="container mx-auto">
        <div className="flex h-[54px] items-stretch overflow-x-auto">
          {/* Bouton "Toutes les catégories" avec icône */}
          <Link
            className="relative flex flex-shrink-0 items-center gap-3 bg-white px-4 transition-colors hover:bg-gray-50"
            href="/pieces-detachees"
          >
            <Menu className="h-4 w-4 text-[#666666]" />
            <span className="text-sm leading-[22px] text-[#666666]">Toutes les catégories</span>
            <div
              className="absolute right-0 top-[4.5px] h-[45px] w-px"
              style={{ borderRight: '1px solid #DADADA' }}
            />
          </Link>

          {/* Liste des catégories */}
          {categories.map((category, index) => (
            <Link
              key={index}
              className="relative flex flex-shrink-0 items-center bg-white px-3 transition-colors hover:bg-gray-50"
              href={category.href}
            >
              <span
                className={`text-sm leading-[22px] ${
                  category.isSpecial
                    ? 'font-bold text-[#CC0033]'
                    : 'font-normal text-[#666666]'
                }`}
              >
                {category.name}
              </span>
              <div
                className="absolute right-0 top-[4.5px] h-[45px] w-px"
                style={{ borderRight: '1px solid #DADADA' }}
              />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

import Link from 'next/link';

interface Category {
  name: string;
  href: string;
  isSpecial?: boolean;
}

interface CategoriesNavigationProps {
  categories: Category[];
}

export function CategoriesNavigation({ categories }: CategoriesNavigationProps) {
  return (
    <nav
      className="relative bg-transparent"
      style={{ boxShadow: '0px 4px 8px rgba(55, 55, 55, 0.16)' }}
    >
      <div className="container mx-auto">
        <div className="flex h-[54px] items-stretch overflow-x-auto">
          {/* Bouton "Toutes les catégories" avec icône */}
          <Link
            className="relative flex flex-shrink-0 items-center gap-3 bg-white px-4 transition-colors hover:bg-gray-50"
            href="/pieces-detachees"
          >
            <Menu className="h-4 w-4 text-[#666666]" />
            <span className="text-sm leading-[22px] text-[#666666]">Toutes les catégories</span>
            <div
              className="absolute right-0 top-[4.5px] h-[45px] w-px"
              style={{ borderRight: '1px solid #DADADA' }}
            />
          </Link>

          {/* Liste des catégories */}
          {categories.map((category, index) => (
            <Link
              key={index}
              className="relative flex flex-shrink-0 items-center bg-white px-3 transition-colors hover:bg-gray-50"
              href={category.href}
            >
              <span
                className={`text-sm leading-[22px] ${
                  category.isSpecial
                    ? 'font-bold text-[#CC0033]'
                    : 'font-normal text-[#666666]'
                }`}
              >
                {category.name}
              </span>
              <div
                className="absolute right-0 top-[4.5px] h-[45px] w-px"
                style={{ borderRight: '1px solid #DADADA' }}
              />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}



