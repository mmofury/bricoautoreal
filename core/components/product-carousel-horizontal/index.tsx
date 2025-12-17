'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  href: string;
}

interface ProductCarouselHorizontalProps {
  title: string;
  products: Product[];
}

export function ProductCarouselHorizontal({ title, products }: ProductCarouselHorizontalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 336;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="relative flex items-center">
        <div className="text-[#DADADA]">★★★★★</div>
        <div
          className="absolute left-0 top-0 overflow-hidden text-[#FFCC00]"
          style={{ width: `${(rating / 5) * 100}%` }}
        >
          ★★★★★
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="mb-6">
        <h2 className="mb-4 text-4xl text-[#373737]">
          <span className="font-extrabold">{title.split(' ')[0]} </span>
          <span className="font-thin">{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        <div className="flex gap-1">
          <div className="h-[3px] w-[110px] rounded bg-[#FFDC4D]" />
          <div className="h-[3px] flex-1 rounded bg-white" />
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="group flex-shrink-0"
            >
              <div className="flex h-[124px] w-[320px] gap-3 rounded bg-white p-3 outline outline-2 outline-white transition hover:shadow-lg">
                <div className="relative h-[70px] w-[70px] flex-shrink-0">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-base font-extrabold text-[#CC0033]">
                      {product.price}
                    </span>
                    <button
                      className="flex h-10 w-[72px] items-center justify-center rounded-lg bg-[#FFCC00] outline outline-2 outline-[#FFCC00] transition hover:bg-[#FFD700]"
                      aria-label="Add to cart"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-[13.8px] leading-none tracking-wider">
                    {renderStars(product.rating)}
                    <span className="text-xs font-light text-[#666666]">
                      ({product.reviewCount})
                    </span>
                  </div>

                  <div className="line-clamp-2 text-sm leading-snug text-[#666666]">
                    <span className="font-bold">{product.brand} </span>
                    <span className="font-light">{product.name}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

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

