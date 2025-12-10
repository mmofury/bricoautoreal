'use client';

import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';

const VehicleBadge = dynamic(() => import('~/components/vehicle-badge').then((m) => ({ default: m.VehicleBadge })), {
  ssr: false,
});

export function VehicleBadgeClientWrapper() {
  const locale = useLocale();

  return <VehicleBadge locale={locale} />;
}







