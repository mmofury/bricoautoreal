'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

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

interface CategoriesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Level1Category[];
  locale: string;
}

export function CategoriesSidebar({ isOpen, onClose, categories, locale }: CategoriesSidebarProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Empêcher le scroll du body quand la sidebar est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const hoveredCategoryData = hoveredCategory
    ? categories.find((cat) => cat.id === hoveredCategory)
    : null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel niveau 1 */}
        <div className="w-80 bg-white shadow-xl overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-4 py-4">
            <h2 className="text-lg font-bold text-[#0f172a]">Toutes les catégories</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#0f172a]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="py-2">
            {categories.map((category) => (
              <div
                key={category.id}
                onMouseEnter={() => setHoveredCategory(category.id)}
                className="relative"
              >
                <Link
                  href={`/${locale}${category.url || '#'}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition ${
                    hoveredCategory === category.id
                      ? 'bg-[#f3f4f6] text-[#0077c7]'
                      : 'text-[#0f172a] hover:bg-[#f9fafb]'
                  }`}
                >
                  <span>{category.labelFr || category.label}</span>
                  <svg
                    className="h-4 w-4 text-[#9ca3af]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            ))}
          </nav>
        </div>

        {/* Panel niveau 2 (affiché au survol) */}
        {hoveredCategoryData && hoveredCategoryData.children.length > 0 && (
          <div
            className="w-96 bg-white shadow-xl overflow-y-auto border-l border-[#e5e7eb] animate-in slide-in-from-left-4 duration-200"
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white px-4 py-4">
              <h3 className="text-base font-semibold text-[#0f172a]">
                {hoveredCategoryData.labelFr || hoveredCategoryData.label}
              </h3>
            </div>

            <nav className="py-2">
              {hoveredCategoryData.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/${locale}${child.url || '#'}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#374151] transition hover:bg-[#f9fafb] hover:text-[#0077c7]"
                >
                  {child.imageUrl && (
                    <img
                      src={child.imageUrl}
                      alt={child.labelFr || child.label}
                      className="h-10 w-10 flex-shrink-0 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span>{child.labelFr || child.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </>
  );
}

