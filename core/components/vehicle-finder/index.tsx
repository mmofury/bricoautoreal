'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Manufacturer = { id: number; name: string };
type Model = { id: number; modelId: number; modelName: string; slug: string };
type ModelGroup = {
  id: number;
  groupKey: string;
  displayName: string;
  models: Model[];
};
type ModelsResponse = {
  groups: ModelGroup[];
  ungrouped: Model[];
};
type Vehicle = {
  vehicleId: number;
  typeEngineName: string | null;
  constructionIntervalStart: string | null;
  constructionIntervalEnd: string | null;
  engineSlug: string | null;
  url: string; // sans locale, on préfixe côté client
};

// Liste des constructeurs les plus populaires (par ordre de popularité)
const POPULAR_MANUFACTURERS = [
  'RENAULT',
  'PEUGEOT',
  'VOLKSWAGEN',
  'BMW',
  'CITROЁN',
  'AUDI',
  'MERCEDES-BENZ',
  'FORD',
  'OPEL',
  'FIAT',
];

interface VehicleFinderProps {
  locale: string;
  onSelected?: (payload: {
    vehicleId: number;
    label: string;
    url: string;
    manufacturerId: number | null;
    manufacturerName: string | null;
    modelId: number | null;
    modelName: string | null;
    versionLabel: string | null;
  }) => void;
  variant?: 'default' | 'embedded' | 'hero';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

export function VehicleFinder({ locale, onSelected, variant = 'default' }: VehicleFinderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [ungroupedModels, setUngroupedModels] = useState<Model[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // États de recherche
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // États de chargement
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Séparer et filtrer les constructeurs populaires des autres
  const { popularManufacturers, otherManufacturers } = useMemo(() => {
    const popular: Manufacturer[] = [];
    const other: Manufacturer[] = [];

    // Créer un Set pour une recherche rapide
    const popularNamesSet = new Set(POPULAR_MANUFACTURERS);
    const searchLower = manufacturerSearch.toLowerCase();

    manufacturers.forEach((m) => {
      // Filtrer par recherche
      if (searchLower && !m.name.toLowerCase().includes(searchLower)) {
        return;
      }

      if (popularNamesSet.has(m.name)) {
        popular.push(m);
      } else {
        other.push(m);
      }
    });

    // Trier les populaires selon l'ordre de POPULAR_MANUFACTURERS
    popular.sort((a, b) => {
      const indexA = POPULAR_MANUFACTURERS.indexOf(a.name);
      const indexB = POPULAR_MANUFACTURERS.indexOf(b.name);
      return indexA - indexB;
    });

    // Trier les autres alphabétiquement
    other.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return { popularManufacturers: popular, otherManufacturers: other };
  }, [manufacturers, manufacturerSearch]);

  // Filtrer les modèles par recherche
  const filteredModelGroups = useMemo(() => {
    if (variant === 'embedded' || variant === 'hero') return modelGroups;
    if (!modelSearch) return modelGroups;
    const searchLower = modelSearch.toLowerCase();
    return modelGroups
      .map((group) => ({
        ...group,
        models: group.models.filter((m) =>
          m.modelName.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [modelGroups, modelSearch, variant]);

  const filteredUngroupedModels = useMemo(() => {
    if (variant === 'embedded' || variant === 'hero') return ungroupedModels;
    if (!modelSearch) return ungroupedModels;
    const searchLower = modelSearch.toLowerCase();
    return ungroupedModels.filter((m) =>
      m.modelName.toLowerCase().includes(searchLower)
    );
  }, [ungroupedModels, modelSearch, variant]);

  // Filtrer les véhicules par recherche
  const filteredVehicles = useMemo(() => {
    if (variant === 'embedded' || variant === 'hero') return vehicles;
    if (!vehicleSearch) return vehicles;
    const searchLower = vehicleSearch.toLowerCase();
    return vehicles.filter(
      (v) =>
        (v.typeEngineName?.toLowerCase().includes(searchLower)) ||
        v.vehicleId.toString().includes(searchLower)
    );
  }, [vehicles, vehicleSearch, variant]);

  // Charger les marques
  useEffect(() => {
    setLoadingManufacturers(true);
    setError(null);
    fetchJson<{ manufacturers: Manufacturer[] }>('/api/compat/manufacturers')
      .then((data) => {
        setManufacturers(data.manufacturers);
        setLoadingManufacturers(false);
      })
      .catch((err) => {
        console.error('[VehicleFinder] Error loading manufacturers:', err);
        setError('Erreur lors du chargement des constructeurs');
        setManufacturers([]);
        setLoadingManufacturers(false);
      });
  }, []);

  // Charger les modèles quand marque sélectionnée
  useEffect(() => {
    if (!manufacturerId) {
      setModelGroups([]);
      setUngroupedModels([]);
      setModelId(null);
      setLoadingModels(false);
      return;
    }
    setLoadingModels(true);
    setError(null);
    fetchJson<ModelsResponse>(`/api/compat/models?manufacturerId=${manufacturerId}`)
      .then((data) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[VehicleFinder] Models data:', {
            groupsCount: data.groups.length,
            groups: data.groups.map((g) => ({
              name: g.displayName,
              modelsCount: g.models.length,
            })),
            ungroupedCount: data.ungrouped.length,
          });
        }
        setModelGroups(data.groups);
        setUngroupedModels(data.ungrouped);
        setLoadingModels(false);
      })
      .catch((err) => {
        console.error('[VehicleFinder] Error loading models:', err);
        setError('Erreur lors du chargement des modèles');
        setModelGroups([]);
        setUngroupedModels([]);
        setLoadingModels(false);
      });
  }, [manufacturerId]);

  // Charger les véhicules quand modèle sélectionné
  useEffect(() => {
    if (!modelId) {
      setVehicles([]);
      setSelectedVehicle(null);
      setLoadingVehicles(false);
      return;
    }
    setLoadingVehicles(true);
    setError(null);
    fetchJson<{
      vehicles: Vehicle[];
      groupSlug: string;
      manufacturer: { slug: string };
      model: { slug: string };
    }>(`/api/compat/vehicles?modelId=${modelId}`)
      .then((data) => {
        setVehicles(data.vehicles);
        setLoadingVehicles(false);
      })
      .catch((err) => {
        console.error('[VehicleFinder] Error loading vehicles:', err);
        setError('Erreur lors du chargement des véhicules');
        setVehicles([]);
        setLoadingVehicles(false);
      });
  }, [modelId]);

  const canSubmit = useMemo(() => Boolean(selectedVehicle), [selectedVehicle]);

  const handleSubmit = () => {
    if (!selectedVehicle) return;
    const manufacturerName =
      manufacturers.find((m) => m.id === manufacturerId)?.name ?? null;
    const modelName =
      filteredModelGroups.flatMap((g) => g.models).find((m) => m.modelId === modelId)?.modelName ||
      filteredUngroupedModels.find((m) => m.modelId === modelId)?.modelName ||
      null;
    const versionLabel =
      selectedVehicle.typeEngineName ||
      (selectedVehicle.constructionIntervalStart && selectedVehicle.constructionIntervalEnd
        ? `${selectedVehicle.constructionIntervalStart.slice(0, 4)}-${selectedVehicle.constructionIntervalEnd.slice(0, 4)}`
        : null);
    const parts = [manufacturerName, modelName, versionLabel].filter(Boolean);
    const displayLabel =
      parts.length > 0 ? parts.join(' • ') : `Véhicule #${selectedVehicle.vehicleId}`;
    const url = `/${locale}${selectedVehicle.url}`;
    router.push(url);
    onSelected?.({
      vehicleId: selectedVehicle.vehicleId,
      label: displayLabel,
      url,
      manufacturerId,
      manufacturerName,
      modelId,
      modelName,
      versionLabel,
    });
  };

  const embedded = variant === 'embedded';
  const hero = variant === 'hero';

  if (embedded) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <select
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          value={manufacturerId ?? ''}
          onChange={(e) => {
            setManufacturerId(e.target.value ? Number(e.target.value) : null);
            setModelId(null);
            setSelectedVehicle(null);
          }}
          disabled={loadingManufacturers}
        >
          <option value="">{loadingManufacturers ? 'Chargement...' : 'Constructeur'}</option>
          {popularManufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          {otherManufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          value={modelId ?? ''}
          onChange={(e) => {
            setModelId(e.target.value ? Number(e.target.value) : null);
            setSelectedVehicle(null);
          }}
          disabled={!manufacturerId || loadingModels}
        >
          <option value="">{loadingModels ? 'Chargement...' : 'Modèle'}</option>
          {filteredModelGroups.map((group) => (
            <optgroup key={group.id} label={group.displayName}>
              {group.models.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelName}
                </option>
              ))}
            </optgroup>
          ))}
          {filteredUngroupedModels.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.modelName}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          value={selectedVehicle?.vehicleId ?? ''}
          onChange={(e) => {
            const v = filteredVehicles.find((veh) => veh.vehicleId === Number(e.target.value));
            setSelectedVehicle(v ?? null);
          }}
          disabled={!modelId || loadingVehicles}
        >
          <option value="">{loadingVehicles ? 'Chargement...' : 'Version'}</option>
          {filteredVehicles.map((v) => (
            <option key={v.vehicleId} value={v.vehicleId}>
              {v.typeEngineName || `Vehicule #${v.vehicleId}`}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-gray-900 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Valider
        </button>
      </div>
    );
  }

  if (hero) {
    return (
      <div className="w-full">
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mx-auto flex h-full w-full max-w-[1220px] items-stretch">
          <div className="flex w-full flex-col justify-center gap-4 rounded-lg border border-[#e2e8f0] bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e2e8f0] text-[11px] font-semibold text-[#0f172a]">
                  01
                </span>
                <select
                  className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-transparent px-3 text-sm font-medium text-[#0f172a] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0067b2] disabled:opacity-60"
                  value={manufacturerId ?? ''}
                  onChange={(e) => {
                    setManufacturerId(e.target.value ? Number(e.target.value) : null);
                    setModelId(null);
                    setSelectedVehicle(null);
                  }}
                  disabled={loadingManufacturers}
                >
                  <option value="">{loadingManufacturers ? 'Chargement...' : 'Sélectionnez la marque'}</option>
                  {popularManufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  {otherManufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e2e8f0] text-[11px] font-semibold text-[#0f172a]">
                  02
                </span>
                <select
                  className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-transparent px-3 text-sm font-medium text-[#0f172a] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0067b2] disabled:bg-transparent disabled:text-[#94a3b8] disabled:opacity-80"
                  value={modelId ?? ''}
                  onChange={(e) => {
                    setModelId(e.target.value ? Number(e.target.value) : null);
                    setSelectedVehicle(null);
                  }}
                  disabled={!manufacturerId || loadingModels}
                >
                  <option value="">
                    {loadingModels ? 'Chargement...' : manufacturerId ? 'Sélectionnez le modèle' : "Sélectionnez d'abord la marque"}
                  </option>
                  {filteredModelGroups.map((group) => (
                    <optgroup key={group.id} label={group.displayName}>
                      {group.models.map((m) => (
                        <option key={m.modelId} value={m.modelId}>
                          {m.modelName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {filteredUngroupedModels.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.modelName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e2e8f0] text-[11px] font-semibold text-[#0f172a]">
                  03
                </span>
                <select
                  className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-transparent px-3 text-sm font-medium text-[#0f172a] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0067b2] disabled:bg-transparent disabled:text-[#94a3b8] disabled:opacity-80"
                  value={selectedVehicle?.vehicleId ?? ''}
                  onChange={(e) => {
                    const v = filteredVehicles.find((veh) => veh.vehicleId === Number(e.target.value));
                    setSelectedVehicle(v ?? null);
                  }}
                  disabled={!modelId || loadingVehicles}
                >
                  <option value="">
                    {loadingVehicles ? 'Chargement...' : modelId ? 'Sélectionnez le moteur / version' : 'Sélectionnez le modèle'}
                  </option>
                  {filteredVehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.typeEngineName || `Vehicule #${v.vehicleId}`}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-[#f36f21] px-5 text-sm font-semibold text-white transition hover:bg-[#d85f15] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Trouver des pièces auto
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm space-y-2">
      <p className="text-sm font-medium text-gray-900">Sélectionner un véhicule</p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Rechercher une marque..."
            value={manufacturerSearch}
            onChange={(e) => setManufacturerSearch(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm mb-1"
            disabled={loadingManufacturers}
          />
          {manufacturerSearch && (
            <span className="text-xs text-gray-500 mb-1 block">
              {popularManufacturers.length + otherManufacturers.length} résultat(s)
            </span>
          )}
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            value={manufacturerId ?? ''}
            onChange={(e) => {
              setManufacturerId(e.target.value ? Number(e.target.value) : null);
              setModelId(null);
              setSelectedVehicle(null);
              setManufacturerSearch(''); // Réinitialiser la recherche
            }}
            disabled={loadingManufacturers}
          >
            <option value="">
              {loadingManufacturers ? 'Chargement...' : 'Marque'}
            </option>
            {popularManufacturers.length > 0 && (
              <optgroup label="🏆 Les constructeurs les plus populaires">
                {popularManufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherManufacturers.length > 0 && (
              <optgroup label="Autres constructeurs">
                {otherManufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {loadingManufacturers && (
            <div className="absolute right-2 top-9 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>

        <div className="relative">
          {manufacturerId && (
            <>
              <input
                type="text"
                placeholder="🔍 Rechercher un modèle..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm mb-1"
                disabled={loadingModels}
              />
              {modelSearch && (
                <span className="text-xs text-gray-500 mb-1 block">
                  {filteredModelGroups.reduce((acc, g) => acc + g.models.length, 0) + filteredUngroupedModels.length} résultat(s)
                </span>
              )}
            </>
          )}
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            value={modelId ?? ''}
            onChange={(e) => {
              setModelId(e.target.value ? Number(e.target.value) : null);
              setSelectedVehicle(null);
              setModelSearch(''); // Réinitialiser la recherche
            }}
            disabled={!manufacturerId || loadingModels}
          >
            <option value="">
              {loadingModels ? 'Chargement des modèles...' : modelGroups.length === 0 && !loadingModels ? 'Sélectionnez une marque' : 'Modèle'}
            </option>
            {filteredModelGroups.map((group) => (
              <optgroup key={group.id} label={`📁 ${group.displayName}`}>
                {group.models.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.modelName}
                  </option>
                ))}
              </optgroup>
            ))}
            {filteredUngroupedModels.length > 0 && (
              <optgroup label="📁 Autres modèles">
                {filteredUngroupedModels.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.modelName}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {loadingModels && (
            <div className="absolute right-2 top-9 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>

        <div className="relative">
          {modelId && (
            <>
              <input
                type="text"
                placeholder="🔍 Rechercher une version/moteur..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm mb-1"
                disabled={loadingVehicles}
              />
              {vehicleSearch && (
                <span className="text-xs text-gray-500 mb-1 block">
                  {filteredVehicles.length} résultat(s)
                </span>
              )}
            </>
          )}
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedVehicle?.vehicleId ?? ''}
            onChange={(e) => {
              const v = filteredVehicles.find((veh) => veh.vehicleId === Number(e.target.value));
              setSelectedVehicle(v ?? null);
              setVehicleSearch(''); // Réinitialiser la recherche
            }}
            disabled={!modelId || loadingVehicles}
          >
            <option value="">
              {loadingVehicles ? 'Chargement des véhicules...' : vehicles.length === 0 && !loadingVehicles ? 'Sélectionnez un modèle' : 'Version / moteur'}
            </option>
            {filteredVehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.typeEngineName || `Vehicule #${v.vehicleId}`}
                {v.constructionIntervalStart && v.constructionIntervalEnd
                  ? ` (${v.constructionIntervalStart.substring(0, 4)}-${v.constructionIntervalEnd.substring(0, 4)})`
                  : ''}
              </option>
            ))}
          </select>
          {loadingVehicles && (
            <div className="absolute right-2 top-9 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      <button
        className="w-full rounded bg-blue-600 px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {canSubmit ? 'Voir les pièces compatibles' : 'Sélectionnez un véhicule'}
      </button>
    </div>
  );
}

