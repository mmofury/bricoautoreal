import { ReactNode } from 'react';

interface PromoCard {
  icon: ReactNode;
  title: string;
  description: string;
}

interface PromoCardsProps {
  cards: PromoCard[];
}

export function PromoCards({ cards }: PromoCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="flex flex-col rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          style={{ clipPath: 'polygon(0 30px, 30px 0, 100% 0, 100% 100%, 0 100%)' }}
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex-shrink-0">{card.icon}</div>
            <h3 className="text-lg font-bold leading-tight text-gray-900 md:text-xl">
              {card.title}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
