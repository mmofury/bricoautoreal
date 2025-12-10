'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { VehicleFinder } from './vehicle-finder';
import {
  extractVehicleContextFromUrl,
  removeVehicleContextFromUrl,
  type VehicleContext,
} from '~/lib/utils/vehicle-context';

type Props = {
  locale: string;
  title?: string;
  subtitle?: string;
};

export function VehicleCompatBanner({
  locale,
  title = 'Sélectionnez votre véhicule pour vérifier la compatibilité',
  subtitle = 'Choisissez marque, modèle, version pour filtrer les résultats.',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [vehicleContext, setVehicleContext] = useState<VehicleContext | null>(null);

  useEffect(() => {
    const ctx = extractVehicleContextFromUrl(pathname);
    setVehicleContext(ctx);
  }, [pathname]);

  const handleReset = () => {
    const next = removeVehicleContextFromUrl(pathname);
    router.push(next);
  };

  return (
    <div className="mb-6 rounded-lg bg-gradient-to-r from-[#0077c7] to-[#005fa3] p-4 shadow-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Titre et véhicule sélectionné */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {vehicleContext ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-white/80">Véhicule sélectionné</span>
                <span className="text-sm font-bold text-white">
                  {vehicleContext.brandSlug.toUpperCase()} {vehicleContext.groupSlug} {vehicleContext.modelSlug}
                  {vehicleContext.engineSlug ? ` - ${vehicleContext.engineSlug}` : ''}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30"
                title="Retirer le véhicule"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">Sélectionnez votre véhicule</span>
              <span className="text-xs text-white/80">Pour voir les pièces compatibles</span>
            </div>
          )}
        </div>

        {/* Sélecteur de véhicule */}
        <div className="flex-1">
          <VehicleFinder
            locale={locale}
            variant="hero"
            onSelected={(payload) => {
              router.push(`/${locale}${payload.url}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

