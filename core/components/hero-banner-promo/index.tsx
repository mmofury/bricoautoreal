import Image from 'next/image';
import Link from 'next/link';

interface PromoCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface HeroBannerPromoProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  promoCards: PromoCard[];
}

export function HeroBannerPromo({
  title,
  subtitle,
  ctaText,
  ctaLink,
  imageUrl,
  promoCards,
}: HeroBannerPromoProps) {
  return (
    <div className="bg-[#1E1E1E] rounded-b-2xl pb-10">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {/* Hero Banner */}
        <div className="pt-4">
          <div className="relative overflow-hidden rounded-lg bg-white">
            <div className="grid lg:grid-cols-2">
              {/* Left Content */}
              <div className="flex flex-col justify-center p-5 lg:p-8">
                <h1 className="mb-4 text-4xl font-bold leading-tight text-[#1E1E1E] lg:text-5xl">
                  {title}
                </h1>
                <p className="mb-6 text-xl font-bold text-[#1E1E1E]">{subtitle}</p>
                <Link
                  href={ctaLink}
                  className="inline-flex w-fit items-center justify-center rounded-lg bg-[#FFCC00] px-10 py-3 text-sm font-bold text-[#1E1E1E] outline outline-2 outline-[#FFCC00] transition hover:bg-[#FFD700]"
                >
                  {ctaText}
                </Link>
              </div>

              {/* Right Image */}
              <div className="relative h-[305px] overflow-hidden rounded-r-lg bg-black">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promo Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {promoCards.map((card, index) => (
            <div
              key={index}
              className="rounded-lg bg-white p-4 outline outline-1 outline-[#DADADA]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-[#1E1E1E]">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold leading-tight text-[#1E1E1E]">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#373737]">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

