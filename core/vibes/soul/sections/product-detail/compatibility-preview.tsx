'use client';

import { useEffect, useState } from 'react';

interface Props {
    productId: string;
    maxVisible?: number;
}

export function CompatibilityPreview({ productId, maxVisible = 5 }: Props) {
    const [brands, setBrands] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await fetch(`/api/product-brands?productId=${productId}`);
                const data = await res.json();
                setBrands(data.brands || []);
            } catch (error) {
                console.error('Error fetching brands:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchBrands();
    }, [productId]);

    if (loading || brands.length === 0) return null;

    const visibleBrands = brands.slice(0, maxVisible);
    const hasMore = brands.length > maxVisible;

    const handleShowMore = () => {
        const compatibilitySection = document.getElementById('compatibility-accordion');
        if (compatibilitySection) {
            compatibilitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Optionally trigger accordion open
            const accordionButton = compatibilitySection.querySelector('button');
            if (accordionButton && accordionButton.getAttribute('aria-expanded') === 'false') {
                accordionButton.click();
            }
        }
    };

    return (
        <div className="relative h-[20px] w-full overflow-hidden">
            <div className="absolute left-0 top-[2px] flex flex-col justify-center text-[#637381] text-[13px] font-medium leading-[20px] break-words" style={{ fontFamily: 'Inter' }}>
                Compatible avec {visibleBrands.join(', ')}
            </div>
            {hasMore && (
                <div className="absolute right-0 top-0 h-[20px] bg-white pl-2">
                    <button
                        onClick={handleShowMore}
                        className="flex flex-col justify-center text-[#0077C7] text-[13px] font-medium leading-[20px] break-words hover:underline cursor-pointer"
                        style={{ fontFamily: 'Inter' }}
                        type="button"
                    >
                        Montrer plus
                    </button>
                </div>
            )}
        </div>
    );
}
