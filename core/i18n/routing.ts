import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from './locales';

enum LocalePrefixes {
  ALWAYS = 'always',
  // Don't use NEVER as there is a issue that causes cache problems and returns the wrong messages.
  // More info: https://github.com/amannn/next-intl/issues/786
  // NEVER = 'never',
  ASNEEDED = 'as-needed', // removes prefix on default locale
}

// Pour éviter les boucles de redirection sur les routes custom (pieces-auto / pieces-detachees)
// on force le préfixe de locale sur toutes les routes.
// NOTE: si vous souhaitez revenir au comportement précédent, repassez à ASNEEDED
const localePrefix = LocalePrefixes.ALWAYS;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
// Redirect will append locale prefix even when in default locale
// More info: https://github.com/amannn/next-intl/issues/1335
export const { Link, redirect, usePathname, useRouter, permanentRedirect } =
  createNavigation(routing);
