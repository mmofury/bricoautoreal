'use client';

export interface VehicleFinderProps {
  title?: string;
  description?: string;
  helpText?: string;
}

export function VehicleFinder({
  title = 'Find the Right Parts Faster',
  description = 'Having the right automotive parts and car accessories will help you to boost your travel comfort and go on the long-distance journey comfortably that you have been planning.',
  helpText = 'You can find the product you are looking for faster by entering the search criteria correctly.',
}: VehicleFinderProps) {
  return (
    <div className="border-t border-[#E2E8F0] py-16">
      <div className="container mx-auto max-w-[1280px] px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-[28px] font-semibold leading-[33.6px] tracking-[-0.56px] text-[#0F172A]">
            {title}
          </h2>
          <p className="mx-auto max-w-[737px] text-[15px] leading-6 tracking-[-0.4px] text-[#64748B]">
            {description}
          </p>
        </div>
        
        <div className="rounded-lg bg-[#F8F9FA] p-8">
          <div className="mb-4 flex gap-4">
            {/* Make Selector */}
            <div className="relative flex-1">
              <div className="flex h-[46px] items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 shadow-sm">
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <span className="text-[9px] font-semibold leading-[9px] tracking-[-0.4px] text-[#94A3B8]">
                    01
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Select make"
                  className="flex-1 border-none bg-transparent text-[13px] font-medium leading-7 tracking-[-0.26px] text-[#94A3B8] outline-none placeholder:text-[#94A3B8]"
                />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Model Selector */}
            <div className="relative flex-1">
              <div className="flex h-[46px] items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 shadow-sm">
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <span className="text-[9px] font-semibold leading-[9px] tracking-[-0.4px] text-[#94A3B8]">
                    02
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Select make First"
                  className="flex-1 border-none bg-transparent text-[13px] font-medium leading-7 tracking-[-0.26px] outline-none"
                />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Year Selector */}
            <div className="relative flex-1">
              <div className="flex h-[46px] items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 shadow-sm">
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <span className="text-[9px] font-semibold leading-[9px] tracking-[-0.4px] text-[#94A3B8]">
                    03
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Select Year"
                  className="flex-1 border-none bg-transparent text-[13px] font-medium leading-7 tracking-[-0.26px] text-[#94A3B8] outline-none placeholder:text-[#94A3B8]"
                />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Engine Selector */}
            <div className="relative flex-1">
              <div className="flex h-[46px] items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 shadow-sm">
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <span className="text-[9px] font-semibold leading-[9px] tracking-[-0.4px] text-[#94A3B8]">
                    04
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Select Engine"
                  className="flex-1 border-none bg-transparent text-[13px] font-medium leading-7 tracking-[-0.26px] text-[#94A3B8] outline-none placeholder:text-[#94A3B8]"
                />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Submit Button */}
            <button className="flex h-[46px] w-[165px] items-center justify-center rounded-lg bg-black text-sm font-semibold leading-[14px] tracking-[-0.28px] text-white transition-colors hover:bg-gray-800">
              Find Auto Parts
            </button>
          </div>
          
          {helpText && (
            <p className="text-center text-xs leading-[19.2px] tracking-[-0.4px] text-[#64748B]">
              {helpText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
