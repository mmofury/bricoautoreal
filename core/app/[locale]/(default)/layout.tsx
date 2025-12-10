import { setRequestLocale } from 'next-intl/server';
import { PropsWithChildren } from 'react';

import { Footer } from '~/components/footer';
import { Header } from '~/components/header';
import { PromoBanner } from '~/components/promo-banner';

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>;
}

export default async function DefaultLayout({ params, children }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <>
      <PromoBanner />
      <Header />

      <main>{children}</main>

      <Footer />
    </>
  );
}

export const experimental_ppr = true;
