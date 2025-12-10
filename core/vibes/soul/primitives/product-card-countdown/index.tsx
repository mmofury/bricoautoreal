'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface ProductCardCountdownProps {
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  discountPercentage?: number;
  available?: number;
  sold?: number;
  campaignEndDate?: Date;
}

function StarRating({ rating = 0, total = 5 }: { rating?: number; total?: number }) {
  const filled = Math.floor(rating);
  const partial = rating % 1;
  
  return (
    <div className="relative flex h-3 w-[65px] items-center">
      {/* Background stars */}
      <div className="flex gap-0">
        {Array.from({ length: total }).map((_, i) => (
          <svg key={i} width="13" height="12" viewBox="0 0 13 12" fill="none" className="h-3 w-3">
            <path
              d="M6.5 0.504028L8.204 3.94803L11.996 4.50003L9.248 7.20003L9.896 11.004L6.5 9.20403L3.104 11.004L3.752 7.20003L1.004 4.50003L4.796 3.94803L6.5 0.504028Z"
              fill="#CBD5E1"
            />
          </svg>
        ))}
      </div>
      
      {/* Filled stars overlay */}
      <div className="absolute left-0 top-0 flex gap-0 overflow-hidden" style={{ width: `${(rating / total) * 100}%` }}>
        {Array.from({ length: total }).map((_, i) => (
          <svg key={i} width="13" height="12" viewBox="0 0 13 12" fill="none" className="h-3 w-3">
            <path
              d="M6.5 0.504028L8.204 3.94803L11.996 4.50003L9.248 7.20003L9.896 11.004L6.5 9.20403L3.104 11.004L3.752 7.20003L1.004 4.50003L4.796 3.94803L6.5 0.504028Z"
              fill="#EAB308"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}

export function ProductCardCountdown({
  name,
  slug,
  imageUrl,
  price,
  compareAtPrice,
  rating,
  reviewCount,
  discountPercentage,
  available,
  sold,
  campaignEndDate,
}: ProductCardCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 31, hours: 6, minutes: 33, seconds: 51 });
  
  useEffect(() => {
    if (!campaignEndDate) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = campaignEndDate.getTime() - now;
      
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [campaignEndDate]);
  
  const progressPercent = available && sold ? (sold / (available + sold)) * 100 : 0;
  
  return (
    <div className="group relative w-full max-w-[232px]">
      {/* Image */}
      <Link href={`/product/${slug}`} className="relative mb-4 block">
        <div className="relative flex h-[230px] w-[230px] items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0]">
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        </div>
        
        {/* Discount Badge */}
        {discountPercentage && (
          <div className="absolute left-2.5 top-2.5 flex h-[22px] items-center justify-center rounded bg-[#F43F5E] px-2">
            <span className="text-[11px] font-semibold leading-[12.1px] tracking-[-0.4px] text-white">
              {discountPercentage}%
            </span>
          </div>
        )}
        
        {/* Wishlist Button */}
        <button className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white transition-colors hover:bg-gray-100">
          <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
            <path
              d="M10.5 18.375C10.25 18.375 10.0833 18.2889 9.83334 18.1168C8.41667 17.4283 7.16667 16.5676 6 15.6209C3.91667 13.8996 1.75 11.2316 1.75 7.6168C1.75 4.86271 3.91667 2.71107 6.5 2.71107C8.08334 2.71107 9.58335 3.57172 10.5 4.77664C11.4167 3.48566 12.8334 2.625 14.5 2.625C17.1666 2.625 19.25 4.86271 19.25 7.53074C19.25 11.1455 17.0833 13.8996 15 15.5348C13.9167 16.4816 12.6667 17.2561 11.3334 17.9447H11.25C10.75 18.375 10.5833 18.375 10.5 18.375Z"
              stroke="black"
              strokeWidth="1.3125"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Link>
      
      {/* Rating */}
      {rating !== undefined && (
        <div className="mb-2 flex items-center gap-2">
          <StarRating rating={rating} />
          <span className="text-xs font-bold leading-3 tracking-[-0.4px]">{rating.toFixed(2)}</span>
          {reviewCount && (
            <span className="text-[11px] leading-[11px] tracking-[-0.4px] text-[#64748B]">
              ({reviewCount})
            </span>
          )}
        </div>
      )}
      
      {/* Title */}
      <Link href={`/product/${slug}`}>
        <h3 className="mb-2 line-clamp-2 min-h-[43px] text-sm font-medium leading-[21.7px] tracking-[-0.28px] text-black">
          {name}
        </h3>
      </Link>
      
      {/* Prices */}
      <div className="mb-3 flex items-end gap-2">
        <div className="flex items-baseline gap-0.5">
          <span className="font-['Oswald'] text-[22px] font-semibold leading-[34.1px] tracking-[-0.44px] text-[#059669]">
            $
          </span>
          <span className="font-['Oswald'] text-[22px] font-semibold leading-[34.1px] tracking-[-0.44px] text-[#059669]">
            {price.toFixed(2)}
          </span>
        </div>
        
        {compareAtPrice && (
          <div className="flex items-baseline gap-0.5">
            <span className="font-['Oswald'] text-[16.7px] leading-[25.92px] tracking-[-0.44px] text-[#94A3B8] line-through">
              $
            </span>
            <span className="font-['Oswald'] text-[16.7px] leading-[25.92px] tracking-[-0.44px] text-[#94A3B8] line-through">
              {compareAtPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      {(available !== undefined || sold !== undefined) && (
        <div className="mb-3 border-t border-[#E2E8F0] pt-3">
          <div className="mb-2 flex justify-between text-xs leading-[19.2px] tracking-[-0.4px]">
            {available !== undefined && (
              <div>
                <span className="text-[#64748B]">Available:</span>
                <span className="font-bold text-[#334155]">{available}</span>
              </div>
            )}
            {sold !== undefined && (
              <div>
                <span className="text-[#64748B]">Sold:</span>
                <span className="font-bold text-[#334155]">{sold}</span>
              </div>
            )}
          </div>
          
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-[#059669]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Add to Cart Button */}
      <button className="mb-3 flex h-[34px] w-full items-center justify-center rounded-lg bg-black text-xs font-semibold leading-3 tracking-[-0.24px] text-white transition-colors hover:bg-gray-800">
        Add to cart
      </button>
      
      {/* Countdown Timer */}
      {campaignEndDate && (
        <div className="border-t border-[#E2E8F0] pt-3">
          <div className="mb-2 text-xs leading-[19.2px] tracking-[-0.4px] text-[#64748B]">
            Time remaining in the campaign:
          </div>
          
          <div className="flex gap-1">
            <div className="flex h-[30px] items-center justify-center gap-0.5 rounded-md border border-[#E2E8F0] bg-white px-2 shadow-sm">
              <span className="text-xs font-semibold leading-3 tracking-[-0.4px]">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[11px] leading-[11px] tracking-[-0.4px] text-[#94A3B8]">d</span>
            </div>
            
            <div className="flex h-[30px] items-center justify-center gap-0.5 rounded-md border border-[#E2E8F0] bg-white px-2 shadow-sm">
              <span className="text-xs font-semibold leading-3 tracking-[-0.4px]">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[11px] leading-[11px] tracking-[-0.4px] text-[#94A3B8]">h</span>
            </div>
            
            <div className="flex h-[30px] items-center justify-center gap-0.5 rounded-md border border-[#E2E8F0] bg-white px-2 shadow-sm">
              <span className="text-xs font-semibold leading-3 tracking-[-0.4px]">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[11px] leading-[11px] tracking-[-0.4px] text-[#94A3B8]">m</span>
            </div>
            
            <div className="flex h-[30px] items-center justify-center gap-0.5 rounded-md border border-[#F43F5E]/20 bg-white px-2 shadow-sm">
              <span className="text-xs font-semibold leading-3 tracking-[-0.4px] text-[#F43F5E]">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[11px] leading-[11px] tracking-[-0.4px] text-[#F43F5E]/60">s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
