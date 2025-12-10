 'use client';

import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

const VehicleBadge = dynamic(() => import('~/components/vehicle-badge').then((m) => ({ default: m.VehicleBadge })), {
  ssr: false,
});

type VehicleBadgeLauncherProps = {
  variant?: 'default' | 'menu' | 'search';
};

export function VehicleBadgeLauncher({ variant = 'default' }: VehicleBadgeLauncherProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Charger le label courant depuis le localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('selected_vehicle_label');
      if (stored) setCurrentLabel(stored);
    } catch {
      // ignore
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'selected_vehicle_label') {
        setCurrentLabel(event.newValue);
      }
    };
    const handleCleared = () => setCurrentLabel(null);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('vehicle-cleared', handleCleared);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('vehicle-cleared', handleCleared);
    };
  }, []);

  useEffect(() => {
    let frame: number;
    if (open) {
      frame = requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'search'
            ? 'flex items-center gap-2 text-sm text-[#373737] font-normal'
            : variant === 'menu'
              ? 'flex items-center gap-3 rounded-full bg-[#3a414c] px-3 py-2 shadow-sm ring-1 ring-[#4b5563] transition hover:bg-[#4a5563] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea1ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f363f]'
              : 'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-[#3a414c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea1ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f363f]'
        }
      >
        {variant === 'search' ? (
          <span className="truncate max-w-[120px]">
            {currentLabel || 'Ajouter un véhicule'}
          </span>
        ) : variant === 'menu' ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a5563] ring-1 ring-[#4b5563]">
              <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-[#e8ecf1]">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.5243 12.0005C18.5243 15.8665 15.4687 19.0005 11.6993 19.0005C11.6993 15.6865 12.6743 11.5005 17.5493 11.0005H18.4551C18.5013 11.3317 18.5244 11.6659 18.5243 12.0005V12.0005Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M5.92587 10.2543C5.51382 10.2121 5.14552 10.5119 5.10326 10.9239C5.061 11.336 5.36078 11.7043 5.77283 11.7465L5.92587 10.2543ZM11.6993 19.0004L11.6993 19.7504C11.8982 19.7505 12.089 19.6714 12.2296 19.5308C12.3703 19.3901 12.4493 19.1994 12.4493 19.0004H11.6993ZM4.88289 12.3342L4.1337 12.3691L4.88289 12.3342ZM11.0491 5.03234L10.9758 4.28594L11.0491 5.03234ZM17.7124 11.1049C17.7702 11.5151 18.1495 11.8008 18.5596 11.7431C18.9698 11.6854 19.2555 11.3061 19.1978 10.8959L17.7124 11.1049ZM5.84935 11.7504C6.26356 11.7504 6.59935 11.4146 6.59935 11.0004C6.59935 10.5862 6.26356 10.2504 5.84935 10.2504V11.7504ZM4.94357 10.2504C4.52936 10.2504 4.19357 10.5862 4.19357 11.0004C4.19357 11.4146 4.52936 11.7504 4.94357 11.7504V10.2504ZM5.84935 10.2504C5.43514 10.2504 5.09935 10.5862 5.09935 11.0004C5.09935 11.4146 5.43514 11.7504 5.84935 11.7504V10.2504ZM17.5493 11.7504C17.9636 11.7504 18.2993 11.4146 18.2993 11.0004C18.2993 10.5862 17.9636 10.2504 17.5493 10.2504V11.7504ZM5.77283 11.7465C7.96327 11.9712 9.21227 12.9978 9.94811 14.3117C10.7101 15.6722 10.9493 17.3973 10.9493 19.0004H12.4493C12.4493 17.2895 12.2011 15.2646 11.2568 13.5787C10.2864 11.846 8.61043 10.5297 5.92587 10.2543L5.77283 11.7465ZM11.6994 18.2504C8.47411 18.2501 5.78794 15.6476 5.63208 12.2994L4.1337 12.3691C4.32526 16.4842 7.63958 19.75 11.6993 19.7504L11.6994 18.2504ZM5.63208 12.2994C5.47617 8.95004 7.91012 6.09445 11.1225 5.77875L10.9758 4.28594C6.93637 4.68292 3.9422 8.25515 4.1337 12.3691L5.63208 12.2994ZM11.1225 5.77875C14.3322 5.46331 17.2458 7.78918 17.7124 11.1049L19.1978 10.8959C18.6237 6.8165 15.0179 3.8887 10.9758 4.28594L11.1225 5.77875ZM5.84935 10.2504H4.94357V11.7504H5.84935V10.2504ZM5.84935 11.7504H17.5493V10.2504H5.84935V11.7504Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="hidden flex-col leading-none md:flex text-left">
              <span className="text-xs text-[#cbd5e1]">
                {currentLabel ? 'Véhicule en cours' : 'Ajouter un véhicule'}
              </span>
              <span className="text-sm font-semibold text-white">
                {currentLabel || 'Mon garage'}
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm font-semibold">
            {currentLabel || 'Mon garage'}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className={`absolute inset-0 bg-transparent transition-opacity duration-150 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={`relative h-full w-[320px] max-w-[85vw] overflow-hidden border-l border-[#4b5563] bg-[#2f363f] shadow-2xl ring-1 ring-black/30 transform transition-transform duration-200 ease-out ${
              animateIn ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#3a414c] bg-[#242a32]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4a5563] text-white shadow-inner shadow-black/20">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.5243 12.0005C18.5243 15.8665 15.4687 19.0005 11.6993 19.0005C11.6993 15.6865 12.6743 11.5005 17.5493 11.0005H18.4551C18.5013 11.3317 18.5244 11.6659 18.5243 12.0005V12.0005Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M5.92587 10.2543C5.51382 10.2121 5.14552 10.5119 5.10326 10.9239C5.061 11.336 5.36078 11.7043 5.77283 11.7465L5.92587 10.2543ZM11.6993 19.0004L11.6993 19.7504C11.8982 19.7505 12.089 19.6714 12.2296 19.5308C12.3703 19.3901 12.4493 19.1994 12.4493 19.0004H11.6993ZM4.88289 12.3342L4.1337 12.3691L4.88289 12.3342ZM11.0491 5.03234L10.9758 4.28594L11.0491 5.03234ZM17.7124 11.1049C17.7702 11.5151 18.1495 11.8008 18.5596 11.7431C18.9698 11.6854 19.2555 11.3061 19.1978 10.8959L17.7124 11.1049ZM5.84935 11.7504C6.26356 11.7504 6.59935 11.4146 6.59935 11.0004C6.59935 10.5862 6.26356 10.2504 5.84935 10.2504V11.7504ZM4.94357 10.2504C4.52936 10.2504 4.19357 10.5862 4.19357 11.0004C4.19357 11.4146 4.52936 11.7504 4.94357 11.7504V10.2504ZM5.84935 10.2504C5.43514 10.2504 5.09935 10.5862 5.09935 11.0004C5.09935 11.4146 5.43514 11.7504 5.84935 11.7504V10.2504ZM17.5493 11.7504C17.9636 11.7504 18.2993 11.4146 18.2993 11.0004C18.2993 10.5862 17.9636 10.2504 17.5493 10.2504V11.7504ZM5.77283 11.7465C7.96327 11.9712 9.21227 12.9978 9.94811 14.3117C10.7101 15.6722 10.9493 17.3973 10.9493 19.0004H12.4493C12.4493 17.2895 12.2011 15.2646 11.2568 13.5787C10.2864 11.846 8.61043 10.5297 5.92587 10.2543L5.77283 11.7465ZM11.6994 18.2504C8.47411 18.2501 5.78794 15.6476 5.63208 12.2994L4.1337 12.3691C4.32526 16.4842 7.63958 19.75 11.6993 19.7504L11.6994 18.2504ZM5.63208 12.2994C5.47617 8.95004 7.91012 6.09445 11.1225 5.77875L10.9758 4.28594C6.93637 4.68292 3.9422 8.25515 4.1337 12.3691L5.63208 12.2994ZM11.1225 5.77875C14.3322 5.46331 17.2458 7.78918 17.7124 11.1049L19.1978 10.8959C18.6237 6.8165 15.0179 3.8887 10.9758 4.28594L11.1225 5.77875ZM5.84935 10.2504H4.94357V11.7504H5.84935V10.2504ZM5.84935 11.7504H17.5493V10.2504H5.84935V11.7504Z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <p className="text-sm font-semibold text-white">Mon garage</p>
                  <p className="text-xs text-[#cbd5e1]">Sélectionne ton véhicule pour filtrer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-sm text-gray-300 transition hover:bg-[#3a414c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea1ff]"
                aria-label="Fermer"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
                  <path d="M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4Z" />
                </svg>
              </button>
            </div>

            <div className="px-4 pb-6 pt-4 h-[calc(100%-64px)] overflow-auto bg-[#2f363f]">
              <VehicleBadge locale={locale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

