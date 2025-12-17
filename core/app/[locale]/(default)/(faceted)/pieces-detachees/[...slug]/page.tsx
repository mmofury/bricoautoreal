import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';
import Link from 'next/link';
import { Prisma } from '@prisma/client';

import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { ProductCarousel } from '@/vibes/soul/sections/product-carousel';
import { Breadcrumbs } from '@/vibes/soul/sections/breadcrumbs';
import { VehicleSelector } from '~/components/vehicle-selector';
import { VehicleBadgeLauncher } from '~/components/vehicle-badge/launcher';
import { VehicleCompatBanner } from '~/components/vehicle-compat-banner';
import { VehicleSelectorBanner } from '~/components/vehicle-selector-banner';
import { db } from '~/lib/db';
import { preserveVehicleContextInCategoryUrl, removeVehicleContextFromUrl, type VehicleContext } from '~/lib/utils/vehicle-context';
import { getInterCarsPageData } from './page-data';
import { getInterCarsCategoryByUrl } from '~/lib/db/intercars-queries';

const placeholderHero =
  'data:image/svg+xml;utf8,' +
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">' +
  '<rect width="240" height="160" fill="%23f8fafc" />' +
  '<rect x="50" y="40" width="140" height="80" rx="8" ry="8" fill="none" stroke="%23cbd5e1" stroke-width="4"/>' +
  '<circle cx="90" cy="120" r="12" fill="none" stroke="%23cbd5e1" stroke-width="4"/>' +
  '<circle cx="150" cy="120" r="12" fill="none" stroke="%23cbd5e1" stroke-width="4"/>' +
  '<line x1="80" y1="70" x2="160" y2="70" stroke="%23cbd5e1" stroke-width="4"/>' +
  '</svg>';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Helper pour normaliser les URLs de catégories avec le locale
function normalizeCategoryUrl(url: string | null, locale: string): string {
  if (!url) return '#';
  // Si l'URL commence par /pieces-detachees, ajouter le locale
  if (url.startsWith('/pieces-detachees')) {
    return `/${locale}${url}`;
  }
  // Si l'URL a déjà un locale, la retourner telle quelle
  if (url.startsWith(`/${locale}/`)) {
    return url;
  }
  // Sinon, ajouter le locale au début
  return `/${locale}${url.startsWith('/') ? url : `/${url}`}`;
}

interface Props {
  params: Promise<{
    slug: string[];
    locale: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug: slugSegments, locale } = await props.params;
  const searchParams = await props.searchParams;
  const pageData = await getInterCarsPageData(slugSegments);

  if (!pageData.categoryInfo) {
    return {
      title: 'Catégorie introuvable',
    };
  }

  const title = pageData.categoryInfo.labelFr || pageData.categoryInfo.label;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  // URL canonique (toujours pointer vers la page 1 sans pagination)
  const baseUrl = `/${locale}/pieces-detachees/${slugSegments.join('/')}`;
  const canonicalUrl = `https://bricoauto.com${baseUrl}`;

  // URLs prev/next pour la pagination
  const prevUrl = page > 2 ? `https://bricoauto.com${baseUrl}?page=${page - 1}` : page === 2 ? canonicalUrl : undefined;
  const nextUrl = page < pageData.totalPages ? `https://bricoauto.com${baseUrl}?page=${page + 1}` : undefined;

  return {
    title: page > 1 ? `${title} - Page ${page}` : title,
    description: `Découvrez tous nos produits dans la catégorie ${title}`,
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      ...(prevUrl && { 'rel:prev': prevUrl }),
      ...(nextUrl && { 'rel:next': nextUrl }),
    },
  };
}

