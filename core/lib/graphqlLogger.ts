import { GraphQLClient } from '@bigcommerce/catalyst-client';
import { performance } from 'node:perf_hooks';

// Re-use the same config you already have for the client
export const loggerClient = new GraphQLClient({
    storeHash: process.env.BC_STORE_HASH!,
    accessToken: process.env.BC_ACCESS_TOKEN!,
});

/**
 * Run a GraphQL request and log its duration.
 *
 * @param query   GraphQL document (string)
 * @param vars    Variables object
 * @param label   Friendly name for the request (e.g. "ProductQuery")
 */
export async function gqlLogged<T = any>(
    query: string,
    vars: Record<string, unknown> = {},
    label = 'GraphQL'
): Promise<T> {
    const start = performance.now();
    try {
        const data = await loggerClient.request<T>(query, vars);
        const ms = Math.round(performance.now() - start);
        console.log(`[GRAPHQL] ${label} – ${ms}ms – vars: ${JSON.stringify(vars)}`);
        return data;
    } catch (e) {
        const ms = Math.round(performance.now() - start);
        console.error(`[GRAPHQL] ${label} – FAILED after ${ms}ms`, e);
        throw e;
    }
}
