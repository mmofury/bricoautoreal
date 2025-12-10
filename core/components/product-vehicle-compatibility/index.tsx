'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { extractVehicleContextFromUrl, type VehicleContext } from '~/lib/utils/vehicle-context';
import Link from 'next/link';

interface ProductVehicleCompatibilityProps {
  articleNo: string;
  locale: string;
}

interface CompatibilityCheck {
  isCompatible: boolean;
  vehicle: VehicleContext | null;
}

/**
 * Composant affichant si un produit est compatible avec le véhicule sélectionné
 */
export function ProductVehicleCompatibility({ articleNo, locale }: ProductVehicleCompatibilityProps) {
  const pathname = usePathname();
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extraire le contexte véhicule depuis l'URL
    const vehicleContext = extractVehicleContextFromUrl(pathname);
    
    if (!vehicleContext) {
      // Essayer depuis localStorage
      try {
        const stored = localStorage.getItem('selected_vehicle');
        if (stored) {
          const parsed = JSON.parse(stored) as VehicleContext;
          checkCompatibility(parsed);
          return;
        }
      } catch (e) {
        // Ignorer
      }
      setCompatibility({ isCompatible: false, vehicle: null });
      setLoading(false);
      return;
    }

    checkCompatibility(vehicleContext);
  }, [pathname, articleNo]);

  const checkCompatibility = async (vehicleContext: VehicleContext) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/compat/check?articleNo=${encodeURIComponent(articleNo)}&vehicleId=${vehicleContext.vehicleId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompatibility({
          isCompatible: data.isCompatible,
          vehicle: vehicleContext,
        });
      } else {
        setCompatibility({
          isCompatible: false,
          vehicle: vehicleContext,
        });
      }
    } catch (error) {
      console.error('Error checking compatibility:', error);
      setCompatibility({
        isCompatible: false,
        vehicle: vehicleContext,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !compatibility || !compatibility.vehicle) {
    return null;
  }

  const vehicleLabel = `${compatibility.vehicle.brandSlug} ${compatibility.vehicle.groupSlug} ${compatibility.vehicle.modelSlug}`;
  const vehicleUrl = `/${locale}/pieces-auto/${compatibility.vehicle.brandSlug}/${compatibility.vehicle.groupSlug}/${compatibility.vehicle.modelSlug}/${compatibility.vehicle.vehicleId}${compatibility.vehicle.engineSlug ? `-${compatibility.vehicle.engineSlug}` : ''}`;

  if (compatibility.isCompatible) {
    return (
      <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-green-600 text-xl">✅</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">
              Compatible avec votre véhicule
            </p>
            <p className="text-xs text-green-700 mt-1">
              Ce produit est compatible avec : <span className="font-medium">{vehicleLabel}</span>
            </p>
            <Link
              href={vehicleUrl}
              className="text-xs text-green-600 underline hover:text-green-800 mt-1 inline-block"
            >
              Voir tous les produits compatibles pour ce véhicule →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-xl">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Vérification de compatibilité requise
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Ce produit n'est pas listé comme compatible avec : <span className="font-medium">{vehicleLabel}</span>
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Vérifiez la compatibilité auprès d'un expert avant l'achat.
          </p>
        </div>
      </div>
    </div>
  );
}