export default async function InterCarsCategoryPage(props: Props) {
  const { slug: slugSegments, locale } = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('Faceted');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  // Debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[InterCars Page] Slug segments:', slugSegments);
    console.log('[InterCars Page] Locale:', locale);
  }

  const pageData = await getInterCarsPageData(slugSegments, page);

  if (!pageData.categoryInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[InterCars Page] Category not found for segments:', slugSegments);
    }
    return notFound();
  }

  // Si on filtre par véhicule et qu'il n'y a aucun produit compatible, afficher un message
  if (pageData.totalCount === 0 && pageData.vehicle && pageData.categoryInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          {pageData.categoryInfo.labelFr || pageData.categoryInfo.label}
        </h1>
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold mb-2">Aucun produit compatible trouvé</p>
          <p>
            Aucun produit dans cette catégorie n'est compatible avec le véhicule sélectionné
            ({pageData.vehicle.brandSlug} {pageData.vehicle.groupSlug} {pageData.vehicle.modelSlug}
            {pageData.vehicle.engineSlug ? ` – ${pageData.vehicle.engineSlug}` : ''}).
          </p>
          <p className="mt-2">
            <a
              href={removeVehicleContextFromUrl(pageData.categoryInfo.url || '#')}
              className="text-blue-600 underline"
            >
              Voir tous les produits de cette catégorie
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Ne pas afficher les catégories qui n'ont aucun produit (sans filtre véhicule)
  if (pageData.totalCount === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[InterCars Page] Category has no products:', slugSegments);
      console.log('[InterCars Page] Category info:', pageData.categoryInfo);
      console.log('[InterCars Page] Level:', pageData.level);
    }
    // Pour les catégories de niveau 3, on affiche quand même la page même sans produits
    // car elles peuvent servir de navigation
    if (pageData.level !== 3) {
      return notFound();
    }
  }

  const categoryInfo = pageData.categoryInfo;
  const vehicle = pageData.vehicle;
  const isLevel1 = pageData.level === 1;

  // Construire le contexte véhicule pour les URLs
  const vehicleContext: VehicleContext | null = vehicle
    ? {
      brandSlug: vehicle.brandSlug,
      groupSlug: vehicle.groupSlug,
      modelSlug: vehicle.modelSlug,
      vehicleId: vehicle.vehicleId,
      engineSlug: vehicle.engineSlug,
    }
    : null;

  // Construire le breadcrumb
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  // Ajouter "Accueil" et "Pièces détachées"
  breadcrumbs.push({ label: 'Accueil', href: `/${locale}` });
  const piecesDetacheesUrl = `/${locale}/pieces-detachees`;
  breadcrumbs.push({
    label: 'Pièces détachées',
    href: preserveVehicleContextInCategoryUrl(piecesDetacheesUrl, vehicleContext),
  });

  // Ajouter le parent si disponible
  if (categoryInfo.parent) {
    const parentUrl = categoryInfo.parent.url || '#';
    breadcrumbs.push({
      label: categoryInfo.parent.labelFr || categoryInfo.parent.label,
      href: preserveVehicleContextInCategoryUrl(parentUrl, vehicleContext),
    });
  }

  // Ajouter la catégorie actuelle
  const currentUrl = categoryInfo.url || '#';
  breadcrumbs.push({
    label: categoryInfo.labelFr || categoryInfo.label,
    href: preserveVehicleContextInCategoryUrl(currentUrl, vehicleContext),
  });

  // Transformer les produits pour le format attendu
  const streamableProducts = Streamable.from(async () => {
    const format = await getFormatter();

    return pageData.products
      .map((product) => ({
        id: product.id.toString(),
        title: product.productName || product.articleNo,
        // Use articleNo as slug - the product page will resolve it to entityId via SKU lookup
        href: `/${locale}/product/${product.articleNo}`,
        image: product.images[0]
          ? {
            src: product.images[0].imageUrl || '',
            alt: product.productName || product.articleNo,
          }
          : undefined,
        price: {
          // TODO: Intégrer avec BigCommerce pour récupérer les prix réels
          currencyCode: 'EUR',
          value: 0,
        },
        subtitle: product.supplierName || undefined,
      }));
  });

  const streamableTotalCount = Streamable.from(async () => {
    const format = await getFormatter();
    return format.number(pageData.totalCount);
  });

  const streamablePagination = Streamable.from(async () => {
    return {
      hasNextPage: pageData.page < pageData.totalPages,
      hasPreviousPage: pageData.page > 1,
      startCursor: ((pageData.page - 1) * pageData.pageSize + 1).toString(),
      endCursor: (Math.min(pageData.page * pageData.pageSize, pageData.totalCount)).toString(),
    };
  });

  // Construire les filtres de navigation (catégories enfants)
  const streamableFilters = Streamable.from(async () => {
    if (categoryInfo.children.length === 0) {
      return [];
    }

    // Préserver le contexte véhicule dans les liens des catégories enfants
    // (vehicleContext est défini dans le scope parent)

    return [
      {
        type: 'link-group' as const,
        label: t('Category.subCategories'),
        links: categoryInfo.children.map((child) => {
          const baseUrl = child.url || '#';
          const urlWithVehicle = preserveVehicleContextInCategoryUrl(baseUrl, vehicleContext);
          return {
            label: child.labelFr || child.label,
            href: urlWithVehicle,
          };
        }),
      },
    ];
  });

  const title = categoryInfo.labelFr || categoryInfo.label;
  const breadcrumbsStream = Streamable.from(async () => breadcrumbs);
  const heroImage =
    pageData.products[0]?.images?.[0]?.imageUrl ||
    placeholderHero;

  const baseCategoryUrl = preserveVehicleContextInCategoryUrl(
    categoryInfo.url || '#',
    vehicleContext,
  );

  // URL courante de la catégorie (sans ou avec contexte véhicule)
  const currentCategoryPath = `/${locale}/pieces-detachees/${slugSegments.join('/')}`;
  const resetVehicleUrl = removeVehicleContextFromUrl(currentCategoryPath);

  const currentSupplier = pageData.supplierName;
  const altSuppliers =
    pageData.suppliersForCategory
      ?.filter((s) => s.supplier_name && s.supplier_name !== currentSupplier)
      .slice(0, 24)
      .map((s) => {
        const logo = pageData.supplierLogos?.find(
          (l) => l.supplier_name.toLowerCase() === s.supplier_name.toLowerCase(),
        );
        const img =
          logo?.filename || logo?.logo_url
            ? logo?.filename
              ? `/supplier-logos/${encodeURIComponent(logo.filename)}`
              : logo.logo_url
            : null;
        return {
          name: s.supplier_name,
          productCount: Number(s.product_count || 0),
          logo: img,
          slug: slugify(s.supplier_name),
        };
      }) ?? [];

  // Marques constructeurs ayant des produits dans cette catégorie (compatibilité)
  const manufacturers = await db.$queryRaw<
    Array<{ name: string; product_count: bigint }>
  >(Prisma.sql`
    SELECT m.name AS name, COUNT(DISTINCT p.id) AS product_count
    FROM products p
    JOIN product_intercars_categories pic ON pic.product_id = p.id
    JOIN intercars_categories icc ON icc.id = pic.intercars_category_id
    JOIN intercars_hierarchy h ON h.id = icc.hierarchy_id
    JOIN product_vehicle_compatibility pvc ON pvc.product_id = p.id
    JOIN vehicles v ON v.id = pvc.vehicle_id
    JOIN vehicle_models vm ON vm.id = v.model_id
    JOIN manufacturers m ON m.id = vm.manufacturer_id
    WHERE ${pageData.level === 1
      ? Prisma.sql`h.level1_id = ${categoryInfo.id}`
      : pageData.level === 2
        ? Prisma.sql`h.level2_id = ${categoryInfo.id}`
        : pageData.level === 3
          ? Prisma.sql`h.level3_id = ${categoryInfo.id}`
          : Prisma.sql`h.level4_id = ${categoryInfo.id}`
    }
    GROUP BY m.name
    ORDER BY product_count DESC, m.name
    LIMIT 40
  `);

  // Dédupliquer les constructeurs par nom
  const uniqueManufacturers = Array.from(
    new Map(manufacturers.map(m => [m.name, m])).values()
  );

  const popularManufacturers = uniqueManufacturers.slice(0, 12);
  const moreManufacturers = uniqueManufacturers.slice(12);

  // Récupérer les modèles de véhicules avec le plus de produits compatibles
  const vehicleModelsRaw = await db.$queryRaw<
    Array<{
      manufacturer_name: string;
      model_name: string;
      product_count: bigint;
    }>
  >(Prisma.sql`
    SELECT 
      m.name AS manufacturer_name,
      vm.model_name AS model_name,
      COUNT(DISTINCT p.id) AS product_count
    FROM products p
    JOIN product_intercars_categories pic ON pic.product_id = p.id
    JOIN intercars_categories icc ON icc.id = pic.intercars_category_id
    JOIN intercars_hierarchy h ON h.id = icc.hierarchy_id
    JOIN product_vehicle_compatibility pvc ON pvc.product_id = p.id
    JOIN vehicles v ON v.id = pvc.vehicle_id
    JOIN vehicle_models vm ON vm.id = v.model_id
    JOIN manufacturers m ON m.id = vm.manufacturer_id
    WHERE ${pageData.level === 1
      ? Prisma.sql`h.level1_id = ${categoryInfo.id}`
      : pageData.level === 2
        ? Prisma.sql`h.level2_id = ${categoryInfo.id}`
        : pageData.level === 3
          ? Prisma.sql`h.level3_id = ${categoryInfo.id}`
          : Prisma.sql`h.level4_id = ${categoryInfo.id}`
    }
    GROUP BY m.name, vm.model_name
    ORDER BY product_count DESC, m.name, vm.model_name
    LIMIT 24
  `);

  // Générer les slugs pour les modèles
  const vehicleModels = vehicleModelsRaw.map((model) => ({
    ...model,
    manufacturer_slug: slugify(model.manufacturer_name),
    model_slug: slugify(model.model_name),
  }));

  // URLs pour les balises link rel="prev" et rel="next"
  const baseUrlForPagination = `/${locale}/pieces-detachees/${slugSegments.join('/')}`;
  const prevPageUrl = page > 2 ? `${baseUrlForPagination}?page=${page - 1}` : page === 2 ? baseUrlForPagination : null;
  const nextPageUrl = page < pageData.totalPages ? `${baseUrlForPagination}?page=${page + 1}` : null;

  return (
    <>
      {/* Balises SEO pour la pagination */}
      {prevPageUrl && (
        <link rel="prev" href={`https://bricoauto.com${prevPageUrl}`} />
      )}
      {nextPageUrl && (
        <link rel="next" href={`https://bricoauto.com${nextPageUrl}`} />
      )}
      <link rel="canonical" href={`https://bricoauto.com${baseUrlForPagination}`} />

      {/* Sélecteur véhicule en bandeau */}
      <div className="bg-gray-100 py-4">
        <div className="container mx-auto px-4">
          <VehicleSelectorBanner locale={locale} variant="inline" />
        </div>
      </div>

      {/* Hero / Breadcrumbs */}
      <div className="bg-gray-100 py-6">
        <div className="mx-auto w-full max-w-screen-2xl px-4">
          <Breadcrumbs breadcrumbs={breadcrumbsStream} />

          <div className="mt-4">
            {currentSupplier && (
              <div className="mt-2 inline-flex items-center gap-3 rounded-md border border-[#dfe3e8] bg-white px-3 py-2 text-sm text-gray-900">
                <span>Marque sélectionnée : {currentSupplier}</span>
                <Link
                  href={baseCategoryUrl}
                  className="text-[#0077c7] underline hover:text-gray-900"
                >
                  Réinitialiser la marque
                </Link>
              </div>
            )}
            {vehicleContext && (
              <div className="mt-3">
                <VehicleSelector vehicleContext={vehicleContext} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout pleine largeur */}
      <div className="bg-gray-100">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">

          {/* CONTENU PRINCIPAL */}
          <div className="space-y-6">

            {/* TITRE DE LA CATÉGORIE */}
            <div
              className="rounded-lg bg-gray-100 p-6 shadow-sm"
              style={{ clipPath: 'polygon(0 20px, 20px 0, 100% 0, 100% 100%, 0 100%)' }}
            >
              <h1 className="text-3xl font-bold text-gray-900">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Découvrez notre sélection de {title.toLowerCase()} de qualité
              </p>
            </div>

            {/* CATÉGORIES NIVEAU 2 pour level 1 */}
            {isLevel1 && categoryInfo.children.length > 0 && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Acheter et remplacer : {title} pour votre véhicule
                  </h2>
                  <div className="flex items-center gap-0">
                    <div className="h-1 w-20 rounded bg-[#FFCC00]" />
                    <div className="h-1 flex-1 rounded bg-gray-300" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryInfo.children.map((level2) => (
                    <div
                      key={level2.id}
                      className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:bg-[#1E1E1E] hover:shadow-xl"
                      style={{ clipPath: 'polygon(0 20px, 20px 0, 100% 0, 100% 100%, 0 100%)' }}
                    >


                      <div className="relative p-5">
                        {/* Catégorie niveau 2 avec image */}
                        <Link
                          href={preserveVehicleContextInCategoryUrl(normalizeCategoryUrl(level2.url, locale), vehicleContext)}
                          className="mb-4 flex items-center gap-4"
                        >
                          {level2.imageUrl && (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-white/10">
                              <img
                                src={level2.imageUrl}
                                alt={level2.labelFr || level2.label}
                                className="h-full w-full object-contain transition-all group-hover:brightness-0 group-hover:invert"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <h3 className="flex-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-[#FFCC00]">
                            {level2.labelFr || level2.label}
                          </h3>
                        </Link>

                        {/* Sous-catégories niveau 3 */}
                        {level2.children && level2.children.length > 0 && (
                          <div className="border-t border-gray-100 pt-3 transition-colors group-hover:border-white/20">
                            <ul className="grid grid-cols-1 gap-2">
                              {level2.children.slice(0, 6).map((level3) => (
                                <li key={level3.id}>
                                  <Link
                                    href={preserveVehicleContextInCategoryUrl(normalizeCategoryUrl(level3.url, locale), vehicleContext)}
                                    className="flex items-center text-sm text-gray-600 transition-colors group-hover:text-white hover:text-[#FFCC00]"
                                  >
                                    <span className="mr-2 text-[#FFCC00]">→</span>
                                    {level3.labelFr || level3.label}
                                  </Link>
                                </li>
                              ))}
                              {level2.children.length > 6 && (
                                <li className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-500">
                                  +{level2.children.length - 6} autres...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOUS-CATÉGORIES pour level 2+ */}
            {!isLevel1 && categoryInfo.children.length > 0 && (
              <div className="pb-2">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {pageData.level === 2 ? 'Sous-catégories' : 'Catégories'}
                  </h2>
                  <div className="flex items-center gap-0">
                    <div className="h-1 w-20 rounded bg-[#FFCC00]" />
                    <div className="h-1 flex-1 rounded bg-gray-300" />
                  </div>
                </div>
                <div className="relative overflow-x-auto">
                  <div className="flex gap-3 pb-2">
                    {categoryInfo.children.map((child) => (
                      <Link
                        key={child.id}
                        href={preserveVehicleContextInCategoryUrl(normalizeCategoryUrl(child.url, locale), vehicleContext)}
                        className="group flex flex-shrink-0 items-center justify-center rounded-lg bg-white px-6 py-3 shadow-sm transition-all hover:shadow-md hover:scale-105 whitespace-nowrap"
                        style={{ clipPath: 'polygon(0 15px, 15px 0, 100% 0, 100% 100%, 0 100%)' }}
                      >
                        <div className="text-sm font-bold text-gray-900 group-hover:text-[#FFCC00] transition-colors first-letter:uppercase lowercase">
                          {child.labelFr || child.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION PRODUITS */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <Stream value={streamableTotalCount}>
                {(count) => (
                  <h2 className="mb-6 text-2xl font-bold text-gray-900">
                    {count} produits pour {title}
                  </h2>
                )}
              </Stream>

              <ProductCarousel
                products={streamableProducts}
                emptyStateTitle="Aucun produit trouvé"
                emptyStateSubtitle="Essayez de modifier vos filtres ou de retirer le véhicule sélectionné."
                showButtons={true}
                showScrollbar={true}
                placeholderCount={20}
              />

              {/* Pagination */}
              <Stream value={streamablePagination}>
                {(pagination) => {
                  if (!pagination.hasNextPage && !pagination.hasPreviousPage) return null;

                  const currentPage = pageData.page;
                  const totalPages = pageData.totalPages;
                  const maxPagesToShow = 7;

                  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                  if (endPage - startPage + 1 < maxPagesToShow) {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                  }

                  const pages = Array.from(
                    { length: endPage - startPage + 1 },
                    (_, i) => startPage + i
                  );

                  const basePaginationUrl = `/${locale}/pieces-detachees/${slugSegments.join('/')}`;

                  return (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      {pagination.hasPreviousPage && (
                        <Link
                          href={`${basePaginationUrl}?page=${currentPage - 1}`}
                          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[gray-900] transition hover:border-[#FFCC00] hover:text-[#FFCC00]"
                        >
                          Précédent
                        </Link>
                      )}

                      {startPage > 1 && (
                        <>
                          <Link
                            href={`${basePaginationUrl}?page=1`}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-[gray-900] transition hover:border-[#FFCC00] hover:text-[#FFCC00]"
                          >
                            1
                          </Link>
                          {startPage > 2 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                        </>
                      )}

                      {pages.map((pageNum) => (
                        <Link
                          key={pageNum}
                          href={pageNum === 1 ? basePaginationUrl : `${basePaginationUrl}?page=${pageNum}`}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition ${pageNum === currentPage
                            ? 'border-[#FFCC00] bg-[#FFCC00] text-[gray-900]'
                            : 'border-gray-300 bg-white text-[gray-900] hover:border-[#FFCC00] hover:text-[#FFCC00]'
                            }`}
                        >
                          {pageNum}
                        </Link>
                      ))}

                      {endPage < totalPages && (
                        <>
                          {endPage < totalPages - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Link
                            href={`${basePaginationUrl}?page=${totalPages}`}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-[gray-900] transition hover:border-[#FFCC00] hover:text-[#FFCC00]"
                          >
                            {totalPages}
                          </Link>
                        </>
                      )}

                      {pagination.hasNextPage && (
                        <Link
                          href={`${basePaginationUrl}?page=${currentPage + 1}`}
                          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[gray-900] transition hover:border-[#FFCC00] hover:text-[#FFCC00]"
                        >
                          Suivant
                        </Link>
                      )}
                    </div>
                  );
                }}
              </Stream>
            </div>

          </div>
        </div>
      </div>



      {/* Section "Autres produits qui pourraient vous intéresser" (pour niveau 3) */}
      {
        pageData.level === 3 && categoryInfo.parent && (
          <div className="bg-white py-6">
            <div className="mx-auto w-full max-w-screen-2xl px-4">
              <h2 className="text-xl font-semibold text-[#0f172a] mb-4">
                Autres produits qui pourraient vous intéresser
              </h2>
              <Stream
                value={Streamable.from(async () => {
                  // Récupérer la catégorie parent (niveau 2) avec tous ses enfants (niveau 3)
                  const parentSlug = categoryInfo.parent?.url?.replace('/pieces-detachees/', '').replace(/-2$/, '');
                  if (!parentSlug) return [];

                  const parentCategory = await getInterCarsCategoryByUrl(parentSlug, 2, vehicle?.vehicleId);
                  if (!parentCategory?.categoryInfo) return [];

                  // Filtrer pour exclure la catégorie actuelle
                  return parentCategory.categoryInfo.children.filter(
                    (child) => child.id !== categoryInfo.id
                  );
                })}
                fallback={
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-24 animate-pulse rounded-lg bg-[#f1f5f9]" />
                    ))}
                  </div>
                }
              >
                {(siblings) => {
                  if (siblings.length === 0) return null;

                  return (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {siblings.map((sibling) => (
                        <Link
                          key={sibling.id}
                          href={preserveVehicleContextInCategoryUrl(normalizeCategoryUrl(sibling.url, locale), vehicleContext)}
                          className="group flex flex-col items-center rounded-lg border border-[#e2e8f0] bg-white p-4 text-center transition hover:border-[#0077c7] hover:shadow-md"
                        >
                          {sibling.imageUrl && (
                            <img
                              src={sibling.imageUrl}
                              alt={sibling.labelFr || sibling.label}
                              className="mb-2 h-16 w-16 object-contain"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="text-sm font-medium text-[#0f172a] group-hover:text-[#0077c7]">
                            {((sibling.labelFr || sibling.label).charAt(0).toUpperCase() + (sibling.labelFr || sibling.label).slice(1))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                }}
              </Stream>
            </div>
          </div>
        )
      }

      {/* Marques alternatives */}
      {
        altSuppliers.length > 0 && (
          <div className="bg-gray-100 py-6">
            <div className="mx-auto w-full max-w-screen-2xl px-4">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-[gray-900] mb-2">
                  Meilleures marques : {title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()}
                </h2>
                <div className="flex items-center gap-0">
                  <div className="h-1 w-20 rounded bg-[#FFCC00]" />
                  <div className="h-1 flex-1 rounded bg-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {altSuppliers.map((s) => (
                  <Link
                    key={s.name}
                    href={`/${locale}/${(categoryInfo.url || '')
                      .replace(/^\/?fr\//i, '')
                      .replace(/^\/+/, '')}/marque/${s.slug}`}
                    className="group flex flex-col items-center justify-center rounded-lg bg-white p-3 shadow-sm transition-all hover:shadow-md hover:scale-105"
                    style={{ clipPath: 'polygon(0 15px, 15px 0, 100% 0, 100% 100%, 0 100%)' }}
                  >
                    <div className="h-12 w-full flex items-center justify-center overflow-hidden mb-2">
                      {s.logo ? (
                        <img
                          src={s.logo}
                          alt={s.name}
                          className="max-h-12 max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm font-bold text-[gray-900] group-hover:text-[#FFCC00] transition-colors text-center">
                          {s.name}
                        </span>
                      )}
                    </div>

                  </Link>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Marques constructeurs compatibles */}
      {
        manufacturers.length > 0 && (
          <div className="bg-gray-100 py-6">
            <div className="mx-auto w-full max-w-screen-2xl px-4">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Marques de véhicules populaires
                </h2>
                <div className="flex items-center gap-0">
                  <div className="h-1 w-20 rounded bg-[#FFCC00]" />
                  <div className="h-1 flex-1 rounded bg-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {popularManufacturers.slice(0, 12).map((m) => (
                  <Link
                    key={m.name}
                    href={`${normalizeCategoryUrl(categoryInfo.url, locale)}/${slugify(m.name)}`}
                    className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-4 text-center transition-all hover:border-[#FFCC00] hover:shadow-md"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {m.name}
                    </span>
                  </Link>
                ))}
              </div>


            </div>
          </div>
        )
      }



      {/* Bloc SEO : Contenu textuel en bas de page */}
      {
        vehicleModels.length > 0 && (
          <div className="bg-white py-8 border-t border-[#e5e7eb]">
            <div className="mx-auto w-full max-w-screen-2xl px-4">
              <h2 className="text-2xl font-bold text-[#0f172a] mb-2">
                {title} de voiture : en savoir plus !
              </h2>
              <p className="text-base text-[#475569] mb-6">
                Comment bien faire son choix, quand faire le changement et combien ça coûte ?
              </p>

              <h3 className="text-lg font-semibold text-[#0f172a] mb-4">
                {title} pour des modèles de voitures populaires
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {vehicleModels.map((model) => (
                  <Link
                    key={`${model.manufacturer_slug}-${model.model_slug}`}
                    href={`/${locale}/pieces-auto/${model.manufacturer_slug}/${model.model_slug}`}
                    className="text-[#0077c7] hover:underline text-sm"
                  >
                    {title} pour {model.manufacturer_name} {model.model_name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}

