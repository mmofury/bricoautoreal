import Image from 'next/image';
import Link from 'next/link';

interface PromotionalCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  href: string;
}

interface PromotionalCardsProps {
  title: string;
  cards: PromotionalCard[];
}

export function PromotionalCards({ title, cards }: PromotionalCardsProps) {
  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="mb-6">
        <h2 className="mb-4 text-4xl text-[#373737]">
          <span className="font-extrabold">{title.split(' ')[0]} </span>
          <span className="font-thin">{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        <div className="flex gap-1">
          <div className="h-[3px] w-[110px] rounded bg-[#FFDC4D]" />
          <div className="h-[3px] flex-1 rounded bg-white" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group overflow-hidden rounded-lg bg-white shadow-lg transition hover:shadow-xl"
          >
            {/* Card Image */}
            <div className="relative h-[250px] w-full overflow-hidden">
              <Image
                src={card.imageUrl}
                alt={card.title}
                fill
                className="object-cover transition group-hover:scale-105"
              />
            </div>

            {/* Card Content */}
            <div className="p-6 text-center">
              <h3 className="mb-3 text-2xl font-bold text-[#373737]">{card.title}</h3>
              <p className="text-xl leading-relaxed text-[#373737]">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

