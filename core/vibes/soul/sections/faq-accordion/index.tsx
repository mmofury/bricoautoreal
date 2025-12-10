'use client';

import { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);
  
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={index} className="border-b border-[#CBD5E1]">
          <button
            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            className="flex w-full items-center justify-between py-4 text-left"
          >
            <span className="pr-4 text-[19px] font-semibold leading-[30.4px] tracking-[-0.4px] text-[#1F2124]">
              {item.question}
            </span>
            <svg
              width="10"
              height="15"
              viewBox="0 0 10 15"
              fill="none"
              className={`flex-shrink-0 transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            >
              <path
                d="M4.19315 10.3268L0.206653 6.34035C-0.0688844 6.06481 -0.0688844 5.61926 0.206653 5.34665L0.869116 4.68419C1.14465 4.40865 1.5902 4.40865 1.86281 4.68419L4.68853 7.50992L7.51426 4.68419C7.7898 4.40865 8.23535 4.40865 8.50795 4.68419L9.17041 5.34665C9.44595 5.62219 9.44595 6.06774 9.17041 6.34035L5.18392 10.3268C4.91424 10.6024 4.46869 10.6024 4.19315 10.3268Z"
                fill={openIndex === index ? '#1F2124' : 'black'}
              />
            </svg>
          </button>
          
          {openIndex === index && (
            <div className="pb-6">
              <div className="text-[15px] leading-6 tracking-[-0.4px] text-[#475569]">
                {item.answer}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
