'use client';

interface Props {
    estimatedDate?: string;
    shippingPrice?: string;
}

export function ShippingInfo({
    estimatedDate = 'Demain (17/12/2025)',
    shippingPrice = '3,90 €'
}: Props) {
    const paymentLogos = [
        { name: 'CB', width: 33 },
        { name: 'Mastercard', width: 33 },
        { name: 'Visa', width: 46 },
        { name: 'American Express', width: 74 },
        { name: 'Discover', width: 34 },
        { name: 'PayPal', width: 72 },
    ];

    return (
        <div className="w-full border-b border-[#DFE3E8] py-5">
            <div className="flex items-start justify-between">
                {/* Shipping Info */}
                <div className="flex items-start gap-3">
                    <div className="w-9 h-7 flex items-center justify-center">
                        <svg width="36" height="29" viewBox="0 0 36 29" fill="none">
                            <path d="M1 7.5H23V22.5H1V7.5Z" stroke="#212B36" strokeWidth="1.5" />
                            <path d="M23 12.5H28L32 16.5V22.5H23V12.5Z" stroke="#212B36" strokeWidth="1.5" />
                            <circle cx="8" cy="23" r="3" stroke="#212B36" strokeWidth="1.5" />
                            <circle cx="27" cy="23" r="3" stroke="#212B36" strokeWidth="1.5" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[#212B36] text-[16px] font-medium" style={{ fontFamily: 'Inter' }}>
                                Prêt pour l'expédition
                            </span>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="7.5" fill="#007ACE" />
                                <path d="M6 9L8 11L12 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-[#212B36] text-[14px] font-medium" style={{ fontFamily: 'Inter' }}>
                                {estimatedDate}
                            </span>
                            <span className="text-[#637381] text-[14px] font-normal lowercase" style={{ fontFamily: 'Inter' }}>
                                À partir de {shippingPrice}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payment Logos */}
                <div className="flex items-center">
                    <img
                        src="/List.png"
                        alt="Moyens de paiement acceptés"
                        className="h-[22px] w-auto"
                    />
                </div>
            </div>
        </div>
    );
}
