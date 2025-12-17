'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeroBannerPromoProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  images: string[];
  imageAlt?: string;
}

export function HeroBannerPromo({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  images,
  imageAlt = 'Promotion banner',
}: HeroBannerPromoProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 8000); // Change d'image toutes les 8 secondes

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative overflow-hidden rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 bg-white">
        {/* Contenu texte */}
        <div className="flex flex-col justify-center p-5 md:p-8">
          <h2 className="mb-4 text-3xl font-bold leading-tight text-[#2F3740] md:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mb-6 text-lg font-bold text-[#2F3740] md:text-xl">{subtitle}</p>
          <Link
            className="inline-flex w-fit items-center justify-center rounded-lg bg-[#FFCC00] px-8 py-3 text-sm font-bold text-[#2F3740] transition-all hover:bg-[#FFD633] focus:outline-none focus:ring-2 focus:ring-[#FFCC00] focus:ring-offset-2"
            href={ctaHref}
          >
            {ctaLabel}
          </Link>
        </div>

        {/* Slider d'images */}
        <div className="relative h-80 md:h-[400px] lg:h-[500px] bg-[#2F3740]">
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
            >
              <Image
                alt={`${imageAlt} ${index + 1}`}
                className="rounded-br-lg rounded-tr-lg object-contain"
                fill
                priority={index === 0}
                src={image}
              />
            </div>
          ))}

          {/* Indicateurs de slides */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                aria-label={`Aller à l'image ${index + 1}`}
                className={`h-2 w-2 rounded-full transition-all ${index === currentImageIndex
                    ? 'w-8 bg-[#FFCC00]'
                    : 'bg-white/50 hover:bg-white/75'
                  }`}
                onClick={() => setCurrentImageIndex(index)}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
