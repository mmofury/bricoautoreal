import { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { db } from '~/lib/db';

interface Props {
  params: Promise<{ locale: string }>;
}

type SupplierRow = {
  supplier_name: string;
  logo_url: string | null;
  filename: string | null;
};

type SupplierNameRow = {
  supplier_name: string;
};

type ProductCountRow = {
  supplier_key: string;
  product_count: bigint;
};

// Placeholder avec icône appareil photo barré (SVG en data URI)
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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  return {
    title: 'Marques de pièces détachées | BricoAuto',
    description:
      'Parcourez toutes les marques de fournisseurs de pièces détachées disponibles sur BricoAuto.',
  };
}

export default async function MarquesPiecesDetacheesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Récupération des suppliers ayant un logo
  const suppliersWithLogos = await db.$queryRaw<SupplierRow[]>`
    SELECT 
      sl.supplier_name,
      sl.logo_url,
      sl.filename
    FROM supplier_logos sl
    ORDER BY sl.supplier_name ASC
  `;

  // Récupération des suppliers présents dans Product (même sans logo)
  const suppliersFromProducts = await db.$queryRaw<SupplierNameRow[]>`
    SELECT DISTINCT supplier_name
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
    ORDER BY supplier_name ASC
  `;

  // Comptage des produits par supplier (agrégé en amont)
  const productCounts = await db.$queryRaw<ProductCountRow[]>`
    SELECT 
      LOWER(supplier_name) AS supplier_key,
      COUNT(*) AS product_count
    FROM products
    WHERE supplier_name IS NOT NULL AND supplier_name != ''
    GROUP BY LOWER(supplier_name)
  `;

  const countsMap = new Map<string, number>(
    productCounts.map((c) => [c.supplier_key, Number(c.product_count)]),
  );

  // Index logos pour accès rapide
  const logosMap = new Map<string, { logoUrl: string | null; filename: string | null }>(
    suppliersWithLogos.map((s) => [
      s.supplier_name.toLowerCase(),
      { logoUrl: s.logo_url, filename: s.filename },
    ]),
  );

  // Union: suppliers avec logo + suppliers issus des produits (pour afficher placeholder)
  const mergedNames = new Set<string>();
  suppliersWithLogos.forEach((s) => mergedNames.add(s.supplier_name));
  suppliersFromProducts.forEach((s) => mergedNames.add(s.supplier_name));

  const mapped = Array.from(mergedNames)
    .map((name) => {
      const key = name.toLowerCase();
      const logoEntry = logosMap.get(key);
      return {
        name,
        slug: slugify(name),
        logoUrl: logoEntry?.logoUrl ?? null,
        filename: logoEntry?.filename ?? null,
        productCount: countsMap.get(key) ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const groupedByLetter = mapped.reduce((acc, supplier) => {
    const firstLetter = supplier.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(supplier);
    return acc;
  }, {} as Record<string, typeof mapped>);

  // Ne garder que les lettres A-Z pour éviter de commencer par des chiffres
  const letters = Object.keys(groupedByLetter)
    .filter((l) => /^[A-Z]$/.test(l))
    .sort();

  const totalProducts = mapped.reduce((sum, s) => sum + s.productCount, 0);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#0f172a]">
          Marques de pièces détachées
        </h1>
        <p className="text-gray-600 text-lg">
          Le catalogue de notre magasin propose 812 marques de pièces détachées pour auto
          et moto, ainsi que des fabricants de pneus, accessoires automobiles, outils,
          huiles et produits d&apos;entretien automobiles. Économisez de l&apos;argent lors de la
          réparation et de l&apos;entretien de votre automobile en achetant des produits
          automobiles de qualité similaire à ceux des FEO. Les logos manquants utilisent un
          visuel par défaut.
        </p>
      </div>

      {/* Navigation par lettre */}
      <div className="mb-6 flex flex-wrap gap-2">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="rounded-md border border-[#dfe3e8] bg-white px-3 py-1.5 text-sm font-medium text-[#0f172a] transition hover:border-[#0077c7] hover:text-[#0077c7]"
          >
            {letter}
          </a>
        ))}
      </div>

      {/* Grille par lettre */}
      <div className="space-y-8">
        {letters.map((letter) => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-8">
            <h2 className="mb-4 text-2xl font-bold text-[#0f172a] border-b border-[#dfe3e8] pb-2 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5f9] text-[#0f172a]">
                {letter}
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {groupedByLetter[letter].map((supplier) => (
                <Link
                  href={`/${locale}/marques-pieces-detachees/${supplier.slug}`}
                  key={supplier.name}
                  className="group rounded-lg border border-[#dfe3e8] bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-[#0077c7] hover:shadow-md"
                >
                  {(() => {
                    const logoSrc = supplier.filename
                      ? `/supplier-logos/${encodeURIComponent(supplier.filename)}`
                      : placeholderLogo;
                    return (
                      <div className="flex h-20 items-center justify-center">
                        <img
                          src={logoSrc}
                          alt={supplier.name}
                          className="max-h-16 max-w-[140px] object-contain mx-auto"
                          loading="lazy"
                        />
                      </div>
                    );
                  })()}
                  <div className="mt-3 font-semibold text-[#0f172a] group-hover:text-[#0077c7] transition">
                    {supplier.name}
                  </div>
                  {!supplier.logoUrl && (
                    <div className="mt-1 text-[11px] text-[#f97316]">Placeholder</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

