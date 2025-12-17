'use client';

import { useEffect, useState } from 'react';

interface Props {
    productId: number;
}

export function CompatibilitySectionTitle({ productId }: Props) {
    const [title, setTitle] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProductInfo = async () => {
            try {
                console.log('CompatibilitySectionTitle - productId:', productId);
                const res = await fetch(`/api/product-basic-info?productId=${productId}`);
                const data = await res.json();
                console.log('CompatibilitySectionTitle - API response:', data);

                if (data.productName && data.supplierName && data.searchNumber) {
                    const title = `${data.productName} ${data.supplierName} ${data.searchNumber}`;
                    console.log('CompatibilitySectionTitle - Setting title:', title);
                    setTitle(title);
                }
            } catch (error) {
                console.error('Error fetching product info:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchProductInfo();
    }, [productId]);

    if (loading) return <div className="h-8 bg-gray-200 animate-pulse rounded"></div>;

    return (
        <h2 className="text-[#212B36] text-[24px] font-semibold mb-6" style={{ fontFamily: 'Inter' }}>
            {title} compatible avec ces véhicules
        </h2>
    );
}
