/**
 * Cross-request cache for catalog reads.
 *
 * Home, browse, title and character pages all hit the same SQLite snapshot.
 * Without a cache, every visitor pays 10–15 queries on a serverless
 * instance. `unstable_cache` stores the JSON in Next's Data Cache so warm
 * invocations (and other instances in the same region) reuse it.
 *
 * Dates survive JSON serialization by being revived on the way out.
 * Do not put BigInt / user-specific rows (library, progress, local files)
 * through this helper.
 */

import { unstable_cache } from "next/cache";

export const CATALOG_TAG = "catalog";
/** Catalog rows change when a seed/sync/cron runs, not per request. */
export const CATALOG_REVALIDATE_SEC = 60 * 60;
/** Availability and "newly on Disney+" can move during the day. */
export const AVAILABILITY_REVALIDATE_SEC = 15 * 60;
/** Typeahead results are tiny and repeat the same few prefixes. */
export const SEARCH_REVALIDATE_SEC = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function reviveDates<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_key, v) => {
    if (typeof v === "string" && ISO_DATE.test(v)) return new Date(v);
    return v;
  }) as T;
}

export function catalogQuery<Args extends unknown[], R>(
  key: string,
  fn: (...args: Args) => Promise<R>,
  revalidate = CATALOG_REVALIDATE_SEC
): (...args: Args) => Promise<R> {
  const cached = unstable_cache(fn, ["catalog-v2", key], {
    revalidate,
    tags: [CATALOG_TAG],
  });
  return async (...args: Args) => reviveDates(await cached(...args));
}
