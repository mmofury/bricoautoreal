'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  extractVehicleContextFromUrl,
  removeVehicleContextFromUrl,
  type VehicleContext,
} from '~/lib/utils/vehicle-context';
import { VehicleFinder } from '../vehicle-finder';

const VEHICLE_STORAGE_KEY = 'selected_vehicle';

interface VehicleBadgeProps {
  locale: string;
}

type VehicleHistoryItem = {
  vehicleId: number;
  label: string;
  url: string;
  manufacturerId: number | null;
  modelId: number | null;
  manufacturerName: string | null;
  modelName: string | null;
  versionLabel: string | null;
};

const VEHICLE_HISTORY_KEY = 'vehicle_history';
const VEHICLE_LABEL_KEY = 'selected_vehicle_label';

/**
 * Composant badge affichant le véhicule sélectionné dans le header
 * Permet de changer rapidement de véhicule
 */
export function VehicleBadge({ locale }: VehicleBadgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [vehicleContext, setVehicleContext] = useState<VehicleContext | null>(null);
  const [history, setHistory] = useState<VehicleHistoryItem[]>([]);

  // Détecter le véhicule depuis l'URL ou le localStorage
  useEffect(() => {
    // D'abord, essayer depuis l'URL
    const urlContext = extractVehicleContextFromUrl(pathname);
    if (urlContext) {
      setVehicleContext(urlContext);
      try {
        localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(urlContext));
      } catch {
        // ignore
      }
      return;
    }

    // Sinon, charger depuis localStorage
    try {
      const stored = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VehicleContext;
        setVehicleContext(parsed);
      }

      const storedHistory = localStorage.getItem(VEHICLE_HISTORY_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as VehicleHistoryItem[];
        setHistory(parsedHistory);
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  }, [pathname]);

  const handleClear = () => {
    setVehicleContext(null);
    try {
      localStorage.removeItem(VEHICLE_STORAGE_KEY);
      localStorage.removeItem(VEHICLE_LABEL_KEY);
      localStorage.removeItem(VEHICLE_HISTORY_KEY);
    } catch (e) {
      // Ignorer
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('vehicle-cleared'));
    }
    // Enlever le contexte véhicule de l'URL courante
    const next = removeVehicleContextFromUrl(pathname);
    router.push(next);
  };

  const handleVehicleSelected = () => {
    // Le contexte sera mis à jour via l'URL après navigation
  };

  const handleVehicleSelectedWithHistory = (item: VehicleHistoryItem) => {
    try {
      const nextHistory = [
        item,
        ...history.filter((h) => h.vehicleId !== item.vehicleId),
      ].slice(0, 6);
      setHistory(nextHistory);
      localStorage.setItem(VEHICLE_HISTORY_KEY, JSON.stringify(nextHistory));
      localStorage.setItem(VEHICLE_LABEL_KEY, item.label);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl bg-[#2f363f] p-3">
      <VehicleFinder
        locale={locale}
        onSelected={(payload) => {
          handleVehicleSelected();
          handleVehicleSelectedWithHistory({
            vehicleId: payload.vehicleId,
            label: payload.label,
            url: payload.url,
            manufacturerId: payload.manufacturerId,
            manufacturerName: payload.manufacturerName,
            modelId: payload.modelId,
            modelName: payload.modelName,
            versionLabel: payload.versionLabel,
          });
        }}
        variant="embedded"
      />

      {vehicleContext && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-[#3f4754] bg-[#323a44] px-3 py-2 text-sm text-white">
          <span className="truncate">
            Véhicule : {vehicleContext.brandSlug} {vehicleContext.groupSlug} {vehicleContext.modelSlug}
            {vehicleContext.engineSlug ? ` – ${vehicleContext.engineSlug}` : ''}
          </span>
          <button
            onClick={handleClear}
            className="ml-3 whitespace-nowrap rounded-full bg-[#fca5a5] px-3 py-1 text-xs font-semibold text-[#1f2937] transition hover:bg-[#f87171]"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-[#cbd5e1]">Historique</div>
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <button
                key={item.vehicleId}
                onClick={() => router.push(item.url)}
                className="flex items-start gap-2 rounded-xl border border-[#3f4754] bg-[#323a44] px-3 py-2 text-left text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:border-[#4a5563] hover:bg-[#3a414c] hover:shadow-md w-full"
              >
                <span className="text-[13px] font-semibold truncate">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem(VEHICLE_HISTORY_KEY);
              }}
              className="rounded-full bg-[#3a414c] px-3 py-1.5 text-xs font-medium text-[#fca5a5] ring-1 ring-[#4b5563] transition hover:bg-[#4a5563]"
            >
              Vider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}





