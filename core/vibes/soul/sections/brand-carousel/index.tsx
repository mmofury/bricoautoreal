'use client';

export interface Brand {
  name: string;
  logoUrl: string;
}

export interface BrandCarouselProps {
  brands: Brand[];
}

export function BrandCarousel({ brands }: BrandCarouselProps) {
  // Duplicate brands for infinite scroll effect
  const duplicatedBrands = [...brands, ...brands, ...brands, ...brands];
  
  return (
    <div className="relative overflow-hidden border-b border-[#E2E8F0] py-8">
      {/* Gradient overlays */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-64 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-64 bg-gradient-to-l from-white to-transparent" />
      
      <div className="container mx-auto max-w-[1280px] overflow-hidden">
        <div className="flex animate-scrollLeft gap-[58px]">
          {duplicatedBrands.map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="flex h-[46px] w-[161px] flex-shrink-0 items-center justify-center"
            >
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-full w-full object-contain grayscale transition-all hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
