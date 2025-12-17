import Link from 'next/link';

export function RecyclingBanner() {
  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="flex items-center justify-center gap-4 rounded bg-[#1E1E1E] p-3">
        <div className="flex items-center gap-2">
          <svg className="h-8 w-8 text-[#FFCC00]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2zm0 2.83l5.79 14.17L12 16.5 6.21 19 12 4.83z" />
          </svg>
          <span className="text-xl font-semibold text-[#FFCC00]">Advance</span>
        </div>

        <span className="text-sm text-[#F2F2F2]">Oil & Battery Recycling</span>

        <Link
          href="/store-locator"
          className="rounded-lg bg-[#FFCC00] px-6 py-3 text-sm font-bold text-[#1E1E1E] outline outline-2 outline-[#FFCC00] transition hover:bg-[#FFD700]"
        >
          Find My Store
        </Link>
      </div>
    </div>
  );
}

