import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Prisma } from '@prisma/client';

import { db } from '~/lib/db';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

type SupplierLogoRow = {
  supplierName: string;
  logoUrl: string | null;
  filename: string | null;
};

type SupplierNameRow = { supplier_name: string };

type CategoryRow = {
  level1_id: string;
  level1_label: string | null;
  level1_label_fr: string | null;
  level2_id: string;
  level2_label: string | null;
  level2_label_fr: string | null;
  level3_id: string;
  level3_label: string | null;
  level3_label_fr: string | null;
  level3_url: string | null;
  product_count: bigint;
};

type Level2ImageRow = { level2_id: string; image_url: string | null };

type Level3 = {
  id: string;
  label: string;
  productCount: number;
  url: string | null;
};

type Level2 = {
  id: string;
  label: string;
  productCount: number;
  imageUrl: string | null;
  children: Level3[];
};

type Level1 = {
  id: string;
  label: string;
  productCount: number;
  children: Level2[];
};

const placeholderLogo =
  'data:image/svg+xml;utf8,' +
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100">' +
  '<rect width="160" height="100" fill="%23ededed"/>' +
  '<g stroke="%23666" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="45" y="35" width="70" height="40" rx="6" ry="6"/>' +
  '<circle cx="80" cy="55" r="12"/>' +
  '<path d="M60 35 l8 -10 h24 l8 10"/>' +
  '</g>' +
  '<line x1="40" y1="30" x2="120" y2="80" stroke="%23cc4b4b" stroke-width="6" stroke-linecap="round"/>' +
  '</svg>';

const placeholderCategory = 'https://placehold.co/135x90?text=Piece';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function resolveSupplierFromSlug(slug: string) {
  const logos = await db.supplierLogo.findMany({
    select: { supplierName: true, logoUrl: true, filename: true },
  });

  const fromLogo = logos.find((s) => slugify(s.supplierName) === slug);
  if (fromLogo) {
    return { name: fromLogo.supplierName, logoUrl: fromLogo.logoUrl, filename: fromLogo.filename };
  }

  const suppliersFromProducts = await db.$queryRaw<SupplierNameRow[]>`
    SELECT DISTINCT supplier_name
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
  `;

  const fromProducts = suppliersFromProducts.find((s) => slugify(s.supplier_name) === slug);
  if (fromProducts) {
    return { name: fromProducts.supplier_name, logoUrl: null, filename: null };
  }

  return null;
}

async function fetchHierarchyForSupplier(supplierName: string): Promise<{
  level1: Level1[];
  totalProducts: number;
}> {
  const categories = await db.$queryRaw<CategoryRow[]>`
    SELECT
      h.level1_id,
      h.level1_label,
      h.level1_label_fr,
      h.level2_id,
      h.level2_label,
      h.level2_label_fr,
      h.level3_id,
      h.level3_label,
      h.level3_label_fr,
      h.level3_url,
      COUNT(*) AS product_count
    FROM products p
    JOIN product_intercars_categories pic ON pic.product_id = p.id
    JOIN intercars_categories icc ON icc.id = pic.intercars_category_id
    JOIN intercars_hierarchy h ON h.id = icc.hierarchy_id
    WHERE LOWER(p.supplier_name) = LOWER(${supplierName})
      AND h.level1_id IS NOT NULL
      AND h.level2_id IS NOT NULL
      AND h.level3_id IS NOT NULL
    GROUP BY
      h.level1_id, h.level1_label, h.level1_label_fr,
      h.level2_id, h.level2_label, h.level2_label_fr,
      h.level3_id, h.level3_label, h.level3_label_fr
    ORDER BY product_count DESC
  `;

  if (categories.length === 0) {
    return { level1: [], totalProducts: 0 };
  }

  const level2Ids = Array.from(new Set(categories.map((c) => c.level2_id)));
  const level2Images = level2Ids.length
    ? await db.$queryRaw<Level2ImageRow[]>(
        Prisma.sql`
          SELECT level2_id, image_url
          FROM intercars_level2_images
          WHERE level2_id IN (${Prisma.join(level2Ids)})
        `,
      )
    : [];

  const imageMap = new Map(level2Images.map((img) => [img.level2_id, img.image_url]));

  const level1Map = new Map<string, Level1>();
  let totalProducts = 0;

  for (const row of categories) {
    const l1Label = row.level1_label_fr || row.level1_label || row.level1_id;
    const l2Label = row.level2_label_fr || row.level2_label || row.level2_id;
    const l3Label = row.level3_label_fr || row.level3_label || row.level3_id;
    const count = Number(row.product_count);
    totalProducts += count;

    let l1 = level1Map.get(row.level1_id);
    if (!l1) {
      l1 = { id: row.level1_id, label: l1Label, productCount: 0, children: [] };
      level1Map.set(row.level1_id, l1);
    }
    l1.productCount += count;

    let l2 = l1.children.find((c) => c.id === row.level2_id);
    if (!l2) {
      l2 = {
        id: row.level2_id,
        label: l2Label,
        productCount: 0,
        imageUrl: imageMap.get(row.level2_id) || null,
        children: [],
      };
      l1.children.push(l2);
    }
    l2.productCount += count;

    let l3 = l2.children.find((c) => c.id === row.level3_id);
    if (!l3) {
      l3 = { id: row.level3_id, label: l3Label, productCount: 0, url: row.level3_url };
      l2.children.push(l3);
    }
    l3.productCount += count;
  }

  const sortDesc = (a: { productCount: number }, b: { productCount: number }) =>
    b.productCount - a.productCount;

  const level1 = Array.from(level1Map.values())
    .map((l1) => ({
      ...l1,
      children: l1.children
        .map((l2) => ({
          ...l2,
          children: l2.children.sort(sortDesc),
        }))
        .sort(sortDesc),
    }))
    .sort(sortDesc);

  return { level1, totalProducts };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await resolveSupplierFromSlug(slug);

  if (!supplier) {
    return notFound();
  }

  return {
    title: `Pièces détachées ${supplier.name} | BricoAuto`,
    description: `Catalogue des pièces ${supplier.name} : trouvez les catégories principales et les produits compatibles.`,
  };
}

