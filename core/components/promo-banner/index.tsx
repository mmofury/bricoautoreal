'use client';

import { useState, useEffect } from 'react';

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Vérifier si la bannière a été fermée dans le localStorage
    const isClosed = localStorage.getItem('promo-banner-closed');
    if (isClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('promo-banner-closed', 'true');
  };

  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <div className="relative bg-[#FFCC00] h-12 flex items-center justify-center px-4">
      {/* Message principal */}
      <div className="text-center">
        <span className="text-[#373737] text-base md:text-xl font-bold leading-7">
          15% DE RÉDUCTION DÈS 35€ | 20% DÈS 100€ | EN LIGNE UNIQUEMENT
        </span>
      </div>

      {/* Code promo */}
      <div className="absolute left-1/2 ml-32 hidden lg:flex items-center gap-2 rounded border-2 border-[#373737] px-2 py-1">
        <span className="text-[#373737] text-sm font-bold">UTILISER LE CODE</span>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="#373737"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[#373737] text-sm font-extrabold">BRICOAUTO15</span>
      </div>

      {/* Exclusions */}
      <div className="absolute right-12 hidden xl:block">
        <span className="text-[#373737] text-xs underline cursor-pointer hover:no-underline">
          *Exclusions applicables
        </span>
      </div>

      {/* Bouton fermer */}
      <button
        onClick={handleClose}
        className="absolute right-4 text-[#373737] text-xl font-bold hover:text-black transition"
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  );
}


