import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Streamable } from '@/vibes/soul/lib/streamable';
import { FeaturedProductCarousel } from '@/vibes/soul/sections/featured-product-carousel';
import { FeaturedProductList } from '@/vibes/soul/sections/featured-product-list';
import { getSessionCustomerAccessToken } from '~/auth';
import { Subscribe } from '~/components/subscribe';
import { HeroSlider } from '~/components/hero-slider';
import { VehicleFinder } from '~/components/vehicle-finder';
import { PopularCategoriesTabs } from '~/components/popular-categories-tabs';
import { HeroBannerPromo } from '~/components/hero-banner-promo';
import { VehicleSearchBar } from '~/components/vehicle-search-bar';
import { TopCategories } from '~/components/top-categories';
import { ProductCarouselHorizontal } from '~/components/product-carousel-horizontal';
import { PromotionalCards } from '~/components/promotional-cards';
import { ServicesSection } from '~/components/services-section';
import { RecyclingBanner } from '~/components/recycling-banner';
import { productCardTransformer } from '~/data-transformers/product-card-transformer';
import { getPreferredCurrencyCode } from '~/lib/currency';
import { getInterCarsLevel1WithChildren } from '~/lib/db/intercars-queries';
import { db } from '~/lib/db';

import { getPageData } from './page-data';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const sliderImages = ['/hero-1.png', '/hero-2.png', '/hero-3.png'];
  const popularTabs = await getInterCarsLevel1WithChildren({ limitLevel1: 8, limitLevel2: 12 });
  
  // Récupérer les constructeurs les plus recherchés
  const popularManufacturers = await db.manufacturer.findMany({
    take: 12,
    orderBy: {
      name: 'asc',
    },
    where: {
      name: {
        in: [
          'RENAULT',
          'PEUGEOT',
          'CITROËN',
          'VOLKSWAGEN',
          'OPEL',
          'FORD',
          'FIAT',
          'BMW',
          'MERCEDES-BENZ',
          'AUDI',
          'SEAT',
          'NISSAN',
        ],
      },
    },
  });

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

  // Données pour le Hero Banner
  const heroBannerData = {
    title: "It's the 12 Days of Speed Perks!",
    subtitle: 'Celebrate the season with savings!',
    ctaText: 'Shop Now',
    ctaLink: '/shop-all',
    imageUrl: '/hero-promo.jpg',
    promoCards: [
      {
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" className="h-8 w-8">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
          </svg>
        ),
        title: 'FREE Carquest Standard Brake Pads',
        description:
          'When you buy 2 Carquest rotors. Upgrade to Premium Gold for $10 OR Professional Platinum pads for $20.',
      },
      {
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" className="h-8 w-8">
            <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3-6H6V6h4.5v5zm5.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5-6H13V6h5.5v5z" />
          </svg>
        ),
        title: 'Auto Batteries Starting At $89.99',
        description: 'FREE Testing & Install with purchase. No appointment needed.*',
      },
      {
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" className="h-8 w-8">
            <path d="M12 2c-4 0-8 .5-8 4v3.5c0 1.93 1.57 3.5 3.5 3.5H9l-2 3v2h10v-2l-2-3h1.5c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4z" />
          </svg>
        ),
        title: 'Save Up To $20 + FREE Oil Filter',
        description: '5 Quarts of Synthetic Motor Oil + ANY Oil Filter for FREE',
      },
    ],
  };

  // Données pour les catégories
  const categoriesData = [
    {
      id: '1',
      name: 'Batteries',
      imageUrl: '/categories/batteries.jpg',
      href: '/category/batteries',
    },
    {
      id: '2',
      name: 'Winter Maintenance',
      imageUrl: '/categories/winter.jpg',
      href: '/category/winter',
    },
    {
      id: '3',
      name: 'Brake Pads & Shoes',
      imageUrl: '/categories/brake-pads.jpg',
      href: '/category/brake-pads',
    },
    {
      id: '4',
      name: 'Rotors & Drums',
      imageUrl: '/categories/rotors.jpg',
      href: '/category/rotors',
    },
    {
      id: '5',
      name: 'Oil Change Bundles',
      imageUrl: '/categories/oil-change.jpg',
      href: '/category/oil-change',
    },
    {
      id: '6',
      name: 'Oil Filters',
      imageUrl: '/categories/oil-filters.jpg',
      href: '/category/oil-filters',
    },
  ];

  // Données pour les produits
  const recentlyViewedProducts = [
    {
      id: '1',
      name: 'Antifreeze and Coolant: 50/50 Ready-to-Use',
      brand: 'Prestone',
      price: '$11.99',
      rating: 5,
      reviewCount: 904,
      imageUrl: '/products/antifreeze.jpg',
      href: '/product/antifreeze',
    },
    {
      id: '2',
      name: 'Oil Filter: Ideal for Synthetic Oil',
      brand: 'Carquest Premium',
      price: '$9.99',
      rating: 5,
      reviewCount: 1337,
      imageUrl: '/products/oil-filter.jpg',
      href: '/product/oil-filter',
    },
    {
      id: '3',
      name: 'Upper Cylinder Lube/Fuel Treatment',
      brand: 'Lucas Oil Products',
      price: '$6.99',
      rating: 5,
      reviewCount: 725,
      imageUrl: '/products/fuel-treatment.jpg',
      href: '/product/fuel-treatment',
    },
    {
      id: '4',
      name: 'De-Icer -30 Deg. F Windshield Washer Fluid, 1 Gal',
      brand: 'Rain-X',
      price: '$7.49',
      rating: 5,
      reviewCount: 70,
      imageUrl: '/products/washer-fluid.jpg',
      href: '/product/washer-fluid',
    },
  ];

  // Données pour les cartes promotionnelles
  const promotionalCardsData = [
    {
      id: '1',
      title: '$15 Gift Card + FREE Filter',
      description:
        '5 Quarts of Mobil 1 Advanced Clean Motor Oil + ANY Carquest OR FRAM Oil Filter',
      imageUrl: '/promo/mobil-oil.jpg',
      href: '/promo/mobil-oil',
    },
    {
      id: '2',
      title: 'Save $10',
      description:
        'When you buy 2 Rain-X Latitude Water Repellency Front Wiper Blades. Must buy 2.',
      imageUrl: '/promo/wiper-blades.jpg',
      href: '/promo/wiper-blades',
    },
    {
      id: '3',
      title: '2 For $12',
      description: 'Rain-X All Season OR De-Icer washer fluid. Must buy 2.',
      imageUrl: '/promo/washer-fluid.jpg',
      href: '/promo/washer-fluid',
    },
    {
      id: '4',
      title: 'Holiday Gift Ideas',
      description: 'Save more on DIY gifts that go the distance!',
      imageUrl: '/promo/holiday-gifts.jpg',
      href: '/promo/holiday-gifts',
    },
  ];

  // Données pour les services
  const servicesData = [
    {
      id: '1',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
        </svg>
      ),
      title: 'Free In Store Services',
      description:
        'Personalized care including battery testing and installation, oil recycling, wiper installation and more!',
    },
    {
      id: '2',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      ),
      title: 'Advance Same Day',
      description: 'Free in store or curbside pickup. Plus delivery available in select markets.',
    },
    {
      id: '3',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
      title: 'Speed Perks',
      description: 'Get points for every purchase. Redeem points for rewards.',
    },
    {
      id: '4',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
      title: 'Now Hiring 18 Year Old Drivers',
      description: 'Advance your future today. Become a certified fleet driver. Apply now.',
    },
    {
      id: '5',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM11 12H9V9h2V7H7v10h2v-3h2z" />
        </svg>
      ),
      title: 'Rebates and Sweepstakes',
      description:
        'Find out about rebate and sweepstake offers, submit your rebate online and more!',
    },
    {
      id: '6',
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
      ),
      title: 'Need a Certified Technician?',
      description: 'We have approved professionals to repair any problem you have.',
    },
  ];

  return (
    <>
      {/* Hero Banner avec Promotions */}
      <section className="mb-10">
        <HeroBannerPromo {...heroBannerData} />
      </section>

      {/* Barre de recherche de véhicule */}
      <section className="mb-16">
        <VehicleSearchBar locale={locale} />
      </section>

      {/* Top Categories */}
      <section className="mb-16 bg-[#FBFBFB] py-12">
        <TopCategories categories={categoriesData} />
      </section>

      {/* Recently Viewed & More */}
      <section className="mb-16 bg-[#F2F2F2] py-12">
        <ProductCarouselHorizontal title="RECENTLY VIEWED & MORE" products={recentlyViewedProducts} />
      </section>

      {/* Under The Hood Savings */}
      <section className="mb-16 bg-[#FBFBFB] py-12">
        <PromotionalCards title="UNDER THE HOOD SAVINGS" cards={promotionalCardsData} />
      </section>

      {/* Top Sellers */}
      <section className="mb-16 bg-[#F2F2F2] py-12">
        <ProductCarouselHorizontal title="TOP SELLERS" products={recentlyViewedProducts} />
      </section>

      {/* May We Suggest */}
      <section className="mb-16 bg-[#FBFBFB] py-12">
        <ProductCarouselHorizontal title="MAY WE SUGGEST" products={recentlyViewedProducts} />
      </section>

      {/* Services Section */}
      <section className="mb-16 bg-[#F2F2F2] py-12">
        <ServicesSection services={servicesData} />
      </section>

      {/* Recycling Banner */}
      <section className="mb-16">
        <RecyclingBanner />
      </section>

      {/* Disclaimer */}
      <section className="mb-10">
        <div className="mx-auto max-w-[1408px] px-4 text-center md:px-8">
          <p className="text-base text-black">
            *Restrictions apply: See coupon and promotion offer details
          </p>
        </div>
      </section>

      <FeaturedProductList
        cta={{ label: t('FeaturedProducts.cta'), href: '/shop-all' }}
        description={t('FeaturedProducts.description')}
        emptyStateSubtitle={t('FeaturedProducts.emptyStateSubtitle')}
        emptyStateTitle={t('FeaturedProducts.emptyStateTitle')}
        products={streamableFeaturedProducts}
        title={t('FeaturedProducts.title')}
      />

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

      <Subscribe />
    </>
  );
}
