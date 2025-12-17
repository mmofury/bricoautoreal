import { setRequestLocale } from 'next-intl/server';
import { PropsWithChildren } from 'react';

import { Footer } from '~/components/footer';
import { Header } from '~/components/header';
import { PromoBanner } from '~/components/promo-banner';

// Force static rendering to bypass streaming issues in dev
// Force static rendering to bypass streaming issues in dev
// export const dynamic = 'force-static';
// export const revalidate = false;

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

// PPR causes slow page loads in dev - disabled
// export const experimental_ppr = true;
