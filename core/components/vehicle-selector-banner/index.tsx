'use client';

import { Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface VehicleSelectorBannerProps {
  locale: string;
  variant?: 'default' | 'inline';
}

interface Manufacturer {
  id: number;
  name: string;
}

interface Model {
  modelId: number;
  modelName: string;
}

interface Vehicle {
  vehicleId: number;
  typeEngineName: string | null;
}

export function VehicleSelectorBanner({ locale, variant = 'default' }: VehicleSelectorBannerProps) {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Charger les constructeurs au montage
  useEffect(() => {
    const loadManufacturers = async () => {
      setLoadingManufacturers(true);
      try {
        const res = await fetch('/api/compat/manufacturers');
        const data = await res.json();
        // L'API retourne { manufacturers: [...] }
        setManufacturers(data.manufacturers || []);
      } catch (error) {
        console.error('Erreur chargement constructeurs:', error);
        setManufacturers([]);
      } finally {
        setLoadingManufacturers(false);
      }
    };

    void loadManufacturers();
  }, []);

  // Charger les modèles quand un constructeur est sélectionné
  useEffect(() => {
    if (!manufacturerId) {
      setModels([]);
      setModelId(null);
      return;
    }

    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const res = await fetch(`/api/compat/models?manufacturerId=${manufacturerId}`);
        const data = await res.json();
        // L'API retourne { groups: [...], ungrouped: [...] }
        // On combine tous les modèles
        const allModels = [
          ...data.groups.flatMap((g: { models: Model[] }) => g.models),
          ...data.ungrouped,
        ];
        setModels(allModels);
      } catch (error) {
        console.error('Erreur chargement modèles:', error);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    void loadModels();
  }, [manufacturerId]);

  // Charger les véhicules quand un modèle est sélectionné
  useEffect(() => {
    if (!modelId) {
      setVehicles([]);
      setVehicleId(null);
      return;
    }

    const loadVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const res = await fetch(`/api/compat/vehicles?modelId=${modelId}`);
        const data = await res.json();
        // L'API retourne { vehicles: [...], ... }
        setVehicles(data.vehicles || []);
      } catch (error) {
        console.error('Erreur chargement véhicules:', error);
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    };

    void loadVehicles();
  }, [modelId]);

  const handleSubmit = () => {
    if (!vehicleId) return;

    const manufacturer = manufacturers.find((m) => m.id === manufacturerId);
    const model = models.find((m) => m.modelId === modelId);
    const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);

    if (manufacturer && model && vehicle) {
      const url = `/vehicule/${manufacturer.name.toLowerCase()}/${model.modelName.toLowerCase()}/${vehicleId}`;
      router.push(`/${locale}${url}`);
    }
  };

  return (
    <div className={`relative rounded-lg bg-[#FFCC00] p-4 shadow-lg md:p-6 ${variant === 'default' ? '-mt-10' : ''
      }`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-start">
        {/* Icône et texte */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#2F3740] md:h-20 md:w-20">
            <Car className="h-8 w-8 text-white md:h-10 md:w-10" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-black md:text-2xl">Tout commence ici</h2>
            <p className="text-sm text-black md:text-base">
              Ajoutez votre véhicule pour voir les pièces compatibles
            </p>
          </div>
        </div>

        {/* 3 selects de compatibilité */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
          {/* Constructeur */}
          <select
            className="min-w-0 flex-1 rounded-lg border-2 border-gray-900 bg-transparent px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 md:max-w-[250px]"
            disabled={loadingManufacturers}
            onChange={(e) => {
              setManufacturerId(e.target.value ? Number(e.target.value) : null);
              setModelId(null);
              setVehicleId(null);
            }}
            value={manufacturerId ?? ''}
          >
            <option value="">
              {loadingManufacturers ? 'Chargement...' : 'Constructeur'}
            </option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Modèle */}
          <select
            className="min-w-0 flex-1 rounded-lg border-2 border-gray-900 bg-transparent px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 md:max-w-[250px]"
            disabled={!manufacturerId || loadingModels}
            onChange={(e) => {
              setModelId(e.target.value ? Number(e.target.value) : null);
              setVehicleId(null);
            }}
            value={modelId ?? ''}
          >
            <option value="">{loadingModels ? 'Chargement...' : 'Modèle'}</option>
            {models.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.modelName}
              </option>
            ))}
          </select>

          {/* Version */}
          <select
            className="min-w-0 flex-1 rounded-lg border-2 border-gray-900 bg-transparent px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 md:max-w-[250px]"
            disabled={!modelId || loadingVehicles}
            onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)}
            value={vehicleId ?? ''}
          >
            <option value="">{loadingVehicles ? 'Chargement...' : 'Version'}</option>
            {vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.typeEngineName || `Véhicule #${v.vehicleId}`}
              </option>
            ))}
          </select>

          {/* Bouton de validation */}
          <button
            className="flex-shrink-0 rounded-lg bg-[#2F3740] px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50 md:whitespace-nowrap"
            disabled={!vehicleId}
            onClick={handleSubmit}
            type="button"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