export default async function SupplierPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supplier = await resolveSupplierFromSlug(slug);
  if (!supplier) {
    return notFound();
  }

  const { level1, totalProducts } = await fetchHierarchyForSupplier(supplier.name);

  const logoSrc = supplier.filename
    ? `/supplier-logos/${encodeURIComponent(supplier.filename)}`
    : supplier.logoUrl || placeholderLogo;

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-[#0f172a]">
            Pièces {supplier.name}
          </h1>
          <p className="text-gray-600 text-lg">
            Retrouvez les catégories principales pour les produits {supplier.name}. Total
            de produits référencés : {totalProducts.toLocaleString()}.
          </p>
        </div>
        <div className="flex h-20 items-center justify-center rounded-md border border-[#dfe3e8] bg-white px-4 py-2 shadow-sm">
          <img
            src={logoSrc}
            alt={supplier.name}
            className="max-h-16 max-w-[200px] object-contain"
            loading="lazy"
          />
        </div>
      </div>

      {level1.length === 0 ? (
        <div className="rounded-lg border border-[#dfe3e8] bg-white p-6 text-[#0f172a]">
          Aucune catégorie trouvée pour cette marque.
        </div>
      ) : (
        <div className="space-y-8">
          {level1.map((l1) => (
            <div key={l1.id} className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3">
                <div className="text-2xl font-semibold text-[#0f172a]">{l1.label}</div>
                <div className="text-sm text-[#637381]">
                  {l1.productCount.toLocaleString()} produit{l1.productCount > 1 ? 's' : ''}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {l1.children.map((l2) => (
                  <div
                    key={l2.id}
                    className="rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-md border border-[#e5e7eb] bg-[#f8fafc]">
                        <img
                          src={l2.imageUrl || placeholderCategory}
                          alt={l2.label}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-[#0f172a]">{l2.label}</div>
                        <div className="text-xs text-[#637381]">
                          {l2.productCount.toLocaleString()} produit
                          {l2.productCount > 1 ? 's' : ''}
                        </div>
                        {l2.children.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                        {l2.children.map((l3) => {
                          let url: string | null = l3.url;
                          if (l3.url && slug) {
                            // Normaliser l'URL stockée (enlever locale/fr et slash en trop)
                            const cleaned = l3.url
                              .replace(/^\/?fr\//i, '') // retirer un éventuel préfixe /fr/
                              .replace(/^\/+/, ''); // retirer les slashs initiaux restants
                            url = `/${locale}/${cleaned}/marque/${slug}`;
                          }
                          return (
                              <span
                                key={l3.id}
                                className="rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-2 py-1 text-[12px] text-[#0f172a] hover:border-[#0077c7] hover:text-[#0077c7] transition"
                              >
                                {url ? (
                                  <a href={url}>
                                    {l3.label} ({l3.productCount})
                                  </a>
                                ) : (
                                  `${l3.label} (${l3.productCount})`
                                )}
                              </span>
                          );
                        })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

