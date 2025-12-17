import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import {
  SiFacebook,
  SiInstagram,
  SiPinterest,
  SiX,
  SiYoutube,
} from '@icons-pack/react-simple-icons';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { Streamable, Stream } from '@/vibes/soul/lib/streamable';
import { GetLinksAndSectionsQuery, LayoutQuery } from '~/app/[locale]/(default)/page-data';
import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { readFragment } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { CurrencyCode } from '~/components/header/fragment';
import { getPreferredCurrencyCode } from '~/lib/currency';

import { FooterFragment, FooterSectionsFragment } from './fragment';
import { getInterCarsLevel1WithChildren } from '~/lib/db/intercars-queries';
import { AmazonIcon } from './payment-icons/amazon';
import { AmericanExpressIcon } from './payment-icons/american-express';
import { ApplePayIcon } from './payment-icons/apple-pay';
import { MastercardIcon } from './payment-icons/mastercard';
import { PayPalIcon } from './payment-icons/paypal';
import { VisaIcon } from './payment-icons/visa';

const paymentIcons = [
  <AmazonIcon key="amazon" />,
  <AmericanExpressIcon key="americanExpress" />,
  <ApplePayIcon key="apple" />,
  <MastercardIcon key="mastercard" />,
  <PayPalIcon key="paypal" />,
  <VisaIcon key="visa" />,
];

const socialIcons: Record<string, { icon: React.ReactElement; name: string }> = {
  Facebook: { icon: <SiFacebook className="h-5 w-5" />, name: 'Facebook' },
  Twitter: { icon: <SiX className="h-5 w-5" />, name: 'Twitter' },
  X: { icon: <SiX className="h-5 w-5" />, name: 'X' },
  Pinterest: { icon: <SiPinterest className="h-5 w-5" />, name: 'Pinterest' },
  Instagram: { icon: <SiInstagram className="h-5 w-5" />, name: 'Instagram' },
  YouTube: { icon: <SiYoutube className="h-5 w-5" />, name: 'YouTube' },
};

const getFooterSections = cache(
  async (customerAccessToken?: string, currencyCode?: CurrencyCode) => {
    const { data: response } = await client.fetch({
      document: GetLinksAndSectionsQuery,
      customerAccessToken,
      variables: { currencyCode },
      validateCustomerAccessToken: false,
      fetchOptions: customerAccessToken ? { cache: 'no-store' } : { next: { revalidate } },
    });

    return readFragment(FooterSectionsFragment, response).site;
  },
);

const getFooterData = cache(async () => {
  const { data: response } = await client.fetch({
    document: LayoutQuery,
    fetchOptions: { next: { revalidate } },
  });

  return readFragment(FooterFragment, response).site;
});

