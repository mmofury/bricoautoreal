'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { clsx } from 'clsx';

interface Props {
    className?: string;
    couponCode: string;
}

export function CouponApplyButton({ className, couponCode }: Props) {
    const [applied, setApplied] = useState(false);

    const handleClick = () => {
        setApplied(true);
    };

    if (applied) {
        return (
            <span className={clsx("flex items-center text-green-600 font-medium text-sm animate-in fade-in zoom-in ml-2", className)}>
                <Check size={16} className="mr-1" />
                Appliqué !
            </span>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={clsx(
                "ml-2 text-[12px] font-bold bg-[#373737] text-white px-3 py-1 rounded-full hover:bg-black transition-colors uppercase tracking-wide",
                className
            )}
            type="button"
            aria-label={`Apply coupon ${couponCode}`}
        >
            Appliquer
        </button>
    );
}
