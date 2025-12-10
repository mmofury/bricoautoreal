'use client';

export interface Review {
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  verified: boolean;
}

export interface ReviewsSectionProps {
  rating: number;
  totalReviews: number;
  reviews: Review[];
  title?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10.2976 14.7453L14.0308 13.9393L15.7576 19.3938L9.90291 15.0285L3.81987 19.3938L6.18085 12.2177L0 7.78262H7.63976L9.99976 0.605957L12.3607 7.78262H20L10.2976 14.7453Z"
        fill={filled ? 'white' : 'transparent'}
      />
    </svg>
  );
}

export function ReviewsSection({ rating, totalReviews, reviews, title = 'Excellend' }: ReviewsSectionProps) {
  return (
    <div className="border-t border-[#E2E8F0] py-16">
      <div className="container mx-auto max-w-[1280px] px-4">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[auto,1fr]">
          {/* Rating Summary */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="mb-4 text-[22px] font-semibold leading-[33px] tracking-[-0.44px] text-[#212529]">
              {title}
            </h2>
            
            <div className="mb-4 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex h-[26px] w-[26px] items-center justify-center rounded-sm bg-[#F43F5E]">
                  <StarIcon filled />
                </div>
              ))}
            </div>
            
            <div className="mb-6 text-xs leading-[19.2px] tracking-[-0.4px] text-[#64748B]">
              Based on{' '}
              <span className="font-bold underline">{totalReviews.toLocaleString()} reviews</span>
            </div>
            
            <p className="mb-8 max-w-[200px] text-xs leading-[19.2px] tracking-[-0.4px] text-[#212529]">
              All comments are from real users who have made purchases before.
            </p>
            
            <div className="text-xs font-medium leading-[19.2px] tracking-[-0.4px] text-[#94A3B8]">
              Showing our 5 star reviews.
            </div>
          </div>
          
          {/* Reviews Grid */}
          <div className="relative">
            <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
              {reviews.map((review, index) => (
                <div key={index} className="w-[231px] flex-shrink-0">
                  {/* Stars */}
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex h-4 w-4 items-center justify-center rounded-sm ${
                          i < review.rating ? 'bg-[#F43F5E]' : 'bg-gray-200'
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M6.17855 8.84713L8.41851 8.36353L9.45455 11.6363L5.94175 9.01705L2.29192 11.6363L3.70851 7.33054L0 4.66953H4.58385L5.99985 0.363525L7.41644 4.66953H12L6.17855 8.84713Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                  
                  {review.verified && (
                    <div className="mb-2 flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="flex-shrink-0">
                        <path
                          d="M5.50002 10.0834C8.03133 10.0834 10.0834 8.03139 10.0834 5.50008C10.0834 2.96878 8.03133 0.916748 5.50002 0.916748C2.96872 0.916748 0.916687 2.96878 0.916687 5.50008C0.916687 8.03139 2.96872 10.0834 5.50002 10.0834Z"
                          stroke="#64748B"
                          strokeWidth="0.916667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5.5 3.66675V5.50008"
                          stroke="#64748B"
                          strokeWidth="0.916667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5.5 7.33325H5.50458"
                          stroke="#64748B"
                          strokeWidth="0.916667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-[11px] font-medium leading-[17.6px] tracking-[-0.4px] text-[#64748B]">
                        Purchased user
                      </span>
                    </div>
                  )}
                  
                  {/* Title */}
                  <h3 className="mb-2 text-[15px] font-semibold leading-[22.5px] tracking-[-0.3px] text-[#212529]">
                    {review.title}
                  </h3>
                  
                  {/* Content */}
                  <p className="mb-4 line-clamp-2 text-xs leading-[19.2px] tracking-[-0.4px] text-[#475569]">
                    {review.content}
                  </p>
                  
                  {/* Author & Date */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold leading-[19.2px] tracking-[-0.4px] text-[#475569]">
                      {review.author}
                    </span>
                    <span className="text-[11px] leading-[17.6px] tracking-[-0.4px] text-[#94A3B8]">
                      {review.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button className="absolute -left-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#CBD5E1] bg-white text-[5px] font-semibold">
              prev
            </button>
            <button className="absolute -right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#CBD5E1] bg-white text-[5px] font-semibold">
              next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
