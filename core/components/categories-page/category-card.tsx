import Image from 'next/image';
import { Link } from '~/components/link';

interface CategoryCardProps {
    id: string;
    label: string;
    labelFr?: string | null;
    url?: string | null;
    locale: string;
    imageSize?: 'large' | 'small';
}

export function CategoryCard({
    id,
    label,
    labelFr,
    url,
    locale,
    imageSize = 'large',
}: CategoryCardProps) {
    const displayLabel = labelFr || label;
    const imageWidth = imageSize === 'large' ? 135 : 90;
    const imageHeight = 90;

    // Determine if label needs two lines (for longer category names)
    const needsTwoLines = displayLabel.length > 20;

    return (
        <Link
            href={url || `/${locale}/pieces-detachees/${id}`}
            className="block w-[237px] h-[182px] bg-white rounded-md border border-[#DFE3E8] hover:shadow-lg transition-shadow"
        >
            <div className="relative w-full h-full p-[25px] flex flex-col items-center">
                {/* Category Image */}
                <div className="relative mb-auto">
                    <Image
                        src={`https://placehold.co/${imageWidth}x${imageHeight}`}
                        alt={displayLabel}
                        width={imageWidth}
                        height={imageHeight}
                        className="object-cover"
                        unoptimized
                    />
                </div>

                {/* Category Label Overlay */}
                <div
                    className={`absolute ${needsTwoLines ? 'bottom-[18px]' : 'bottom-[27px]'} left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white/60 backdrop-blur-sm`}
                    style={{
                        maxWidth: needsTwoLines ? '187px' : 'auto',
                    }}
                >
                    <p
                        className="text-[#212B36] text-[14px] font-medium leading-[18px] text-center"
                        style={{ fontFamily: 'Inter' }}
                    >
                        {displayLabel}
                    </p>
                </div>
            </div>
        </Link>
    );
}
