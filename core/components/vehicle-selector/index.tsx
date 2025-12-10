'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { extractVehicleContextFromUrl, removeVehicleContextFromUrl, type VehicleContext } from '~/lib/utils/vehicle-context';

interface VehicleSelectorProps {
  vehicleContext: VehicleContext | null;
  onClear?: () => void;
}

/**
 * Composant pour afficher et gérer le véhicule sélectionné
 * Affiche le véhicule actuel et permet de le retirer
 */
export function VehicleSelector({ vehicleContext, onClear }: VehicleSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      // Retirer le contexte véhicule de l'URL actuelle
      const urlWithoutVehicle = removeVehicleContextFromUrl(pathname);
      router.push(urlWithoutVehicle);
    }
  };

  if (!vehicleContext) {
    return null;
  }

  const vehicleLabel = `${vehicleContext.brandSlug} ${vehicleContext.groupSlug} ${vehicleContext.modelSlug}${vehicleContext.engineSlug ? ` – ${vehicleContext.engineSlug}` : ''}`;

  return (
    <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-blue-900">Véhicule sélectionné :</span>
          <span className="ml-2 text-blue-700">{vehicleLabel}</span>
        </div>
        <button
          onClick={handleClear}
          className="ml-4 text-blue-600 underline hover:text-blue-800"
        >
          Retirer
        </button>
      </div>
    </div>
  );
}
