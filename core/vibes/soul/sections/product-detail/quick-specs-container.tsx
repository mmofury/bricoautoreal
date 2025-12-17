'use client';

import { useEffect, useState } from 'react';
import { QuickSpecs } from './quick-specs';

interface Specification {
    label: string;
    value: string;
}

interface Props {
    productId: number;
}

export function QuickSpecsContainer({ productId }: Props) {
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

    if (loading) return null;

    return <QuickSpecs specifications={specifications} maxVisible={4} />;
}
