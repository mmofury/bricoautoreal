'use client';

import { useEffect, useState } from 'react';

interface Props {
    productId: number;
}

export function CompatibilityBrandsList({ productId }: Props) {
    const [brands, setBrands] = useState<string[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await fetch(`/api/product-compatibility?productId=${productId}`);
                const data = await res.json();

                // Extract unique manufacturer names
                const uniqueBrands = new Set<string>();
                data.compatibilities?.forEach((compat: any) => {
                    if (compat.vehicle?.model?.manufacturer?.name) {
                        uniqueBrands.add(compat.vehicle.model.manufacturer.name);
                    }
                });

                setBrands(Array.from(uniqueBrands).sort());
            } catch (error) {
                console.error('Error fetching brands:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchBrands();
    }, [productId]);

    if (loading || brands.length === 0) return null;

    const displayBrands = showAll ? brands : brands.slice(0, 7);
    const hasMore = brands.length > 7;

    return (
        <div className="flex items-center gap-2 overflow-hidden">
            <span
                className="text-[13px] text-[#637381] font-medium"
                style={{ fontFamily: 'Inter', lineHeight: '20px' }}
            >
                Compatible avec {displayBrands.join(', ')}
            </span>
            {hasMore && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="text-[13px] text-[#0077C7] font-medium hover:underline whitespace-nowrap"
                    style={{ fontFamily: 'Inter', lineHeight: '20px' }}
                >
                    Montrer plus
                </button>
            )}
        </div>
    );
}
