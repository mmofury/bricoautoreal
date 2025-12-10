'use client';

import { useEffect, useMemo, useState } from 'react';

type HeroSliderProps = {
  images: string[];
  className?: string;
  objectFit?: 'cover' | 'contain';
  maxHeightPx?: number;
  backgroundClass?: string;
  autoPlayMs?: number;
};

export function HeroSlider({
  images,
  className,
  objectFit = 'cover',
  maxHeightPx,
  backgroundClass = 'bg-transparent',
  autoPlayMs = 0,
}: HeroSliderProps) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  if (safeImages.length === 0) {
    return null;
  }

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  // Auto-play
  useEffect(() => {
    if (!autoPlayMs || autoPlayMs <= 0 || safeImages.length <= 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, safeImages.length]);

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative overflow-hidden rounded-lg ${backgroundClass} ${className ?? ''}`}>
      <div
        className="relative w-full"
        style={{
          aspectRatio: naturalSize ? `${naturalSize.w} / ${naturalSize.h}` : '16 / 9',
          maxHeight: maxHeightPx ? `${maxHeightPx}px` : undefined,
        }}
      >
        <img
          src={safeImages[index]}
          alt={`Visuel ${index + 1}`}
          className={`h-full w-full ${fitClass}`}
          loading="lazy"
          onLoad={(e) =>
            setNaturalSize({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
        />
      </div>
      {safeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Précédent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Suivant"
          >
            ›
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Aller à l'image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

