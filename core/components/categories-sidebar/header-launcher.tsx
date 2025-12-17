'use client';

import { useState } from 'react';
import { CategoriesSidebar } from './index';

interface Level2Category {
  id: string;
  label: string;
  labelFr: string | null;
  url: string | null;
  imageUrl?: string | null;
}

interface Level1Category {
  id: string;
  label: string;
  labelFr: string | null;
  url: string | null;
  children: Level2Category[];
}

interface CategoriesSidebarHeaderLauncherProps {
  categories: Level1Category[];
  locale: string;
}

export function CategoriesSidebarHeaderLauncher({ categories, locale }: CategoriesSidebarHeaderLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex flex-shrink-0 items-center gap-3 px-4 transition-colors hover:bg-gray-50"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.40039H16V4.00039H0V2.40039ZM0 7.20039H16V8.80039H0V7.20039ZM0 12.0004H16V13.6004H0V12.0004Z" fill="#666666"/>
        </svg>
        <span className="text-sm leading-[22px] text-[#666666]">Toutes les catégories</span>
        <div
          className="absolute right-0 top-[4.5px] h-[45px] w-px"
          style={{ borderRight: '1px solid #DADADA' }}
        />
      </button>

      <CategoriesSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        categories={categories}
        locale={locale}
      />
    </>
  );
}



