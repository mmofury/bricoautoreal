'use client';

import { useEffect, useState } from 'react';

interface Specification {
    label: string;
    value: string;
}

interface Props {
    productId: number;
    productName: string;
}

export function ProductSpecifications({ productId, productName }: Props) {
    const [specifications, setSpecifications] = useState<Specification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpecifications = async () => {
            try {
                const res = await fetch(`/api/product-specifications?productId=${productId}`);
                const data = await res.json();
                setSpecifications(data.specifications || []);
            } catch (error) {
                console.error('Error fetching specifications:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchSpecifications();
    }, [productId]);

    if (loading) {
        return (
            <div className="w-full bg-[#F8F9F9] border-t border-b border-[#DFE3E8] py-12">
                <div className="mx-auto max-w-screen-xl px-4">
                    <p className="text-[#637381] text-sm" style={{ fontFamily: 'Inter' }}>
                        Chargement des spécifications...
                    </p>
                </div>
            </div>
        );
    }

    if (specifications.length === 0) return null;

    return (
        <div className="w-full bg-[#F8F9F9] border-t border-b border-[#DFE3E8] py-12">
            <h2 className="text-[#212B36] text-[24px] font-semibold mb-6" style={{ fontFamily: 'Inter' }}>
                {productName} informations techniques
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                {specifications.map((spec, index) => (
                    <div
                        key={index}
                        className="border-b border-[#E6E9EC] py-3 flex justify-between items-start gap-4"
                    >
                        <div className="text-[#637381] text-[14px] font-normal flex-shrink-0" style={{ fontFamily: 'Inter' }}>
                            {spec.label}:
                        </div>
                        <div className="text-[#212B36] text-[14px] font-medium text-right" style={{ fontFamily: 'Inter' }}>
                            {spec.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
