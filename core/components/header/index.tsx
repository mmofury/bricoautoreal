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
import { CategoriesSidebarHeaderLauncher } from '~/components/categories-sidebar/header-launcher';
import { getCartId } from '~/lib/cart';
import { getAllInterCarsCategoriesByLevel, getInterCarsLevel1WithChildren } from '~/lib/db/intercars-queries';

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
      // In dev, cache to avoid slow page loads. In production, no cache for real-time updates
      cache: process.env.NODE_ENV === 'development' ? 'force-cache' : 'no-store',
      next: {
        tags: [TAGS.cart],
        revalidate: process.env.NODE_ENV === 'development' ? 30 : undefined,
      },
    },
  });

  return response.data.site.cart?.lineItems.totalQuantity ?? null;
});

export const Header = async () => {
  const t = await getTranslations('Components.Header');
  const locale = await getLocale();

  // Charger les catégories de niveau 1 pour le menu horizontal
  const level1Categories = await getAllInterCarsCategoriesByLevel(1);

  // Charger les catégories avec leurs enfants pour la sidebar (toutes les catégories)
  const categoriesWithChildren = await getInterCarsLevel1WithChildren({ limitLevel1: 100 });

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
              <VehicleBadgeLauncher variant="search" locale={locale} />
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
            {await (async () => {
              const customerAccessToken = await getSessionCustomerAccessToken();
              const isLoggedIn = !!customerAccessToken;

              if (isLoggedIn) {
                // User is logged in - show dropdown
                return (
                  <div className="relative group">
                    <button
                      className="flex items-center gap-2 rounded bg-[#4B4B4B] px-4 h-12 text-sm text-[#F2F2F2] hover:bg-[#5B5B5B] transition"
                      type="button"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      <span className="hidden sm:inline">Espace membre</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <Link
                          href={`/${locale}/account/orders`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Commandes
                        </Link>
                        <Link
                          href={`/${locale}/account/addresses`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Adresses
                        </Link>
                        <Link
                          href={`/${locale}/account`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Compte
                        </Link>
                        <Link
                          href={`/${locale}/account/wishlists`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Listes d'envies
                        </Link>
                        <div className="border-t border-gray-200 my-1" />
                        <Link
                          href={`/${locale}/logout`}
                          className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Déconnexion
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // User is not logged in - show login link
                return (
                  <Link
                    href={`/${locale}/login`}
                    className="flex items-center gap-2 rounded bg-[#4B4B4B] px-4 h-12 text-sm text-[#F2F2F2] hover:bg-[#5B5B5B] transition"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span className="hidden sm:inline">Se connecter</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>
                );
              }
            })()}

            <Link
              href={`/${locale}/cart`}
              className="relative flex items-center gap-2 rounded bg-[#4B4B4B] px-4 h-12 hover:bg-[#5B5B5B] transition"
              aria-label="Panier"
            >
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
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
      <div
        className="relative bg-white"
        style={{ boxShadow: '0px 4px 8px rgba(55, 55, 55, 0.16)' }}
      >
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="flex h-[54px] items-stretch">
            {/* Bouton "Toutes les catégories" avec icône - ouvre la sidebar */}
            <CategoriesSidebarHeaderLauncher
              categories={categoriesWithChildren}
              locale={locale}
            />

            {/* Liste des catégories */}
            {level1Categories.slice(0, 8).map((category, index) => (
              <Link
                key={category.id}
                href={category.url || `/${locale}/pieces-detachees/${category.id}`}
                className="relative flex flex-shrink-0 items-center px-3 transition-colors hover:bg-gray-50"
              >
                <div
                  className="absolute left-0 top-[4.5px] h-[45px] w-px"
                  style={{ borderRight: '1px solid #DADADA' }}
                />
                <span className="text-sm leading-[22px] text-[#666666]">
                  {category.labelFr || category.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
