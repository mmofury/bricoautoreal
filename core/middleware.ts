import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

import { composeMiddlewares } from './middlewares/compose-middlewares';
import { withAnalyticsCookies } from './middlewares/with-analytics-cookies';
import { withAuth } from './middlewares/with-auth';
import { withChannelId } from './middlewares/with-channel-id';
import { withIntl } from './middlewares/with-intl';
import { withRoutes } from './middlewares/with-routes';
import { locales, defaultLocale } from './i18n/locales';

// Bypass BigCommerce route resolver for custom vehicle compatibility URLs,
// mais on garde intl/auth/analytics/channel.
const COMPAT_PREFIXES = ['/pieces-auto', '/pieces-detachees'];

const compatMiddleware = composeMiddlewares(
  withAuth,
  withIntl,
  withAnalyticsCookies,
  withChannelId,
);

const baseMiddleware = composeMiddlewares(
  withAuth,
  withIntl,
  withAnalyticsCookies,
  withChannelId,
  withRoutes,
);

export const middleware = (req: NextRequest, event: NextFetchEvent) => {
  const { pathname } = req.nextUrl;

  const isCompat = COMPAT_PREFIXES.some((prefix) => pathname.includes(prefix));

  if (isCompat) {
    // Si aucune locale en préfixe, réécrire vers la locale par défaut
    const segments = pathname.split('/').filter(Boolean);
    const first = segments[0];
    const hasLocale = first && locales.includes(first);
    if (!hasLocale) {
      const rewritten = `/${defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
      // On réécrit seulement pour éviter les boucles (next-intl en ASNEEDED retirait le préfixe)
      const res = NextResponse.rewrite(new URL(rewritten, req.url));
      res.headers.set('x-bc-locale', defaultLocale);
      return res;
    }

    // Forcer la locale depuis le header éventuellement ajouté par withIntl
    const locale = req.headers.get('x-bc-locale') || req.nextUrl.pathname.split('/')[1] || '';
    if (locale) {
      req.headers.set('x-bc-locale', locale);
    }
    return compatMiddleware(req, event);
  }

  return baseMiddleware(req, event);
};

export const config = {
  matcher: [
    /*
     * On ignore explicitement les assets statiques (images, polices, cartes, etc.)
     * pour éviter que le middleware withRoutes ne prenne la main et renvoie un 404.
     */
    '/((?!api|admin|_next/static|_next/image|_vercel|favicon.ico|xmlsitemap.php|sitemap.xml|robots.txt|.*\\.(?:png|jpe?g|svg|gif|webp|ico|avif|bmp|txt|xml|json|map|woff2?|ttf|otf|eot)).*)',
  ],
};