export const Footer = async () => {
  const t = await getTranslations('Components.Footer');
  const data = await getFooterData();

  const copyright = `© ${new Date().getFullYear()} ${data.settings?.storeName}`;

  const socialMediaLinks = data.settings?.socialMediaLinks
    .filter((socialMediaLink) => Boolean(socialIcons[socialMediaLink.name]))
    .map((socialMediaLink) => ({
      href: socialMediaLink.url,
      icon: socialIcons[socialMediaLink.name]?.icon,
      name: socialIcons[socialMediaLink.name]?.name,
    }));

  const streamableSections = Streamable.from(async () => {
    const customerAccessToken = await getSessionCustomerAccessToken();
    const currencyCode = await getPreferredCurrencyCode();
    const sectionsData = await getFooterSections(customerAccessToken, currencyCode);

    return [
      {
        title: 'Support Client',
        links: [
          { label: 'Contact', href: '/contact' },
          { label: 'Aide', href: '/help' },
          { label: 'Mot de passe oublié', href: '/forgot-password' },
          { label: 'Suivi de commande', href: '/order-tracking' },
          { label: 'Politique de retour', href: '/returns' },
          { label: 'Livraison le jour même', href: '/same-day-delivery' },
        ],
      },
      {
        title: 'À Propos',
        links: [
          { label: 'Programme d\'affiliation', href: '/affiliate' },
          { label: 'Carrières', href: '/careers' },
          { label: 'Informations entreprise', href: '/corporate' },
          { label: 'Cartes cadeaux', href: '/gift-cards' },
          { label: 'Relations investisseurs', href: '/investors' },
          { label: 'Presse', href: '/press' },
          { label: 'Nos magasins', href: '/stores' },
        ],
      },
      {
        title: 'Professionnels',
        links: [
          { label: 'Mon compte Pro', href: '/pro' },
          { label: 'Commande en ligne', href: '/online-ordering' },
          { label: 'Formation technique', href: '/training' },
          { label: 'Pièces & Produits', href: '/parts' },
          { label: 'Promotions & Récompenses', href: '/promotions' },
          { label: 'Solutions atelier', href: '/shop-solutions' },
        ],
      },
    ];
  });

  // Get Level 1 categories with their Level 2 children for the popular parts section
  // Helper pour formater le texte (Première lettre Maj, reste minuscule)
  const formatName = (name: string) => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const excludedCategories = [
    "Absorption des chocs du véhicule",
    "Système d'admission/d'échappement",
    "Absorption des chocs",
    "Système d'admission",
    "Système d'échappement"
  ];

  // Helper pour filtrer
  const filterCategories = (cats: any[]) => {
    return cats.filter(c => {
      const name = c.labelFr || c.label;
      return !excludedCategories.some(excluded => name.includes(excluded));
    });
  };

  // Get Level 1 categories with their Level 2 children for the popular parts section
  const streamableCategories = Streamable.from(async () => {
    // On demande plus de catégories pour pouvoir filtrer et en avoir assez
    const allCategories = await getInterCarsLevel1WithChildren({ limitLevel1: 20, limitLevel2: 6 });
    const filtered = filterCategories(allCategories);

    // Get top 4 Level 1 categories (indices 0-3) for 4 columns
    return filtered.slice(0, 4).map((level1) => ({
      name: formatName(level1.labelFr || level1.label),
      path: level1.url || '#',
      children: level1.children.slice(0, 6).map((child: any) => ({
        name: formatName(child.labelFr || child.label),
        path: child.url || '#'
      })),
    }));
  });

  // Get Level 1 categories 5-8 with their Level 2 children for the second section (indices 5-8)
  const streamableCategories2 = Streamable.from(async () => {
    const allCategories = await getInterCarsLevel1WithChildren({ limitLevel1: 20, limitLevel2: 6 });
    const filtered = filterCategories(allCategories);

    // Get categories 4-7 for the second section (4 items)
    return filtered.slice(4, 8).map((level1) => ({
      name: level1.labelFr || level1.label,
      path: level1.url || '#',
      children: level1.children.slice(0, 6).map((child: any) => ({
        name: formatName(child.labelFr || child.label),
        path: child.url || '#'
      })),
    }));
  });

  return (
    <footer className="border-t-2 border-gray-200 bg-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Soyez informé des offres et promotions
              </h3>
              <p className="mt-2 text-gray-700">
                Inscrivez-vous pour recevoir <strong>5€ de réduction</strong> sur 20€ d'achat ou plus
              </p>
            </div>
            <div className="flex w-full max-w-md gap-2">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 rounded border border-gray-300 bg-gray-100 px-4 py-3 text-sm focus:border-[#FFCC00] focus:outline-none"
              />
              <button className="rounded bg-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-[#FFCC00] hover:text-gray-900">
                S'INSCRIRE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section 1 - 5 columns */}
      <div className="bg-white pt-12 pb-6">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Stream value={streamableCategories}>
              {(categories) => {
                if (!categories || categories.length === 0) return null;
                return categories.map((level1) => (
                  <div key={level1.path}>
                    <h3 className="mb-4 text-base font-bold text-gray-800">
                      {level1.name}
                    </h3>
                    <ul className="space-y-2">
                      {level1.children.map((level2: any) => (
                        <li key={level2.path}>
                          <a
                            href={level2.path}
                            className="text-sm text-gray-600 hover:text-[#FFCC00]"
                          >
                            {level2.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ));
              }}
            </Stream>
          </div>
        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="h-0.5 w-full bg-gray-100" />

      {/* Categories Section 2 - 4 columns */}
      <div className="bg-white pt-6 pb-24">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Stream value={streamableCategories2}>
              {(categories) => {
                if (!categories || categories.length === 0) {
                  return <div className="p-4 text-red-500">DEBUG: Aucune catégorie sec. 2 trouvée.</div>;
                }
                return categories.map((level1) => (
                  <div key={level1.path}>
                    <h3 className="mb-4 text-base font-bold text-gray-800">
                      {level1.name}
                    </h3>
                    <ul className="space-y-2">
                      {level1.children.map((level2: any) => (
                        <li key={level2.path}>
                          <a
                            href={level2.path}
                            className="text-sm text-gray-600 hover:text-[#FFCC00]"
                          >
                            {level2.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ));
              }}
            </Stream>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons + Main Footer */}
      <div className="bg-[#1E1E1E] pb-12">
        {/* Quick Actions with SVG Icons - Floating overlap */}
        <div className="relative mx-auto max-w-screen-2xl px-4 mb-16">
          <div className="-mt-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {/* Order Lookup */}
            <a
              href="/order-lookup"
              className="flex flex-col items-center justify-center gap-4 rounded-lg bg-[#1E1E1E] p-6 shadow-lg transition hover:bg-gray-800 h-[124px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-3 outline-[#FFCC00] outline-offset-[-3px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.18 21.85C6.27028 21.9471 6.3974 22.0016 6.53 22H6.82C6.95261 22.0016 7.07972 21.9471 7.17 21.85L8.99999 20C9.19784 19.8082 9.51217 19.8082 9.71002 20L11.52 21.81C11.6103 21.9072 11.7374 21.9616 11.87 21.96H12.16C12.2926 21.9616 12.4197 21.9072 12.51 21.81L14.32 20C14.5136 19.8268 14.8064 19.8268 15 20L16.81 21.81C16.9003 21.9072 17.0274 21.9616 17.16 21.96H17.45C17.5826 21.9616 17.7097 21.9072 17.8 21.81L19.71 20C19.8947 19.8138 19.9989 19.5624 20 19.3V3C20 2.44772 19.5523 2 19 2H5C4.44772 2 4 2.44772 4 3V19.26C4.00368 19.5248 4.10727 19.7784 4.29 19.97L6.18 21.85ZM13 13.5C13 13.7762 12.7762 14.0001 12.5 14.0001H8.50004C8.22389 14.0001 8.00002 13.7762 8.00002 13.5V12.5001C8.00002 12.2239 8.22389 12 8.50004 12H12.5C12.7762 12 13 12.2239 13 12.5001V13.5ZM15.5 10C15.7762 10 16 9.77615 16 9.5V8.50002C16 8.22387 15.7762 8 15.5 8H8.50004C8.22389 8 8.00002 8.22387 8.00002 8.50002V9.5C8.00002 9.77615 8.22389 10 8.50004 10H15.5Z" fill="white" />
                </svg>
              </div>
              <span className="text-center text-base font-bold text-[#FFCC00]">Suivi commande</span>
            </a>

            {/* Help Desk */}
            <a
              href="/contact-us"
              className="flex flex-col items-center justify-center gap-4 rounded-lg bg-[#1E1E1E] p-6 shadow-lg transition hover:bg-gray-800 h-[124px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-3 outline-[#FFCC00] outline-offset-[-3px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5229 22 12C22 9.34785 20.9465 6.8043 19.0711 4.92893C17.1957 3.05357 14.6522 2 12 2ZM13 17.5C13 17.7761 12.7761 18 12.5 18H11.5C11.2239 18 11 17.7761 11 17.5V16.5C11 16.2239 11.2239 16 11.5 16H12.5C12.7761 16 13 16.2239 13 16.5V17.5ZM13.88 12.29C15.0655 11.9063 15.8716 10.806 15.88 9.56V9C15.88 8.23615 15.5766 7.50365 15.0365 6.96355C14.4964 6.42345 13.7638 6.12 13 6.12H11C9.4094 6.12 8.12 7.4094 8.12 9V9.5C8.12 9.77615 8.34385 10 8.62 10H9.38C9.65615 10 9.88 9.77615 9.88 9.5V9C9.88 8.38145 10.3814 7.88 11 7.88H13C13.3039 7.86915 13.5992 7.9823 13.818 8.19355C14.0367 8.4048 14.1602 8.6959 14.16 9V9.56C14.161 10.0423 13.8557 10.472 13.4 10.63L12.45 10.94C11.6817 11.1939 11.1621 11.9109 11.16 12.72V13.5C11.16 13.7761 11.3839 14 11.66 14H12.42C12.6961 14 12.92 13.7761 12.92 13.5V12.72C12.92 12.6675 12.9515 12.6202 13 12.6L13.88 12.29Z" fill="white" />
                </svg>
              </div>
              <span className="text-center text-base font-bold text-[#FFCC00]">Service Client</span>
            </a>

            {/* Store Locator */}
            <a
              href="/store-locator"
              className="flex flex-col items-center justify-center gap-4 rounded-lg bg-[#1E1E1E] p-6 shadow-lg transition hover:bg-gray-800 h-[124px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-3 outline-[#FFCC00] outline-offset-[-3px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10C20 13.7564 18.1763 15.226 16.4762 16.596C15.3613 17.4945 14.2994 18.3502 13.84 19.78L13.33 21.32C13.187 21.7454 12.7782 22.0234 12.33 22H11.77C11.3218 22.0234 10.913 21.7454 10.77 21.32L10.26 19.78C9.78216 18.3544 8.70547 17.4996 7.57743 16.604C5.84899 15.2317 4 13.7637 4 10ZM9 10C9 11.6569 10.3431 13 12 13C12.7956 13 13.5587 12.6839 14.1213 12.1213C14.6839 11.5587 15 10.7956 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10Z" fill="white" />
                </svg>
              </div>
              <span className="text-center text-base font-bold text-[#FFCC00]">Magasins</span>
            </a>

            {/* In Store Services */}
            <a
              href="/services"
              className="flex flex-col items-center justify-center gap-4 rounded-lg bg-[#1E1E1E] p-6 shadow-lg transition hover:bg-gray-800 h-[124px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-3 outline-[#FFCC00] outline-offset-[-3px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.9998 1.14453L2.13135 5.53105C1.21808 5.93652 0.631348 6.83863 0.631348 7.83779V23.9998H4.42082V10.1051H19.5787V23.9998H23.3682V7.83779C23.3682 6.8399 22.7815 5.93652 21.8682 5.53105L11.9998 1.14453ZM6.94714 12.6314V23.9998H10.7366V21.4735H13.2629V23.9998H17.0524V12.6314H6.94714Z" fill="white" />
                </svg>
              </div>
              <span className="text-center text-base font-bold text-[#FFCC00]">Services</span>
            </a>

            {/* Mobile App */}
            <a
              href="/app"
              className="flex flex-col items-center justify-center gap-4 rounded-lg bg-[#1E1E1E] p-6 shadow-lg transition hover:bg-gray-800 h-[124px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] outline outline-3 outline-[#FFCC00] outline-offset-[-3px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.97148 23.5076H17.1756C18.3027 23.5076 19.2164 22.5772 19.2164 21.4296V2.72831C19.2164 1.58071 18.3027 0.650391 17.1756 0.650391H6.97148C5.84437 0.650391 4.93066 1.58071 4.93066 2.72831V21.4296C4.93066 22.5772 5.84437 23.5076 6.97148 23.5076ZM7.41513 17.5393V3.19007H16.7319V17.5393H7.41513ZM12.0735 21.5427C11.51 21.5427 11.0531 21.0776 11.0531 20.5038C11.0531 19.93 11.51 19.4649 12.0735 19.4649C12.6371 19.4649 13.0939 19.93 13.0939 20.5038C13.0939 21.0776 12.6371 21.5427 12.0735 21.5427Z" fill="white" />
                </svg>
              </div>
              <span className="text-center text-base font-bold text-[#FFCC00]">App Mobile</span>
            </a>
          </div>
        </div>



        {/* Main Footer Content */}
        <div className="py-12 pt-24 text-gray-300">
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {/* Navigation Sections */}
              <Stream value={streamableSections}>
                {(sections) =>
                  sections.map((section) => (
                    <div key={section.title}>
                      <h3 className="mb-2 text-base font-bold uppercase text-white">{section.title}</h3>
                      <div className="mb-4 h-1 w-24 rounded bg-[#FFCC00]" />
                      <ul className="space-y-2">
                        {section.links.map((link) => (
                          <li key={link.href}>
                            <a
                              href={link.href}
                              className="text-sm capitalize text-gray-300 transition-colors hover:text-[#FFCC00]"
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                }
              </Stream>

              {/* Social Media */}
              {socialMediaLinks && socialMediaLinks.length > 0 && (
                <div>
                  <h3 className="mb-2 text-base font-bold uppercase text-white">Suivez-nous</h3>
                  <div className="mb-4 h-1 w-24 rounded bg-[#FFCC00]" />
                  <div className="space-y-3">
                    {socialMediaLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm capitalize transition-colors hover:text-[#FFCC00]"
                      >
                        <span className="text-gray-400">{link.icon}</span>
                        {link.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Payment Methods */}
            <div className="mt-12 border-t border-gray-700 pt-8">
              <h4 className="mb-4 text-sm font-semibold text-white">Moyens de paiement</h4>
              <div className="flex flex-wrap gap-3">{paymentIcons}</div>
            </div>

            {/* TecDoc & Legal Disclaimer */}
            <div className="mt-8 border-t border-gray-700 pt-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="shrink-0">
                  <svg width="152" height="44" viewBox="0 0 152 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M152 0H0V43.429H152V0Z" fill="black" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M150.993 2.60569C150.993 1.16775 149.826 0 148.387 0H2.60571C1.16746 0 0 1.16775 0 2.60569V40.8234C0 42.2613 1.16746 43.429 2.60571 43.429H148.387C149.826 43.429 150.993 42.2613 150.993 40.8234V2.60569ZM149.716 2.60569V40.8234C149.716 41.556 149.121 42.1509 148.387 42.1509H2.60571C1.87253 42.1509 1.27731 41.556 1.27731 40.8234V2.60569C1.27731 1.87308 1.87253 1.27687 2.60571 1.27687H148.387C149.121 1.27687 149.716 1.87308 149.716 2.60569ZM30.0125 12.0353C30.1443 12.0353 30.2385 12.1483 30.2385 12.2801V18.0611C30.2385 18.1929 30.3515 18.3059 30.4645 18.3059H36.0949C36.2267 18.3059 36.3208 18.4189 36.3208 18.5507V32.0712C36.3208 32.203 36.2078 32.316 36.0949 32.316H16.831C16.6992 32.316 16.605 32.203 16.605 32.0712V12.2801C16.605 12.1483 16.718 12.0353 16.831 12.0353H30.0125ZM31.3684 17.3833C31.2554 17.3833 31.1424 17.2703 31.1424 17.1385L31.1612 11.3574C31.1612 11.2256 31.2554 11.1126 31.3872 11.1126H37.0176C37.1306 11.1126 37.2435 11.2256 37.2435 11.3574V17.1385C37.2435 17.2703 37.1494 17.3833 37.0176 17.3833H31.3684ZM47.9582 28.0603C48.0712 28.0603 48.1465 27.9849 48.1465 27.872V17.5339C48.1465 17.4586 48.1842 17.4209 48.2595 17.4209H50.2932C50.4062 17.4209 50.4816 17.3456 50.4816 17.2326V15.3872C50.4816 15.2742 50.4062 15.1989 50.2932 15.1989H43.533C43.42 15.1989 43.3447 15.2742 43.3447 15.3872V17.2326C43.3447 17.3456 43.42 17.4209 43.533 17.4209H45.5667C45.6421 17.4209 45.6797 17.4586 45.6797 17.5339V27.872C45.6797 27.9849 45.755 28.0603 45.868 28.0603H47.9582ZM56.0178 25.9135C55.7542 27.3823 54.5678 28.2297 52.9672 28.2297C51.4042 28.2297 50.4627 27.533 50.0673 26.309C49.8978 25.8194 49.8413 25.2733 49.8413 23.4844C49.8413 21.6766 49.8978 21.1494 50.0673 20.6598C50.4815 19.4169 51.4607 18.7202 52.986 18.7202C54.549 18.7202 55.5094 19.4358 55.9236 20.6598C56.0931 21.1494 56.1496 21.6578 56.1496 24.0493C56.1496 24.1623 56.0743 24.2376 55.9613 24.2376H52.3081C52.2328 24.2376 52.1951 24.2753 52.1951 24.3506C52.1951 25.2921 52.2328 25.4993 52.2893 25.6499C52.4023 25.9889 52.6471 26.1772 53.0237 26.1772C53.4568 26.1772 53.7204 25.9512 53.8711 25.4616C53.9087 25.3486 53.9841 25.311 54.097 25.3298L55.886 25.6876C55.999 25.7064 56.0366 25.7817 56.0178 25.9135ZM52.2705 22.5428H53.7204C53.7958 22.5428 53.8334 22.5052 53.8146 22.4299C53.8146 21.5825 53.7769 21.3565 53.7204 21.1682C53.6074 20.8669 53.3815 20.6786 52.986 20.6786C52.5906 20.6786 52.3646 20.8669 52.2516 21.1682C52.1951 21.3565 52.1575 21.5825 52.1575 22.4299C52.1575 22.5052 52.1951 22.5428 52.2705 22.5428ZM59.9723 28.2298C61.6859 28.2298 62.8722 27.2317 62.9852 25.6123C62.9852 25.4805 62.9475 25.424 62.8345 25.4052L61.0268 25.0662C60.9138 25.0474 60.8196 25.1039 60.8008 25.2357C60.7443 25.8759 60.4619 26.1396 60.0288 26.1396C59.671 26.1396 59.445 25.9889 59.332 25.6688C59.2755 25.4617 59.2567 25.2733 59.2567 23.4656C59.2567 21.6767 59.2755 21.4695 59.332 21.2624C59.445 20.9423 59.671 20.7916 60.0288 20.7916C60.4619 20.7916 60.7443 21.0553 60.8008 21.6955C60.8196 21.8273 60.9138 21.8838 61.0268 21.865L62.8345 21.526C62.9475 21.5072 62.9852 21.4507 62.9852 21.3189C62.8722 19.6994 61.7047 18.7014 59.9723 18.7014C58.5035 18.7014 57.4866 19.3417 57.0912 20.6221C56.9217 21.1682 56.8652 21.6013 56.8652 23.4656C56.8652 25.2922 56.9217 25.7629 57.0912 26.309C57.5054 27.5895 58.5035 28.2298 59.9723 28.2298ZM64.1339 28.0603C64.0209 28.0603 63.9455 27.985 63.9455 27.872V15.3684C63.9455 15.2554 64.0209 15.1801 64.1339 15.1801H67.1091C68.8039 15.1801 69.7831 15.8768 70.235 17.2515C70.461 17.9482 70.5551 18.8144 70.5551 21.6202C70.5551 24.426 70.461 25.2922 70.235 25.9889C69.7831 27.3824 68.785 28.0603 67.1091 28.0603H64.1339ZM65.9793 17.1385V26.1019C65.9793 26.1772 66.0169 26.2149 66.0923 26.2149H66.902C67.6175 26.2149 68.0318 25.9324 68.2578 25.2922C68.4084 24.8214 68.4838 24.2 68.4838 21.6202C68.4838 19.0404 68.4084 18.419 68.2578 17.9482C68.0318 17.3079 67.6175 17.0255 66.902 17.0255H66.0923C66.0169 17.0255 65.9793 17.0632 65.9793 17.1385ZM77.918 23.5032C77.918 21.6013 77.8615 21.1117 77.7108 20.6409C77.3342 19.4734 76.3738 18.7579 74.9615 18.7579C73.5869 18.7579 72.6077 19.4546 72.2311 20.6409C72.0804 21.1117 72.0239 21.6013 72.0239 23.5032C72.0239 25.3863 72.0804 25.8947 72.2311 26.3655C72.6077 27.533 73.5681 28.2297 74.9615 28.2297C76.355 28.2297 77.3342 27.533 77.7108 26.3655C77.8615 25.8759 77.918 25.3863 77.918 23.5032ZM75.9972 23.5032C75.9972 25.3486 75.9784 25.5558 75.9031 25.8194C75.7713 26.2148 75.47 26.4596 74.9804 26.4596C74.5096 26.4596 74.2083 26.2148 74.0765 25.8194C74.0012 25.5558 73.9823 25.3675 73.9823 23.5032C73.9823 21.6578 74.0012 21.4507 74.0765 21.187C74.2083 20.7916 74.5096 20.5468 74.9804 20.5468C75.47 20.5468 75.7713 20.7916 75.9031 21.187C75.9784 21.4507 75.9972 21.639 75.9972 23.5032ZM84.9607 25.7441C84.8665 27.2506 83.7555 28.2298 82.1737 28.2298C80.8179 28.2298 79.9329 27.5895 79.5374 26.4032C79.3679 25.8759 79.3114 25.537 79.3114 23.4656C79.3114 21.3942 79.3679 21.0552 79.5374 20.528C79.914 19.3793 80.8179 18.7391 82.1737 18.7391C83.7743 18.7391 84.8665 19.7371 84.9607 21.2247C84.9607 21.3565 84.923 21.413 84.81 21.4319L83.3789 21.7143C83.2471 21.7332 83.1717 21.6767 83.1529 21.5448C83.0588 20.8293 82.7198 20.528 82.1925 20.528C81.7783 20.528 81.4958 20.7163 81.364 21.1117C81.2887 21.3565 81.2698 21.5825 81.2698 23.4844C81.2698 25.3863 81.2887 25.6123 81.364 25.8571C81.4958 26.2525 81.7783 26.4408 82.1925 26.4408C82.7198 26.4408 83.0588 26.1396 83.1529 25.424C83.1717 25.2922 83.2471 25.2357 83.3789 25.2545L84.81 25.537C84.923 25.5558 84.9607 25.6123 84.9607 25.7441ZM92.4677 17.2689C92.5804 17.2689 92.6526 17.1944 92.6728 17.0825L92.9529 15.5354C92.9702 15.4236 92.9154 15.349 92.8027 15.349H91.1797C91.07 15.349 90.9949 15.4236 90.9746 15.5354L90.6772 17.0825C90.6599 17.1944 90.7147 17.2689 90.8274 17.2689H92.4677ZM90.5848 28.0241C90.6974 28.0241 90.7523 27.9496 90.7696 27.8377L92.3002 19.2261C92.3175 19.1143 92.2627 19.0397 92.1501 19.0397H90.5299C90.4173 19.0397 90.3422 19.1143 90.3249 19.2261L88.7942 27.8377C88.7769 27.9496 88.852 28.0241 88.9617 28.0241H90.5848ZM100.632 27.8378C100.611 27.9496 100.539 28.0242 100.427 28.0242H98.8415C98.7491 28.0242 98.674 27.9496 98.6942 27.8378L99.6063 22.6373C99.8123 21.407 99.4193 20.5869 98.3187 20.5869C97.2935 20.5869 96.4936 21.407 96.2683 22.6L95.3557 27.8378C95.3384 27.9496 95.2806 28.0242 95.1709 28.0242H93.5479C93.4352 28.0242 93.363 27.9496 93.3803 27.8378L94.9081 19.2262C94.9283 19.1143 95.0034 19.0398 95.1131 19.0398H96.7362C96.8488 19.0398 96.9037 19.1143 96.8834 19.2262L96.7362 19.9158H96.7535C97.2762 19.3194 98.1137 18.8347 99.2342 18.8347C101.117 18.8347 101.992 20.2327 101.637 22.1713L100.632 27.8378ZM106.39 28.2292C108.963 28.2292 110.529 26.8499 110.529 24.7436C110.529 23.5693 109.801 22.7677 108.161 22.6L107.248 22.5068C106.298 22.4136 106.055 22.1526 106.055 21.7053C106.055 21.0902 106.653 20.531 107.641 20.531C108.498 20.531 109.244 20.8665 109.729 21.2393C109.801 21.2952 109.896 21.2952 109.989 21.202L111.014 20.1954C111.069 20.1209 111.089 20.009 111.014 19.9345C110.379 19.338 109.223 18.8347 107.918 18.8347C105.795 18.8347 104.097 19.9531 104.097 22.0594C104.097 23.2524 104.9 24.0912 106.448 24.2403L107.378 24.3335C108.218 24.4081 108.553 24.669 108.553 25.1723C108.553 25.8433 107.846 26.4957 106.653 26.4957C105.738 26.4957 104.825 26.1229 104.285 25.5264C104.227 25.4519 104.135 25.4519 104.042 25.5264L102.887 26.5703C102.812 26.6448 102.795 26.7567 102.85 26.8312C103.427 27.5023 104.658 28.2292 106.39 28.2292ZM115.952 17.0825C115.935 17.1944 115.86 17.2689 115.747 17.2689H114.107C113.997 17.2689 113.939 17.1944 113.96 17.0825L114.257 15.5354C114.274 15.4236 114.35 15.349 114.462 15.349H116.082C116.195 15.349 116.253 15.4236 116.232 15.5354L115.952 17.0825ZM114.052 27.8377C114.032 27.9496 113.977 28.0241 113.864 28.0241H112.244C112.132 28.0241 112.056 27.9496 112.077 27.8377L113.604 19.2261C113.622 19.1143 113.697 19.0397 113.809 19.0397H115.433C115.542 19.0397 115.6 19.1143 115.58 19.2261L114.052 27.8377ZM123.577 28.0242C123.689 28.0242 123.764 27.9496 123.782 27.8377L125.945 15.5354C125.962 15.4236 125.887 15.349 125.777 15.349H124.154C124.042 15.349 123.987 15.4236 123.969 15.5354L123.204 19.9531H123.187C122.907 19.3566 122.234 18.8347 120.986 18.8347C119.513 18.8347 118.396 19.4312 117.688 20.8851C117.107 22.0407 116.773 24.0725 116.773 25.2654C116.773 27.0735 117.723 28.2292 119.383 28.2292C120.576 28.2292 121.379 27.7632 121.899 27.1294H121.919L121.806 27.8377C121.786 27.9496 121.844 28.0242 121.956 28.0242H123.577ZM120.221 26.477C119.196 26.477 118.785 25.8992 118.785 24.874C118.785 24.0725 119.086 22.4881 119.421 21.8171C119.811 21.0155 120.446 20.5868 121.283 20.5868C122.309 20.5868 122.701 21.1833 122.701 22.2085C122.701 23.01 122.401 24.613 122.086 25.2654C121.676 26.067 121.061 26.477 120.221 26.477ZM133.456 26.7194C132.599 27.5582 131.331 28.2292 129.803 28.2292C127.64 28.2292 126.54 27.0176 126.54 24.9673C126.54 23.9048 126.782 22.2458 127.267 21.2579C128.012 19.7294 129.28 18.8347 131.238 18.8347C133.026 18.8347 134.389 19.9345 134.389 21.9849C134.389 22.4695 134.331 23.0101 134.147 23.9793C134.126 24.0912 134.034 24.1657 133.921 24.1657H128.59C128.518 24.1657 128.48 24.203 128.46 24.2776C128.423 24.4081 128.423 24.5199 128.423 24.6504C128.423 25.9924 129.038 26.4771 130.158 26.4771C131.013 26.4771 131.853 26.0484 132.394 25.5451C132.506 25.4519 132.599 25.4705 132.674 25.5451L133.474 26.4212C133.549 26.5144 133.549 26.6262 133.456 26.7194ZM128.778 22.5627C128.758 22.6373 128.778 22.6745 128.853 22.6745H132.281C132.356 22.6745 132.411 22.6373 132.431 22.5627C132.469 22.3763 132.486 22.1526 132.486 22.0035C132.486 20.9783 131.946 20.5123 130.976 20.5123C130.138 20.5123 129.43 20.9224 129.058 21.7053C128.945 21.9476 128.833 22.2645 128.778 22.5627Z" fill="white" />
                  </svg>
                </div>
                <div className="text-xs text-[#829BAB] max-w-2xl">
                  <p>Les données affichées ici, en particulier l'ensemble de la base de données, ne peuvent être copiées. Il est strictement interdit de reproduire et de distribuer les données et la base de données sans l'accord préalable de TecAlliance et/ou faire appel à des tiers pour de telles activités. Toute utilisation non autorisée du contenu représente une violation des droits d'auteur et fera l'objet d'une action en justice.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#1E1E1E] py-6">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-700 pt-6 text-sm text-gray-400 md:flex-row">
            <p>{copyright}</p>
            <div className="flex flex-wrap gap-4">
              <a href="/privacy" className="capitalize hover:text-[#FFCC00]">
                Politique de confidentialité
              </a>
              <a href="/terms" className="capitalize hover:text-[#FFCC00]">
                Conditions d'utilisation
              </a>
              <a href="/sitemap" className="capitalize hover:text-[#FFCC00]">
                Plan du site
              </a>
              <a href="/privacy-settings" className="hover:text-[#FFCC00]">
                Ne pas vendre mes informations
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer >
  );
};
