'use client';

import dynamic from 'next/dynamic';

export const VehicleFinder = dynamic(() => import('./index').then((m) => m.VehicleFinder), {
  ssr: false,
});







