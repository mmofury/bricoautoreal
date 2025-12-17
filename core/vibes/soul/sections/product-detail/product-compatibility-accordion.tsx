'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VehicleCompatibility {
    manufacturer: string;
    model: string;
    vehicleId: number;
    typeEngineName: string | null;
    constructionIntervalStart: string | null;
    constructionIntervalEnd: string | null;
}

interface Props {
    productId: number;
}

export function ProductCompatibilityAccordion({ productId }: Props) {
    const [vehicles, setVehicles] = useState<VehicleCompatibility[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedManufacturers, setExpandedManufacturers] = useState<Set<string>>(new Set());
    const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchCompatibility = async () => {
            try {
                const res = await fetch(`/api/product-compatibility?productId=${productId}`);
                const data = await res.json();
                setVehicles(data.vehicles || []);
            } catch (error) {
                console.error('Error fetching compatibility:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchCompatibility();
    }, [productId]);

    // Group by manufacturer → model → versions
    const groupedByManufacturer = vehicles.reduce<Record<string, Record<string, VehicleCompatibility[]>>>((acc, vehicle) => {
        if (!acc[vehicle.manufacturer]) acc[vehicle.manufacturer] = {};
        if (!acc[vehicle.manufacturer][vehicle.model]) acc[vehicle.manufacturer][vehicle.model] = [];
        acc[vehicle.manufacturer][vehicle.model].push(vehicle);
        return acc;
    }, {});

    const toggleManufacturer = (manufacturer: string) => {
        const newExpanded = new Set(expandedManufacturers);
        if (newExpanded.has(manufacturer)) {
            newExpanded.delete(manufacturer);
        } else {
            newExpanded.add(manufacturer);
        }
        setExpandedManufacturers(newExpanded);
    };

    const toggleModel = (key: string) => {
        const newExpanded = new Set(expandedModels);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedModels(newExpanded);
    };

    if (loading) {
        return (
            <div className="w-full bg-white rounded-[10px] border border-[#DFE3E8] p-4">
                <p className="text-[#637381] text-sm" style={{ fontFamily: 'Inter' }}>Chargement des compatibilités...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-[10px] border border-[#DFE3E8] overflow-hidden">
            {/* Vehicle list - 3 levels: Manufacturer → Model → Versions */}
            <div className="max-h-[548px] overflow-y-auto">
                {Object.keys(groupedByManufacturer).length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-[#637381] text-sm mb-2" style={{ fontFamily: 'Inter' }}>
                            Les données de compatibilité pour ce produit sont en cours d'importation
                        </p>
                        <p className="text-[#919EAB] text-xs" style={{ fontFamily: 'Inter' }}>
                            Produit BigCommerce ID: {productId}
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedByManufacturer).sort(([a], [b]) => a.localeCompare(b)).map(([manufacturer, models]) => {
                        const isManufacturerExpanded = expandedManufacturers.has(manufacturer);
                        const totalModels = Object.keys(models).length;

                        return (
                            <div key={manufacturer} className="border-b border-[#DFE3E8] last:border-b-0">
                                {/* Level 1: Manufacturer - clickable */}
                                <button
                                    onClick={() => toggleManufacturer(manufacturer)}
                                    className="w-full h-[57px] px-4 flex items-center gap-4 hover:bg-[#F8F9F9] transition-colors cursor-pointer"
                                    type="button"
                                >
                                    {isManufacturerExpanded ? (
                                        <ChevronDown className="w-[21px] h-[20px] text-[#637381] shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-[21px] h-[20px] text-[#637381] shrink-0" />
                                    )}
                                    <div className="flex flex-col justify-center text-left text-[#212B36] text-[16px] font-medium leading-[28px]" style={{ fontFamily: 'Inter' }}>
                                        {manufacturer}
                                        <span className="text-[#637381] text-[12px] font-normal">
                                            {totalModels} modèle{totalModels > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </button>

                                {/* Level 2: Models - expandable */}
                                {isManufacturerExpanded && (
                                    <div className="bg-[#F8F9F9]">
                                        {Object.entries(models).sort(([a], [b]) => a.localeCompare(b)).map(([model, versions]) => {
                                            const modelKey = `${manufacturer}-${model}`;
                                            const isModelExpanded = expandedModels.has(modelKey);

                                            return (
                                                <div key={modelKey} className="border-t border-[#DFE3E8]">
                                                    {/* Model row - clickable */}
                                                    <button
                                                        onClick={() => toggleModel(modelKey)}
                                                        className="w-full h-[57px] px-4 pl-16 flex items-center gap-4 hover:bg-[#EBEEF0] transition-colors cursor-pointer"
                                                        type="button"
                                                    >
                                                        {isModelExpanded ? (
                                                            <ChevronDown className="w-[21px] h-[20px] text-[#637381] shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="w-[21px] h-[20px] text-[#637381] shrink-0" />
                                                        )}
                                                        <div className="flex flex-col justify-center text-left text-[#212B36] text-[16px] font-medium leading-[28px]" style={{ fontFamily: 'Inter' }}>
                                                            {model}
                                                            <span className="text-[#637381] text-[12px] font-normal">
                                                                {versions.length} version{versions.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {/* Level 3: Versions - expandable */}
                                                    {isModelExpanded && (
                                                        <div className="bg-white border-t border-[#DFE3E8]">
                                                            {versions.map((version, idx) => (
                                                                <div
                                                                    key={version.vehicleId}
                                                                    className={`px-4 py-3 pl-24 text-[#212B36] text-[14px] ${idx !== versions.length - 1 ? 'border-b border-[#DFE3E8]' : ''}`}
                                                                    style={{ fontFamily: 'Inter' }}
                                                                >
                                                                    <div className="font-medium">
                                                                        {version.typeEngineName || 'Version inconnue'}
                                                                    </div>
                                                                    {(version.constructionIntervalStart || version.constructionIntervalEnd) && (
                                                                        <div className="text-[#637381] text-[12px] mt-1">
                                                                            {version.constructionIntervalStart || '?'} - {version.constructionIntervalEnd || '?'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
