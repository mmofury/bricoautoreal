'use client';

import { useEffect, useState } from 'react';

interface Props {
    supplierName: string;
}

export function BrandLogo({ supplierName }: Props) {
    const [logoFilename, setLogoFilename] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const res = await fetch(`/api/supplier-logo?name=${encodeURIComponent(supplierName)}`);
                const data = await res.json();
                setLogoFilename(data.filename);
            } catch (error) {
                console.error('Error fetching logo:', error);
            } finally {
                setLoading(false);
            }
        };

        if (supplierName) {
            void fetchLogo();
        }
    }, [supplierName]);

    if (loading || !logoFilename) return null;

    const logoSrc = `/supplier-logos/${encodeURIComponent(logoFilename)}`;

    return (
        <div className="absolute top-0 right-0 z-10 bg-white rounded-bl-lg p-2">
            <img
                src={logoSrc}
                alt={supplierName}
                width={110}
                height={60}
                className="object-contain"
            />
        </div>
    );
}
