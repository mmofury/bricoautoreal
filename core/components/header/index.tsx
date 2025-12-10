import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';
import { VehicleBadgeLauncher } from '~/components/vehicle-badge/launcher';
import { CategoriesSidebarLauncher } from '~/components/categories-sidebar/launcher';
import { getCartId } from '~/lib/cart';
import { getInterCarsLevel1WithChildren } from '~/lib/db/intercars-queries';

import { search } from './_actions/search';

const GetCartCountQuery = graphql(`
  query GetCartCountQuery($cartId: String) {
    site {
      cart(entityId: $cartId) {
        entityId
        lineItems {
          totalQuantity
        }
      }
    }
  }
`);

const getCartCount = cache(async (cartId: string, customerAccessToken?: string) => {
  const response = await client.fetch({
    document: GetCartCountQuery,
    variables: { cartId },
    customerAccessToken,
    fetchOptions: {
      cache: 'no-store',
      next: {
        tags: [TAGS.cart],
      },
    },
  });

  return response.data.site.cart?.lineItems.totalQuantity ?? null;
});

export const Header = async () => {
  const t = await getTranslations('Components.Header');
  const locale = await getLocale();

  // Charger les catégories pour la sidebar
  const categories = await getInterCarsLevel1WithChildren({ limitLevel1: 20, limitLevel2: 50 });

  const streamableCartCount = Streamable.from(async () => {
    const cartId = await getCartId();
    const customerAccessToken = await getSessionCustomerAccessToken();

    if (!cartId) {
      return null;
    }

    return getCartCount(cartId, customerAccessToken);
  });

  return (
    <header className="bg-[#1E1E1E]">
      {/* Main header bar */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 py-1.5">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex-shrink-0">
            <Image
              alt={t('home')}
              src="/logo-custom.png"
              width={148}
              height={56}
              priority
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* Barre de recherche avec véhicule intégré */}
          <div className="flex-1 flex items-center gap-0 bg-white rounded h-[46px] overflow-hidden">
            {/* Sélecteur de véhicule */}
            <div className="flex items-center gap-2 bg-[#FFCC00] px-4 h-full border-r border-black hover:bg-[#FFD633] transition">
              <svg className="h-6 w-6 text-[#373737]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l-7-7m7 7l7-7" />
              </svg>
              <VehicleBadgeLauncher variant="search" />
              <svg className="h-3 w-3 text-[#373737]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Barre de recherche */}
            <form action={search as unknown as (formData: FormData) => void} className="flex flex-1 items-center h-full">
              <input
                name="term"
                type="search"
                placeholder="Quelle pièce recherchez-vous aujourd'hui ?"
                className="flex-1 h-full px-4 text-sm text-[#373737] placeholder:text-[#999] focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-[38px] w-[38px] items-center justify-center bg-[#FFCC00] rounded-lg mr-1 hover:bg-[#FFD633] transition"
                aria-label="Rechercher"
              >
                <svg className="h-5 w-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          {/* Actions à droite */}
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/login`}
              className="flex items-center gap-2 rounded bg-[#4B4B4B] px-4 h-12 text-sm text-[#F2F2F2] hover:bg-[#5B5B5B] transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span className="hidden sm:inline">Connexion</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>

            <Link
              href={`/${locale}/cart`}
              className="relative flex items-center gap-2 rounded bg-[#4B4B4B] px-4 h-12 hover:bg-[#5B5B5B] transition"
              aria-label="Panier"
            >
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <Stream value={streamableCartCount} fallback={null}>
                {(count) => (
                  <span className="text-base font-normal text-[#F2F2F2]">
                    {count || 0}
                  </span>
                )}
              </Stream>
            </Link>
          </div>
        </div>
      </div>

      {/* Barre de navigation secondaire */}
      <div className="bg-[#2A2A2A]">
        <div className="mx-auto w-full max-w-screen-2xl px-3">
          <div className="flex items-center gap-6 py-3 text-sm text-white">
            <CategoriesSidebarLauncher categories={categories} locale={locale} />

            <div className="flex flex-1 items-center gap-6 overflow-x-auto">
              <Link href={`/${locale}`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Accueil
              </Link>
              <Link href={`/${locale}/pieces-detachees`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Pièces détachées
              </Link>
              <Link href={`/${locale}/marques-pieces-detachees`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Marques
              </Link>
              <Link href={`/${locale}/pieces-auto`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Constructeurs
              </Link>
              <Link href={`/${locale}/blog`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Blog
              </Link>
              <Link href={`/${locale}/faq`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                FAQ
              </Link>
              <Link href={`/${locale}/contact`} className="whitespace-nowrap hover:text-[#FFCC00] transition">
                Contact
              </Link>
            </div>

            <div className="flex items-center gap-2 rounded bg-[#3A3A3A] px-3 py-2">
              <svg className="h-5 w-5 text-[#FFCC00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <div className="text-xs">
                <div className="text-[#FFCC00] font-semibold">Promotions</div>
                <div className="text-white">-20%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
