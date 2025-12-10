'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

interface Category {
  id: string;
  name: string;
  imageUrl: string;
  href: string;
}

interface TopCategoriesProps {
  categories: Category[];
}

export function TopCategories({ categories }: TopCategoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 236; // 220px width + 16px gap
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="mb-6">
        <h2 className="mb-4 text-4xl text-[#373737]">
          <span className="font-extrabold">TOP </span>
          <span className="font-thin">CATEGORIES</span>
        </h2>
        <div className="flex gap-1">
          <div className="h-[3px] w-[110px] rounded bg-[#FFDC4D]" />
          <div className="h-[3px] flex-1 rounded bg-[#DADADA]" />
        </div>
      </div>

      <div className="relative">
        {/* Scroll Left Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Categories Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              className="group flex-shrink-0"
            >
              <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-lg bg-white outline outline-2 outline-white transition hover:shadow-lg">
                <div className="relative mb-4 h-[124px] w-[124px]">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-center text-xl font-extrabold text-[#373737] group-hover:text-[#FFCC00]">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition hover:bg-gray-100"
          aria-label="Scroll right"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

