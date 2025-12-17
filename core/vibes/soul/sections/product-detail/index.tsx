import { ReactNode } from 'react';

import { Stream, Streamable } from '@/vibes/soul/lib/streamable';
import { Accordion, AccordionItem } from '@/vibes/soul/primitives/accordion';
import { Price, PriceLabel } from '@/vibes/soul/primitives/price-label';
import { Rating } from '@/vibes/soul/primitives/rating';
import * as Skeleton from '@/vibes/soul/primitives/skeleton';
import { type Breadcrumb, Breadcrumbs } from '@/vibes/soul/sections/breadcrumbs';
import { ProductGallery } from '@/vibes/soul/sections/product-detail/product-gallery';

import { CouponApplyButton } from './coupon-apply-button';
import { CompatibilityPreview } from './compatibility-preview';
import { ProductCompatibilityAccordion } from './product-compatibility-accordion';
import { ProductSpecifications } from './product-specifications';
import { ProductBadges } from './product-badges';
import { CompatibilityAlert } from './compatibility-alert';
import { ShippingInfo } from './shipping-info';
import { USPCards } from './usp-cards';
import { QuickSpecsContainer } from './quick-specs-container';
import { OEMNumbersSection } from './oem-numbers-section';
import { RelatedProductsSection } from './related-products-section';
import { ProductQuestionForm } from './product-question-form';
import { CompatibilityBrandsList } from './compatibility-brands-list';
import { BrandLogo } from './brand-logo';
import { CompatibilitySectionTitle } from './compatibility-section-title';
import { ProductDetailForm, ProductDetailFormAction } from './product-detail-form';
import { Field } from './schema';

interface ProductDetailProduct {
  id: string;
  title: string;
  href: string;
  images: Streamable<Array<{ src: string; alt: string }>>;
  price?: Streamable<Price | null>;
  subtitle?: string;
  mpn?: string;
  badge?: string;
  rating?: Streamable<number | null>;
  summary?: Streamable<string>;
  description?: Streamable<string | ReactNode | null>;
  accordions?: Streamable<
    Array<{
      title: string;
      content: ReactNode;
    }>
  >;
  minQuantity?: Streamable<number | null>;
  maxQuantity?: Streamable<number | null>;
  stockLevelMessage?: Streamable<string | null>;
  brandImage?: { url: string; altText: string | null } | null;
}

export interface ProductDetailProps<F extends Field> {
  breadcrumbs?: Streamable<Breadcrumb[]>;
  product: Streamable<ProductDetailProduct | null>;
  action: ProductDetailFormAction<F>;
  fields: Streamable<F[]>;
  quantityLabel?: string;
  incrementLabel?: string;
  decrementLabel?: string;
  emptySelectPlaceholder?: string;
  ctaLabel?: Streamable<string | null>;
  ctaDisabled?: Streamable<boolean | null>;
  prefetch?: boolean;
  thumbnailLabel?: string;
  additionalInformationTitle?: string;
  additionalActions?: ReactNode;
}

// eslint-disable-next-line valid-jsdoc
/**
 * This component supports various CSS variables for theming. Here's a comprehensive list, along
 * with their default values:
 *
 * ```css
 * :root {
 *   --product-detail-border: hsl(var(--contrast-100));
 *   --product-detail-subtitle-font-family: var(--font-family-mono);
 *   --product-detail-title-font-family: var(--font-family-heading);
 *   --product-detail-primary-text: hsl(var(--foreground));
 *   --product-detail-secondary-text:  hsl(var(--contrast-500));
 * }
 * ```
 */
