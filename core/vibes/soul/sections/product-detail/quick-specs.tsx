'use client';

import { useState } from 'react';

interface Specification {
    label: string;
    value: string;
}

interface Props {
    specifications: Specification[];
    maxVisible?: number;
}

export function QuickSpecs({ specifications, maxVisible = 4 }: Props) {
    const [showAll, setShowAll] = useState(false);

    const visibleSpecs = showAll ? specifications : specifications.slice(0, maxVisible);
    const hasMore = specifications.length > maxVisible;

    if (specifications.length === 0) return null;

    return (
        <div className="w-full">
            <div className="space-y-2">
                {visibleSpecs.map((spec, index) => (
                    <div key={index} className="flex items-start gap-4 overflow-hidden h-[20px]">
                        <span
                            className="text-[#637381] text-[14px] font-normal flex-shrink-0 leading-[20px]"
                            style={{ fontFamily: 'Inter' }}
                        >
                            {spec.label}:
                        </span>
                        <span
                            className="text-[#212B36] text-[14px] font-medium leading-[20px]"
                            style={{ fontFamily: 'Inter' }}
                        >
                            {spec.value}
                        </span>
                    </div>
                ))}
            </div>

            {hasMore && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="mt-4 text-[#0077C7] text-[14px] font-medium hover:underline"
                    style={{ fontFamily: 'Inter' }}
                    type="button"
                >
                    Tout afficher
                </button>
            )}
        </div>
    );
}
