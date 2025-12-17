// In dev mode, cache for 24 hours to avoid slow BigCommerce queries
// In production, use env var or default to 1 hour
export const revalidate = process.env.NODE_ENV === 'development' 
  ? 86400 // 24 hours in dev
  : (process.env.DEFAULT_REVALIDATE_TARGET
      ? Number(process.env.DEFAULT_REVALIDATE_TARGET)
      : 3600); // 1 hour in prod
