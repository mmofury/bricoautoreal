'use client';

import { useEffect, useState } from 'react';

interface Props {
    productId: number;
}

export function OEMNumbersSection({ productId }: Props) {
    const [oemNumbers, setOemNumbers] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOEMNumbers = async () => {
            try {
                const res = await fetch(`/api/product-oem-numbers?productId=${productId}`);
                const data = await res.json();
                setOemNumbers(data.oemNumbers || {});
            } catch (error) {
                console.error('Error fetching OEM numbers:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchOEMNumbers();
    }, [productId]);

    if (loading) {
        return (
            <div className="w-full py-8">
                <p className="text-[#637381] text-sm" style={{ fontFamily: 'Inter' }}>
                    Chargement des numéros OEM...
                </p>
            </div>
        );
    }

    if (Object.keys(oemNumbers).length === 0) return null;

    return (
        <div className="w-full bg-[#F8F9F9] border-t border-b border-[#DFE3E8] py-8">
            <h2 className="text-[#212B36] text-[24px] font-semibold mb-6" style={{ fontFamily: 'Inter' }}>
                Numéros OEM
            </h2>

            <div className="relative overflow-hidden" style={{ maxHeight: '410px' }}>
                <div className="overflow-y-auto" style={{ maxHeight: '410px' }}>
                    {Object.entries(oemNumbers).map(([manufacturer, numbers], index) => (
                        <div
                            key={index}
                            className="border-b border-[#E6E9EC] py-3"
                            style={{
                                minHeight: numbers.length <= 4 ? '41px' :
                                    numbers.length <= 8 ? '61px' :
                                        numbers.length <= 12 ? '81px' : '121px'
                            }}
                        >
                            <div className="flex items-start gap-8">
                                {/* Manufacturer Name */}
                                <div className="w-[150px] flex-shrink-0">
                                    <span
                                        className="text-[#637381] text-[14px] font-normal"
                                        style={{ fontFamily: 'Inter' }}
                                    >
                                        {manufacturer}
                                    </span>
                                </div>

                                {/* OEM Numbers Grid */}
                                <div className="flex-1 flex flex-wrap gap-x-6 gap-y-2">
                                    {numbers.map((number, numIndex) => (
                                        <a
                                            key={numIndex}
                                            href={`#${number}`}
                                            className="text-[#0063B4] text-[14px] font-medium hover:underline"
                                            style={{ fontFamily: 'Inter' }}
                                        >
                                            {number}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
