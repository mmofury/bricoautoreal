'use client';

interface Props {
    brandName?: string;
    brandImageUrl?: string;
    isPremium?: boolean;
}

export function ProductBadges({ brandName = 'BOSCH', brandImageUrl, isPremium = true }: Props) {
    return (
        <div className="absolute top-0 left-0 z-10 flex gap-3 p-4">
            {/* Premium Badge */}
            {isPremium && (
                <div className="flex items-center h-[28px] bg-white rounded-full border border-[#D72B2B]">
                    <div className="w-[26px] h-[26px] bg-[#D72B2B] rounded-full flex items-center justify-center ml-[1px]">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M9 0L11.5 6.5L18 9L11.5 11.5L9 18L6.5 11.5L0 9L6.5 6.5L9 0Z" fill="white" />
                        </svg>
                    </div>
                    <span className="px-3 text-[14px] font-medium text-[#212B36]" style={{ fontFamily: 'Inter' }}>
                        Premium
                    </span>
                </div>
            )}

            {/* Brand Logo Badge */}
            {brandImageUrl && (
                <div className="h-[32px] bg-white rounded-full px-4 flex items-center">
                    <img src={brandImageUrl} alt={brandName} className="h-[23px] object-contain" />
                </div>
            )}
        </div>
    );
}
