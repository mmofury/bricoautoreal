'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const placeholder135 = 'https://placehold.co/135x90';

type Level2 = {
  id: string;
  label: string;
  labelFr?: string | null;
  url?: string | null;
  imageUrl?: string | null;
};

type Level1Tab = {
  id: string;
  label: string;
  labelFr?: string | null;
  url?: string | null;
  children: Level2[];
};

interface PopularCategoriesTabsProps {
  locale: string;
  tabs: Level1Tab[];
}

export function PopularCategoriesTabs({ locale, tabs }: PopularCategoriesTabsProps) {
  const hasTabs = tabs && tabs.length > 0;
  const [active, setActive] = useState<string>(tabs?.[0]?.id ?? '');

  const current = useMemo(() => {
    if (!hasTabs) return undefined;
    return tabs.find((t) => t.id === active) ?? tabs[0];
  }, [active, hasTabs, tabs]);

  if (!hasTabs || !current) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-4 border-b border-[#dfe3e8] pb-3">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`relative pb-2 text-sm font-medium transition ${
                isActive ? 'text-[#0f172a]' : 'text-[#637381] hover:text-[#0f172a]'
              }`}
            >
              {tab.labelFr || tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md bg-[#0077c7]" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {current.children.map((item) => (
          <Link
            key={item.id}
            href={item.url ? `/${locale}${item.url}` : `/${locale}`}
            className="flex h-full min-h-[182px] flex-col items-center justify-center gap-3 rounded-md border border-[#dfe3e8] bg-white px-4 py-4 text-center shadow-sm"
          >
            <div className="flex h-[90px] w-[135px] items-center justify-center overflow-hidden rounded">
              <img
                src={item.imageUrl || placeholder135}
                alt={item.labelFr || item.label}
                width={135}
                height={90}
                className="h-full w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  // Fallback vers placeholder si l'image ne charge pas
                  const target = e.target as HTMLImageElement;
                  if (target.src !== placeholder135) {
                    target.src = placeholder135;
                  }
                }}
              />
            </div>
            <div className="text-[14px] font-medium leading-tight text-[#212b36]">
              {item.labelFr || item.label}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          href={`/${locale}/pieces-detachees`}
          className="inline-flex items-center justify-center rounded-md border border-[#dfe3e8] bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-sm transition hover:border-[#c2c6cc] hover:shadow-md"
        >
          Voir plus de pièces
        </Link>
      </div>
    </div>
  );
}

