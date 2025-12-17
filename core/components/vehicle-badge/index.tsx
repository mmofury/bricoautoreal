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
    <div className="space-y-4">
      {/* Bloc principal avec fond jaune */}
      <div className="rounded-lg bg-[#FFCC00] p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#2F3740]">Tout commence ici</h2>
          <p className="text-sm text-gray-700">
            Ajoutez votre véhicule pour voir les pièces compatibles
          </p>
        </div>

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
      </div>

      {/* Véhicule sélectionné */}
      {vehicleContext && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Véhicule sélectionné
          </div>
          <div className="flex items-center justify-between">
            <span className="truncate text-sm font-medium text-[#2F3740]">
              {vehicleContext.brandSlug} {vehicleContext.groupSlug} {vehicleContext.modelSlug}
              {vehicleContext.engineSlug ? ` – ${vehicleContext.engineSlug}` : ''}
            </span>
            <button
              onClick={handleClear}
              className="ml-3 whitespace-nowrap rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-bold text-[#2F3740]">Historique récent</div>
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <button
                key={item.vehicleId}
                onClick={() => router.push(item.url)}
                className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-[#2F3740] shadow-sm transition hover:border-[#FFCC00] hover:shadow-md w-full"
              >
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem(VEHICLE_HISTORY_KEY);
              }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Vider l'historique
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
