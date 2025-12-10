'use client';

import { useState, useEffect } from 'react';

interface CountdownTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  discount?: string;
  discountLabel?: string;
  campaignEndDate?: Date;
  imageUrl?: string;
  indicators?: number;
  activeIndicator?: number;
}

function calculateTimeLeft(endDate: Date): CountdownTimer {
  const difference = +endDate - +new Date();
  
  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  
  return { days: 0, hours: 0, minutes: 0, seconds: 0 };
}

export function HeroBanner({
  eyebrow = 'Refreshin spring deals',
  title,
  description,
  ctaText = 'View All Products',
  ctaLink = '#',
  discount,
  discountLabel = 'Total discount in the campaign',
  campaignEndDate,
  imageUrl,
  indicators = 2,
  activeIndicator = 0,
}: HeroBannerProps) {
  const [timeLeft, setTimeLeft] = useState<CountdownTimer>({ days: 9, hours: 9, minutes: 33, seconds: 51 });

  useEffect(() => {
    if (!campaignEndDate) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(campaignEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [campaignEndDate]);

  return (
    <div className="border-b border-[#E2E8F0] py-16">
      <div className="container mx-auto max-w-[1280px] px-4">
        <div className="relative flex min-h-[540px] items-center">
          {/* Content */}
          <div className="max-w-[576px]">
            <div className="mb-8 text-xs font-semibold uppercase leading-[18px] tracking-[0.6px] text-[#64748B]">
              {eyebrow}
            </div>
            
            <h1 className="mb-6 text-[66px] font-extrabold leading-[72.6px] tracking-[-1.65px] text-[#212529]">
              {title}
            </h1>
            
            <p className="mb-8 text-lg leading-[28.8px] tracking-[-0.4px] text-[#64748B]">
              {description}
            </p>
            
            {ctaText && (
              <a
                href={ctaLink}
                className="inline-flex h-[42px] items-center justify-center rounded-lg bg-black px-5 text-sm font-semibold leading-[14px] tracking-[-0.28px] text-white transition-colors hover:bg-gray-800"
              >
                {ctaText}
              </a>
            )}
            
            {campaignEndDate && (
              <div className="mt-8">
                <div className="mb-2 text-xs leading-[13.2px] tracking-[-0.4px] text-[#94A3B8]">
                  Time remaining until the end of the campaign:
                </div>
                
                <div className="flex gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium leading-3 tracking-[-0.4px] text-[#64748B]">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="text-xs leading-3 tracking-[-0.4px] text-[#94A3B8]">Day</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium leading-3 tracking-[-0.4px] text-[#64748B]">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-xs leading-3 tracking-[-0.4px] text-[#94A3B8]">hours.</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium leading-3 tracking-[-0.4px] text-[#64748B]">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-xs leading-3 tracking-[-0.4px] text-[#94A3B8]">min.</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium leading-3 tracking-[-0.4px] text-[#64748B]">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-xs leading-3 tracking-[-0.4px] text-[#94A3B8]">sec.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Discount Badge */}
          {discount && (
            <div className="absolute right-0 top-8 text-right">
              <div className="text-[60px] font-extrabold leading-[60px] tracking-[-0.4px]">
                {discount}
              </div>
              <div className="mt-2 text-xs leading-[19.2px] tracking-[-0.4px] text-[#94A3B8]">
                {discountLabel}
              </div>
            </div>
          )}
          
          {/* Image */}
          {imageUrl && (
            <div className="absolute right-0 top-0 h-full w-1/2">
              <img src={imageUrl} alt="" className="h-full w-full object-contain" />
            </div>
          )}
        </div>
        
        {/* Indicators */}
        {indicators > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: indicators }).map((_, index) => (
              <button
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === activeIndicator ? 'bg-black' : 'bg-black/30'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
