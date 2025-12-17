'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale } from 'next-intl';

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

export function ProductVehicleSelector() {
    const router = useRouter();
    const locale = useLocale();

    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    const [manufacturerId, setManufacturerId] = useState<number | null>(null);
    const [modelId, setModelId] = useState<number | null>(null);
    const [vehicleId, setVehicleId] = useState<number | null>(null);

    const [loadingManufacturers, setLoadingManufacturers] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingVehicles, setLoadingVehicles] = useState(false);

    // Load manufacturers
    useEffect(() => {
        const loadManufacturers = async () => {
            setLoadingManufacturers(true);
            try {
                const res = await fetch('/api/compat/manufacturers');
                const data = await res.json();
                setManufacturers(data.manufacturers || []);
            } catch (error) {
                console.error('Error loading manufacturers:', error);
                setManufacturers([]);
            } finally {
                setLoadingManufacturers(false);
            }
        };

        void loadManufacturers();
    }, []);

    // Load models
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
                const allModels = [
                    ...data.groups.flatMap((g: { models: Model[] }) => g.models),
                    ...data.ungrouped,
                ];
                setModels(allModels);
            } catch (error) {
                console.error('Error loading models:', error);
                setModels([]);
            } finally {
                setLoadingModels(false);
            }
        };

        void loadModels();
    }, [manufacturerId]);

    // Load vehicles
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
                setVehicles(data.vehicles || []);
            } catch (error) {
                console.error('Error loading vehicles:', error);
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

        if (manufacturer && model) {
            const url = `/vehicule/${manufacturer.name.toLowerCase()}/${model.modelName.toLowerCase()}/${vehicleId}`;
            router.push(`/${locale}${url}`);
        }
    };

    const isFormComplete = manufacturerId && modelId && vehicleId;

    return (
        <div className="w-full bg-[#373737] shadow-lg rounded-lg p-4">
            <div className="mx-auto max-w-screen-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#FFCC00] text-xl font-semibold">
                        Cette pièce est-elle compatible avec votre véhicule ?
                    </h2>
                </div>

                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Make */}
                    <div className="relative">
                        <select
                            value={manufacturerId ?? ''}
                            onChange={(e) => {
                                setManufacturerId(e.target.value ? Number(e.target.value) : null);
                                setModelId(null);
                                setVehicleId(null);
                            }}
                            className="w-full h-[46px] px-3 pr-10 bg-white border-2 border-[#66666640] rounded appearance-none text-sm font-semibold text-[#373737] focus:outline-none focus:border-[#FFCC00] cursor-pointer"
                        >
                            <option value="">{loadingManufacturers ? 'Chargement...' : 'Constructeur'}</option>
                            {manufacturers.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#373737] pointer-events-none" />
                    </div>

                    {/* Model */}
                    <div className="relative">
                        <select
                            value={modelId ?? ''}
                            onChange={(e) => {
                                setModelId(e.target.value ? Number(e.target.value) : null);
                                setVehicleId(null);
                            }}
                            disabled={!manufacturerId || loadingModels}
                            className="w-full h-[46px] px-3 pr-10 bg-white border-2 border-[#66666640] rounded appearance-none text-sm font-semibold text-[#373737] focus:outline-none focus:border-[#FFCC00] cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">{loadingModels ? 'Chargement...' : 'Modèle'}</option>
                            {models.map((m) => (
                                <option key={m.modelId} value={m.modelId}>{m.modelName}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#373737] pointer-events-none" />
                    </div>

                    {/* Engine/Version */}
                    <div className="relative">
                        <select
                            value={vehicleId ?? ''}
                            onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)}
                            disabled={!modelId || loadingVehicles}
                            className="w-full h-[46px] px-3 pr-10 bg-white border-2 border-[#66666640] rounded appearance-none text-sm font-semibold text-[#373737] focus:outline-none focus:border-[#FFCC00] cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">{loadingVehicles ? 'Chargement...' : 'Motorisation'}</option>
                            {vehicles.map((v) => (
                                <option key={v.vehicleId} value={v.vehicleId}>
                                    {v.typeEngineName || `Véhicule #${v.vehicleId}`}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#373737] pointer-events-none" />
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormComplete}
                        className={`h-[46px] rounded font-bold text-base transition-all ${isFormComplete
                            ? 'bg-[#FFCC00] text-[#373737] hover:bg-[#FFD633] cursor-pointer'
                            : 'bg-[#F2F2F2] text-[#DADADA] cursor-not-allowed'
                            }`}
                    >
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}
