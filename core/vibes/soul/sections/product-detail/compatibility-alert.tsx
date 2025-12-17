'use client';

interface Props {
    onCheckClick?: () => void;
}

export function CompatibilityAlert({ onCheckClick }: Props) {
    const handleClick = () => {
        if (onCheckClick) {
            onCheckClick();
        } else {
            // Scroll to compatibility section
            const section = document.getElementById('compatibility-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div
            className="w-full bg-[#FFFAEB] rounded-[6px] border border-[rgba(181,71,8,0.4)] p-4 flex items-center gap-4 cursor-pointer hover:bg-[#FFF8E1] transition-colors"
            onClick={handleClick}
        >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#F48E09" />
                    <path d="M10 6V11M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <span className="text-[#212B36] text-[14px] font-medium underline" style={{ fontFamily: 'Inter' }}>
                Vérifiez si ce produit est adapté à votre véhicule!
            </span>
        </div>
    );
}
