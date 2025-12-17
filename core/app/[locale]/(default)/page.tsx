import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { Battery, Disc, Droplet } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { Streamable } from '@/vibes/soul/lib/streamable';
import { FeaturedProductCarousel } from '@/vibes/soul/sections/featured-product-carousel';
import { FeaturedProductList } from '@/vibes/soul/sections/featured-product-list';
import { getSessionCustomerAccessToken } from '~/auth';
import { HeroBannerPromo } from '~/components/hero-banner-promo';
import { NewsletterBanner } from '~/components/newsletter-banner';
import { PromoCards } from '~/components/promo-cards';
import { ServicesSection } from '~/components/services-section';
import { Subscribe } from '~/components/subscribe';
import { TopCategoriesSection } from '~/components/top-categories-section';
import { VehicleSelectorBanner } from '~/components/vehicle-selector-banner';
import { productCardTransformer } from '~/data-transformers/product-card-transformer';
import { getPreferredCurrencyCode } from '~/lib/currency';
import { getAllInterCarsCategoriesByLevel } from '~/lib/db/intercars-queries';

import { Slideshow } from './_components/slideshow';
import { getPageData } from './page-data';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const format = await getFormatter();

  const streamablePageData = Streamable.from(async () => {
    const customerAccessToken = await getSessionCustomerAccessToken();
    const currencyCode = await getPreferredCurrencyCode();

    return getPageData(currencyCode, customerAccessToken);
  });

  const streamableFeaturedProducts = Streamable.from(async () => {
    const data = await streamablePageData;

    const featuredProducts = removeEdgesAndNodes(data.site.featuredProducts);

    return productCardTransformer(featuredProducts, format);
  });

  const streamableNewestProducts = Streamable.from(async () => {
    const data = await streamablePageData;

    const newestProducts = removeEdgesAndNodes(data.site.newestProducts);

    return productCardTransformer(newestProducts, format);
  });

  // Données pour les cartes de promotions
  const promoCards = [
    {
      icon: <Disc className="h-8 w-8 text-gray-900" />,
      title: 'Plaquettes de frein Carquest GRATUITES',
      description:
        "Lorsque vous achetez 2 disques Carquest. Passez à Premium Gold pour 10€ OU aux plaquettes Professional Platinum pour 20€.",
    },
    {
      icon: <Battery className="h-8 w-8 text-gray-900" />,
      title: 'Batteries auto à partir de 89,99€',
      description:
        "Test et installation GRATUITS avec l'achat. Aucun rendez-vous nécessaire.*",
    },
    {
      icon: <Droplet className="h-8 w-8 text-gray-900" />,
      title: "Économisez jusqu'à 20€ + Filtre à huile GRATUIT",
      description:
        "5 litres d'huile moteur synthétique + N'IMPORTE QUEL filtre à huile GRATUIT",
    },
  ];

  // Récupérer les vraies catégories de niveau 1 depuis la base de données
  const level1Categories = await getAllInterCarsCategoriesByLevel(1);

  // Mapping des catégories avec leurs images spécifiques
  const categoryImageMap: Record<string, string> = {
    'Système de freinage': '/Gemini_Generated_Image_1snzch1snzch1snz.png',
    'Moteur': '/Gemini_Generated_Image_73u39b73u39b73u3-removebg-preview.png',
    'Système de direction': '/Gemini_Generated_Image_4x1qmi4x1qmi4x1q-removebg-preview.png',
    'Filtres': '/Gemini_Generated_Image_baci77baci77baci.png',
    "Système d'alimentation en carburant": '/Gemini_Generated_Image_envydmenvydmenvy-removebg-preview.png',
    'Transmission': '/Gemini_Generated_Image_rvxsq2rvxsq2rvxs.png',
  };

  // Catégories spécifiques avec leurs images
  const topCategoriesNames = [
    'Système de freinage',
    'Moteur',
    'Système de direction',
    'Filtres',
    "Système d'alimentation en carburant",
    'Transmission',
  ];

  console.log('[HOME PAGE] Toutes les catégories disponibles:', level1Categories.map(c => c.labelFr || c.label));

  const topCategories = topCategoriesNames
    .map((name) => {
      const category = level1Categories.find((cat) => (cat.labelFr || cat.label) === name);
      if (!category) {
        console.log(`[HOME PAGE] ❌ Catégorie non trouvée: "${name}"`);
        return null;
      }
      const imageUrl = categoryImageMap[name];
      if (!imageUrl) {
        console.log(`[HOME PAGE] ❌ Image non trouvée pour: "${name}"`);
        return null;
      }
      console.log(`[HOME PAGE] ✅ Catégorie trouvée: "${name}" -> image: ${imageUrl}`);
      return {
        name: category.labelFr || category.label,
        imageUrl,
        href: category.url || `/pieces-detachees/${category.id}`,
      };
    })
    .filter((cat): cat is NonNullable<typeof cat> => cat !== null);

  console.log('[HOME PAGE] TOP CATEGORIES finales:', topCategories.length);

  // Services en bas de page
  const services = [
    {
      icon: (
        <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24.833 47.1689C37.2594 47.1689 47.333 37.0954 47.333 24.6689C47.333 12.2425 37.2594 2.16895 24.833 2.16895C12.4066 2.16895 2.33301 12.2425 2.33301 24.6689C2.33301 37.0954 12.4066 47.1689 24.833 47.1689Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="3" />
          <path d="M24.833 13.3018L15.0674 17.6427C14.1636 18.0439 13.583 18.9366 13.583 19.9254V35.919H17.333V22.169H32.333V35.919H36.083V19.9254C36.083 18.9379 35.5024 18.0439 34.5986 17.6427L24.833 13.3018ZM19.833 24.669V35.919H23.583V33.419H26.083V35.919H29.833V24.669H19.833Z" fill="white" />
        </svg>
      ),
      title: 'Services Gratuits\nen Magasin',
      description: 'Assistance personnalisée incluant test et installation de batterie, recyclage d\'huile, installation d\'essuie-glaces et plus encore !',
      href: `/${locale}/services`,
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.9998 46.0904C36.1726 46.0904 46.0406 36.2224 46.0406 24.0496C46.0406 11.8768 36.1726 2.00879 23.9998 2.00879C11.827 2.00879 1.95898 11.8768 1.95898 24.0496C1.95898 36.2224 11.827 46.0904 23.9998 46.0904Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="2.93878" />
        </svg>
      ),
      title: 'Livraison\nle Jour Même',
      description: 'Retrait gratuit en magasin ou en drive. Livraison disponible dans certaines zones.',
      href: `/${locale}/livraison`,
    },
    {
      icon: (
        <svg width="48" height="49" viewBox="0 0 48 49" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 47.0508C36.4264 47.0508 46.5 36.9772 46.5 24.5508C46.5 12.1244 36.4264 2.05078 24 2.05078C11.5736 2.05078 1.5 12.1244 1.5 24.5508C1.5 36.9772 11.5736 47.0508 24 47.0508Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="3" />
        </svg>
      ),
      title: 'Programme\nde Fidélité',
      description: 'Gagnez des points à chaque achat. Échangez vos points contre des récompenses.',
      href: `/${locale}/fidelite`,
    },
    {
      icon: (
        <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24.833 47.0508C37.2594 47.0508 47.333 36.9772 47.333 24.5508C47.333 12.1244 37.2594 2.05078 24.833 2.05078C12.4066 2.05078 2.33301 12.1244 2.33301 24.5508C2.33301 36.9772 12.4066 47.0508 24.833 47.0508Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="3" />
          <path fillRule="evenodd" clipRule="evenodd" d="M14.833 22.0508C14.833 16.528 19.3102 12.0508 24.833 12.0508C30.3559 12.0508 34.833 16.528 34.833 22.0508C34.833 26.7464 32.5534 28.5833 30.4283 30.2959C29.0346 31.419 27.7073 32.4885 27.133 34.2758L26.4955 36.2008C26.3168 36.7325 25.8057 37.0801 25.2455 37.0508H24.5455C23.9853 37.0801 23.4742 36.7325 23.2955 36.2008L22.658 34.2758C22.0607 32.4938 20.7148 31.4253 19.3048 30.3058C17.1443 28.5904 14.833 26.7554 14.833 22.0508Z" fill="white" />
        </svg>
      ),
      title: 'Recrutement\nChauffeurs',
      description: 'Avancez votre carrière dès aujourd\'hui. Devenez chauffeur certifié. Postulez maintenant.',
      href: `/${locale}/carrieres`,
    },
    {
      icon: (
        <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24.333 47.1689C36.7594 47.1689 46.833 37.0954 46.833 24.6689C46.833 12.2425 36.7594 2.16895 24.333 2.16895C11.9066 2.16895 1.83301 12.2425 1.83301 24.6689C1.83301 37.0954 11.9066 47.1689 24.333 47.1689Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="3" />
          <path d="M24.333 12.1691C21.8607 12.1691 19.444 12.9022 17.3884 14.2757C15.3328 15.6492 13.7306 17.6015 12.7845 19.8855C11.8384 22.1696 11.5909 24.683 12.0732 27.1077C12.5555 29.5325 13.746 31.7598 15.4942 33.5079C17.2423 35.2561 19.4696 36.4466 21.8944 36.9289C24.3191 37.4112 26.8325 37.1637 29.1166 36.2176C31.4006 35.2715 33.3529 33.6693 34.7264 31.6137C36.0999 29.5581 36.833 27.1414 36.833 24.6691C36.8398 23.0257 36.5211 21.3971 35.8954 19.8775C35.2696 18.3579 34.3491 16.9772 33.187 15.8151C32.0249 14.653 30.6442 13.7325 29.1246 13.1067C27.6049 12.481 25.9764 12.1623 24.333 12.1691Z" fill="white" />
        </svg>
      ),
      title: 'Remises et\nConcours',
      description: 'Découvrez nos offres de remises et concours, soumettez votre remise en ligne et plus encore !',
      href: `/${locale}/promotions`,
    },
    {
      icon: (
        <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24.833 47.0508C37.2594 47.0508 47.333 36.9772 47.333 24.5508C47.333 12.1244 37.2594 2.05078 24.833 2.05078C12.4066 2.05078 2.33301 12.1244 2.33301 24.5508C2.33301 36.9772 12.4066 47.0508 24.833 47.0508Z" fill="#1E1E1E" stroke="#FFCC00" strokeWidth="3" />
          <path fillRule="evenodd" clipRule="evenodd" d="M14.833 22.0508C14.833 16.528 19.3102 12.0508 24.833 12.0508C30.3559 12.0508 34.833 16.528 34.833 22.0508C34.833 26.7464 32.5534 28.5833 30.4283 30.2959C29.0346 31.419 27.7073 32.4885 27.133 34.2758L26.4955 36.2008C26.3168 36.7325 25.8057 37.0801 25.2455 37.0508H24.5455C23.9853 37.0801 23.4742 36.7325 23.2955 36.2008L22.658 34.2758C22.0607 32.4938 20.7148 31.4253 19.3048 30.3058C17.1443 28.5904 14.833 26.7554 14.833 22.0508Z" fill="white" />
        </svg>
      ),
      title: 'Besoin d\'un\nTechnicien Certifié ?',
      description: 'Nous avons des professionnels agréés pour réparer tous vos problèmes.',
      href: `/${locale}/techniciens`,
    },
  ];

  return (
    <>
      {/* Section Hero avec fond sombre */}
      <div className="bg-gray-900 pb-16 pt-4">
        <div className="container mx-auto px-4">
          {/* Hero Banner */}
          <div className="mb-6">
            <HeroBannerPromo
              ctaHref="/promotions"
              ctaLabel="Acheter maintenant"
              images={['/hero-slide-1.png', '/hero-slide-2.png', '/hero-slide-3.png']}
              subtitle="Célébrez la saison avec des économies !"
              title="C'est les 12 jours de Speed Perks !"
            />
          </div>

          {/* Cartes de promotions */}
          <PromoCards cards={promoCards} />
        </div>
      </div>

      {/* Sélecteur de véhicule */}
      <div className="container mx-auto px-4">
        <VehicleSelectorBanner locale={locale} />
      </div>

      {/* Section TOP CATEGORIES avec fond gris */}
      <div className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <TopCategoriesSection categories={topCategories} locale={locale} />
        </div>
      </div>

      {/* Section Services */}
      <ServicesSection services={services} />

      {/* Produits en vedette */}
      <div className="container mx-auto px-4">
        <FeaturedProductList
          cta={{ label: t('FeaturedProducts.cta'), href: '/shop-all' }}
          description={t('FeaturedProducts.description')}
          emptyStateSubtitle={t('FeaturedProducts.emptyStateSubtitle')}
          emptyStateTitle={t('FeaturedProducts.emptyStateTitle')}
          products={streamableFeaturedProducts}
          title={t('FeaturedProducts.title')}
        />
      </div>

      {/* Nouveaux produits */}
      <div className="container mx-auto px-4">
        <FeaturedProductCarousel
          cta={{ label: t('NewestProducts.cta'), href: '/shop-all/?sort=newest' }}
          description={t('NewestProducts.description')}
          emptyStateSubtitle={t('NewestProducts.emptyStateSubtitle')}
          emptyStateTitle={t('NewestProducts.emptyStateTitle')}
          nextLabel={t('NewestProducts.nextProducts')}
          previousLabel={t('NewestProducts.previousProducts')}
          products={streamableNewestProducts}
          title={t('NewestProducts.title')}
        />
      </div>

      {/* Bannière Newsletter */}
      <div className="container mx-auto px-4 py-12">
        <NewsletterBanner locale={locale} />
      </div>

      {/* Newsletter */}
      <div className="container mx-auto px-4">
        <Subscribe />
      </div>
    </>
  );
}
