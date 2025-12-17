import { BigCommerceAuthError, createClient } from '@bigcommerce/catalyst-client';
import { headers } from 'next/headers';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { redirect } from 'next/navigation';
import { getLocale as getServerLocale } from 'next-intl/server';

import { getChannelIdFromLocale } from '../channels.config';
import { backendUserAgent } from '../user-agent';

const getLocale = async () => {
  try {
    const locale = await getServerLocale();

    return locale;
  } catch {
    /**
     * Next-intl `getLocale` only works on the server, and when middleware has run.
     *
     * Instances when `getLocale` will not work:
     * - Requests in middlewares
     * - Requests in `generateStaticParams`
     * - Request in api routes
     * - Requests in static sites without `setRequestLocale`
     */
  }
};

const baseClient = createClient({
  storefrontToken: process.env.BIGCOMMERCE_STOREFRONT_TOKEN ?? '',
  storeHash: process.env.BIGCOMMERCE_STORE_HASH ?? '',
  channelId: process.env.BIGCOMMERCE_CHANNEL_ID,
  backendUserAgentExtensions: backendUserAgent,
  logger:
    (process.env.NODE_ENV !== 'production' && process.env.CLIENT_LOGGER !== 'false') ||
    process.env.CLIENT_LOGGER === 'true',
  getChannelId: async (defaultChannelId: string) => {
    const locale = await getLocale();

    // We use the default channelId as a fallback, but it is not ideal in some scenarios.
    return getChannelIdFromLocale(locale) ?? defaultChannelId;
  },
  beforeRequest: async (fetchOptions) => {
    // We can't serialize a `Headers` object within this method so we have to opt into using a plain object
    const requestHeaders: Record<string, string> = {};
    const locale = await getLocale();

    if (fetchOptions?.cache && ['no-store', 'no-cache'].includes(fetchOptions.cache)) {
      const ipAddress = (await headers()).get('X-Forwarded-For');

      if (ipAddress) {
        requestHeaders['X-Forwarded-For'] = ipAddress;
        requestHeaders['True-Client-IP'] = ipAddress;
      }
    }

    if (locale) {
      requestHeaders['Accept-Language'] = locale;
    }

    return {
      headers: requestHeaders,
    };
  },
  onError: (error, queryType) => {
    if (error instanceof BigCommerceAuthError && queryType === 'query') {
      redirect('/api/auth/signout');
    }
  },
});

// We need to assign the fetch method to the instance to preserve the prototype chain
// otherwise methods like fetchSitemapIndex are lost when using spread operator
const clientWithLogging = baseClient;

clientWithLogging.fetch = async <T>(args: any): Promise<any> => {
  const start = performance.now();
  try {
    // We need to call the method from the prototype to avoid recursion if we were to grab it from 'this' if mistakenly bound
    // But since we are assigning a property, we can just call the original method if we stored it, or rely on baseClient being the same object
    // However, since 'baseClient' is typed as Client, we can't easily call 'super'.
    // The easiest way is to bind the original fetch before overwriting, OR
    // since we can't easily access the prototype method once shadowed on the instance without walking up the chain.

    // Actually, let's capture the original fetch first.
    // access prototype method: Object.getPrototypeOf(baseClient).fetch.call(baseClient, args)

    // Simpler: Just rely on the fact that we are modifying the object.
    // Wait, if I do baseClient.fetch = ..., I lose access to the original baseClient.fetch unless I save it.

    // Let's use the explicit reference to the class prototype approach or save it.
    // But baseClient is an instance. 

    const response = await Object.getPrototypeOf(baseClient).fetch.call(baseClient, args);
    const duration = Math.round(performance.now() - start);

    // Try to extract query name if possible
    let queryName = 'GraphQL Query';
    try {
      if (args.document && typeof args.document === 'object' && 'definitions' in args.document) {
        const operation = args.document.definitions.find((def: any) => def.kind === 'OperationDefinition');
        if (operation && operation.name) {
          queryName = operation.name.value;
        }
      } else if (typeof args.document === 'string') {
        // Basic regex to find query name
        const match = args.document.match(/(query|mutation)\s+(\w+)/);
        if (match) queryName = match[2];
      }
    } catch (e) {
      // ignore parsing error
    }

    console.log(`[GRAPHQL] ${queryName} – ${duration}ms – vars: ${JSON.stringify(args.variables)}`);
    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error(`[GRAPHQL] FAILED – ${duration}ms`, error);
    throw error;
  }
};

export const client = clientWithLogging;