export function ProductDetail<F extends Field>({
  product: streamableProduct,
  action,
  fields: streamableFields,
  breadcrumbs,
  quantityLabel,
  incrementLabel,
  decrementLabel,
  emptySelectPlaceholder,
  ctaLabel: streamableCtaLabel,
  ctaDisabled: streamableCtaDisabled,
  prefetch,
  thumbnailLabel,
  additionalInformationTitle = 'Additional information',
  additionalActions,
}: ProductDetailProps<F>) {
  return (
    <section className="@container" style={{ backgroundColor: '#F8F9F9' }}>
      <div className="group/product-detail mx-auto w-full max-w-screen-2xl px-4 py-10 @xl:px-6 @xl:py-14 @4xl:px-8 @4xl:py-20">
        {breadcrumbs && (
          <div className="group/breadcrumbs mb-6">
            <Breadcrumbs breadcrumbs={breadcrumbs} />
          </div>
        )}
        <Stream fallback={<ProductDetailSkeleton />} value={streamableProduct}>
          {(product) =>
            product && (
              <>
                <div className="grid grid-cols-1 items-stretch gap-x-4 gap-y-8 @2xl:grid-cols-2 @5xl:gap-x-6">
                  <div className="group/product-gallery hidden @2xl:block relative">
                    <Stream fallback={<ProductGallerySkeleton />} value={product.images}>
                      {(images) => (
                        <div className="relative max-w-xl">
                          <ProductBadges
                            brandName={product.subtitle}
                            brandImageUrl={product.brandImage?.url}
                            isPremium={product.badge === 'Premium'}
                          />
                          <BrandLogo supplierName={product.subtitle || ''} />
                          <ProductGallery images={images} aspectRatio="1:1" />
                        </div>
                      )}
                    </Stream>
                  </div>
                  {/* Product Details */}
                  <div className="text-[var(--product-detail-primary-text,hsl(var(--foreground)))]">
                    <h1 className="text-[#212B36] text-[28px] font-semibold leading-[40px]" style={{ fontFamily: 'Inter', wordWrap: 'break-word' }}>
                      {product.title}
                    </h1>
                    {/* Compatibility Brands List */}
                    <div>
                      <CompatibilityBrandsList productId={Number(product.id)} />
                    </div>
                    {/* Product ID */}
                    <div className="mb-1">
                      <span className="text-[13px] text-[#637381] font-normal" style={{ fontFamily: 'Inter', lineHeight: '20px' }}>
                        Identifiant: {product.id}
                      </span>
                    </div>
                    <div className="group/product-price mb-1">
                      <Stream fallback={<PriceLabelSkeleton />} value={product.price}>
                        {(price) => {
                          if (!price) return null;

                          let priceString = '';
                          if (typeof price === 'string') {
                            priceString = price;
                          } else if (price.type === 'sale') {
                            priceString = price.currentValue;
                          } else if (price.type === 'range') {
                            priceString = price.minValue;
                          }

                          return (
                            <div>
                              <div className="text-[#DE3618] text-[32px] font-medium leading-[20px]" style={{ fontFamily: 'Inter' }}>
                                {priceString}
                              </div>
                              <div className="mt-2 text-[#637381] text-[13px] font-normal leading-[20px]" style={{ fontFamily: 'Inter' }}>
                                TVA incluse 20%
                              </div>
                            </div>
                          );
                        }}
                      </Stream>
                    </div>
                    <div className="group/product-stock-level mb-1">
                      <Stream fallback={<ProductStockSkeleton />} value={product.stockLevelMessage}>
                        {(stockLevelMessage) =>
                          Boolean(stockLevelMessage) && (
                            <p className="text-sm text-[var(--product-detail-secondary-text,hsl(var(--contrast-500)))]">
                              {stockLevelMessage}
                            </p>
                          )
                        }
                      </Stream>
                    </div>
                    <div className="group/product-gallery mb-8 @2xl:hidden">
                      <Stream fallback={<ProductGallerySkeleton />} value={product.images}>
                        {(images) => (
                          <ProductGallery images={images} thumbnailLabel={thumbnailLabel} />
                        )}
                      </Stream>
                    </div>
                    <div className="group/product-summary">
                      <Stream fallback={<ProductSummarySkeleton />} value={product.summary}>
                        {(summary) =>
                          Boolean(summary) && (
                            <p className="text-[var(--product-detail-secondary-text,hsl(var(--contrast-500)))]">
                              {summary}
                            </p>
                          )
                        }
                      </Stream>
                    </div>
                    <div className="group/product-detail-form">
                      <Stream
                        fallback={<ProductDetailFormSkeleton />}
                        value={Streamable.all([
                          streamableFields,
                          streamableCtaLabel,
                          streamableCtaDisabled,
                          product.minQuantity,
                          product.maxQuantity,
                        ])}
                      >
                        {([fields, ctaLabel, ctaDisabled, minQuantity, maxQuantity]) => (
                          <ProductDetailForm
                            action={action}
                            additionalActions={additionalActions}
                            ctaDisabled={ctaDisabled ?? undefined}
                            ctaLabel={ctaLabel ?? undefined}
                            decrementLabel={decrementLabel}
                            emptySelectPlaceholder={emptySelectPlaceholder}
                            fields={fields}
                            incrementLabel={incrementLabel}
                            maxQuantity={maxQuantity ?? undefined}
                            minQuantity={minQuantity ?? undefined}
                            prefetch={prefetch}
                            productId={product.id}
                            quantityLabel={quantityLabel}
                          />
                        )}
                      </Stream>
                    </div>

                    {/* Compatibility Alert */}
                    <div className="mt-4">
                      <CompatibilityAlert />
                    </div>

                    {/* Stock Status */}
                    <div className="mt-4 border-b border-[#DFE3E8] pb-4">
                      <Stream fallback={<ProductStockSkeleton />} value={product.stockLevelMessage}>
                        {(stockLevelMessage) =>
                          Boolean(stockLevelMessage) && (
                            <div className="flex items-center gap-2">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M1 7H15V13H1V7Z" stroke="#212B36" strokeWidth="1.5" />
                                <path d="M4 4L8 1L12 4" stroke="#212B36" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-[#212B36] text-[13px] font-medium" style={{ fontFamily: 'Inter' }}>
                                {stockLevelMessage}
                              </span>
                              <span className="text-[#212B36] text-[13px] font-normal" style={{ fontFamily: 'Inter' }}>
                                Prix valable: {new Date().toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )
                        }
                      </Stream>
                    </div>

                    {/* Shipping Info */}
                    <ShippingInfo />

                    {/* Quick Specs */}
                    <div className="mt-6 pb-6 border-b border-[#DFE3E8]">
                      <QuickSpecsContainer productId={Number(product.id)} />
                    </div>

                    <div className="group/product-description">
                      <Stream fallback={<ProductDescriptionSkeleton />} value={product.description}>
                        {(description) =>
                          Boolean(description) && (
                            <div className="prose prose-sm max-w-none border-t border-[var(--product-detail-border,hsl(var(--contrast-100)))] py-8 [&>div>*:first-child]:mt-0 [&>div>*:last-child]:mb-0">
                              {description}
                            </div>
                          )
                        }
                      </Stream>
                    </div>
                  </div>
                </div>

                {/* USP Cards */}
                <USPCards />

                {/* Compatibility Section - First */}
                <div id="compatibility-section" className="mt-8 scroll-mt-8">
                  <CompatibilitySectionTitle productId={Number(product.id)} />
                  <ProductCompatibilityAccordion productId={Number(product.id)} />
                </div>

                {/* Technical Specifications Section - Second */}
                <div id="specifications-section" className="mt-6 scroll-mt-8">
                  <ProductSpecifications
                    productId={Number(product.id)}
                    productName={product.title}
                  />
                </div>

                {/* OEM Numbers Section - Third */}
                <div id="oem-section" className="mt-8 scroll-mt-8">
                  <OEMNumbersSection productId={Number(product.id)} />
                </div>

                {/* Product Question Form - Fifth */}
                <div id="question-form-section" className="scroll-mt-8">
                  <ProductQuestionForm
                    productName={product.title}
                    productId={Number(product.id)}
                  />
                </div>
              </>
            )
          }
        </Stream>
      </div>
    </section>
  );
}

function ProductGallerySkeleton() {
  return (
    <Skeleton.Root className="group-has-[[data-pending]]/product-gallery:animate-pulse" pending>
      <div className="w-full overflow-hidden rounded-xl @xl:rounded-2xl">
        <div className="flex">
          <Skeleton.Box className="aspect-[4/5] h-full w-full shrink-0 grow-0 basis-full" />
        </div>
      </div>
      <div className="mt-2 flex max-w-full gap-2 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton.Box className="h-12 w-12 shrink-0 rounded-lg @md:h-16 @md:w-16" key={idx} />
        ))}
      </div>
    </Skeleton.Root>
  );
}

