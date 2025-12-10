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

interface CategoriesSidebarLauncherProps {
  categories: Level1Category[];
  locale: string;
}

export function CategoriesSidebarLauncher({ categories, locale }: CategoriesSidebarLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full bg-[#3a414c] px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-[#4b5563] transition hover:bg-[#4a5563]"
      >
        <svg aria-hidden viewBox="0 0 22 22" className="h-5 w-5 text-white">
          <path d="M3.667 11H18.333M3.667 5.5H18.333M3.667 16.5H18.333" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-semibold">Toutes les catégories</span>
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

