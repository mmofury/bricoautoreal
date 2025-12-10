'use client';

import { VehicleFinder } from '~/components/vehicle-finder';

interface VehicleSearchBarProps {
  locale: string;
}

export function VehicleSearchBar({ locale }: VehicleSearchBarProps) {
  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="relative -mt-14 rounded-lg bg-[#FFCC00] p-6 shadow-lg">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
          {/* Left Section - Icon & Text */}
          <div className="flex items-center gap-4 lg:w-[400px] lg:flex-shrink-0">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-[3px] outline-white">
              <svg
                className="h-10 w-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-black">Tout commence ici</h2>
              <p className="text-xl text-black">Ajoutez votre véhicule pour voir les pièces compatibles</p>
            </div>
          </div>

          {/* Right Section - Vehicle Finder avec style personnalisé */}
          <div className="w-full lg:flex-1">
            <div className="vehicle-finder-yellow">
              <style jsx>{`
                .vehicle-finder-yellow :global(select) {
                  width: 100%;
                  border-radius: 0.5rem;
                  background-color: white;
                  padding: 0.75rem 1rem;
                  font-size: 0.875rem;
                  color: #373737;
                  outline: 2px solid #373737;
                  outline-offset: -2px;
                  transition: all 0.2s;
                  border: none;
                }
                .vehicle-finder-yellow :global(select:hover) {
                  background-color: #f9fafb;
                }
                .vehicle-finder-yellow :global(select:disabled) {
                  opacity: 0.5;
                  cursor: not-allowed;
                }
                .vehicle-finder-yellow :global(button) {
                  width: 100%;
                  border-radius: 0.5rem;
                  background-color: #1E1E1E;
                  padding: 0.75rem 1rem;
                  font-size: 0.875rem;
                  font-weight: 700;
                  color: white;
                  transition: all 0.2s;
                  margin-top: 0.5rem;
                }
                .vehicle-finder-yellow :global(button:hover:not(:disabled)) {
                  background-color: #373737;
                }
                .vehicle-finder-yellow :global(button:disabled) {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
                .vehicle-finder-yellow :global(.space-y-3) {
                  display: flex;
                  flex-direction: column;
                  gap: 0.75rem;
                  background: transparent;
                  padding: 0;
                  box-shadow: none;
                }
              `}</style>
              <VehicleFinder locale={locale} variant="embedded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