function PriceLabelSkeleton() {
  return <Skeleton.Box className="my-5 h-4 w-20 rounded-md" />;
}

function ProductStockSkeleton() {
  return <Skeleton.Box className="my-3 h-2 w-20 rounded-md" />;
}

function RatingSkeleton() {
  return (
    <Skeleton.Root
      className="flex w-[136px] items-center gap-1 group-has-[[data-pending]]/product-rating:animate-pulse"
      pending
    >
      <Skeleton.Box className="h-4 w-[100px] rounded-md" />
      <Skeleton.Box className="h-6 w-8 rounded-xl" />
    </Skeleton.Root>
  );
}

function ProductSummarySkeleton() {
  return (
    <Skeleton.Root
      className="flex w-full flex-col gap-3.5 pb-6 group-has-[[data-pending]]/product-summary:animate-pulse"
      pending
    >
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton.Box className="h-2.5 w-full" key={idx} />
      ))}
    </Skeleton.Root>
  );
}

function ProductDescriptionSkeleton() {
  return (
    <Skeleton.Root
      className="flex w-full flex-col gap-3.5 pb-6 group-has-[[data-pending]]/product-description:animate-pulse"
      pending
    >
      {Array.from({ length: 2 }).map((_, idx) => (
        <Skeleton.Box className="h-2.5 w-full" key={idx} />
      ))}
      <Skeleton.Box className="h-2.5 w-3/4" />
    </Skeleton.Root>
  );
}

function ProductDetailFormSkeleton() {
  return (
    <Skeleton.Root
      className="flex flex-col gap-8 py-8 group-has-[[data-pending]]/product-detail-form:animate-pulse"
      pending
    >
      <div className="flex flex-col gap-5">
        <Skeleton.Box className="h-2 w-10 rounded-md" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton.Box className="h-11 w-[72px] rounded-full" key={idx} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton.Box className="h-3 w-16 rounded-md" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton.Box className="h-10 w-10 rounded-full" key={idx} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton.Box className="h-12 w-[120px] rounded-lg" />
        <Skeleton.Box className="h-12 w-[216px] rounded-full" />
      </div>
    </Skeleton.Root>
  );
}

function ProductAccordionsSkeleton() {
  return (
    <Skeleton.Root
      className="flex h-[600px] w-full flex-col gap-8 pt-4 group-has-[[data-pending]]/product-accordion:animate-pulse"
      pending
    >
      <div className="flex items-center justify-between">
        <Skeleton.Box className="h-2 w-20 rounded-sm" />
        <Skeleton.Box className="h-3 w-3 rounded-sm" />
      </div>
      <div className="mb-1 flex flex-col gap-4">
        <Skeleton.Box className="h-3 w-full rounded-sm" />
        <Skeleton.Box className="h-3 w-full rounded-sm" />
        <Skeleton.Box className="h-3 w-3/5 rounded-sm" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton.Box className="h-2 w-24 rounded-sm" />
        <Skeleton.Box className="h-3 w-3 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton.Box className="h-2 w-20 rounded-sm" />
        <Skeleton.Box className="h-3 w-3 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton.Box className="h-2 w-32 rounded-sm" />
        <Skeleton.Box className="h-3 w-3 rounded-full" />
      </div>
    </Skeleton.Root>
  );
}

export function ProductDetailSkeleton() {
  return (
    <Skeleton.Root
      className="grid grid-cols-1 items-stretch gap-x-6 gap-y-8 group-has-[[data-pending]]/product-detail:animate-pulse @2xl:grid-cols-2 @5xl:gap-x-12"
      pending
    >
      <div className="hidden @2xl:block">
        <ProductGallerySkeleton />
      </div>
      <div>
        <Skeleton.Box className="mb-6 h-4 w-20 rounded-lg" />
        <Skeleton.Box className="mb-6 h-6 w-72 rounded-lg" />
        <RatingSkeleton />
        <PriceLabelSkeleton />
        <ProductSummarySkeleton />
        <div className="mb-8 @2xl:hidden">
          <ProductGallerySkeleton />
        </div>
        <ProductDetailFormSkeleton />
      </div>
    </Skeleton.Root>
  );
}
