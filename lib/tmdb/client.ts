/**
 * TMDB client.
 *
 * Only ever called from server code (route handlers and the sync scripts)
 * so the key never reaches the browser. Every method degrades to null or
 * an empty array rather than throwing, because a missing key or a rate
 * limit should leave the app running on its seeded catalog.
 */

import { titleSimilarity } from "@/lib/utils";

const BASE = "https://api.themoviedb.org/3";

export type TmdbMediaType = "movie" | "tv";

export type TmdbVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
  size?: number;
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  overview: string | null;
  tagline?: string | null;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  homepage: string | null;
  number_of_seasons?: number;
  videos?: { results: TmdbVideo[] };
  images?: { logos?: { file_path: string; iso_639_1: string | null }[] };
  "watch/providers"?: {
    results: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        free?: TmdbProvider[];
        ads?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
      }
    >;
  };
  seasons?: { season_number: number; episode_count: number }[];
};

export type TmdbEpisode = {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
};

export function hasTmdbKey(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) return null;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Server-side sync manages its own cadence; don't let Next cache it.
      cache: "no-store",
    });

    if (res.status === 429) {
      // TMDB's limiter is short-fused; one backoff is usually enough.
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
      return retry.ok ? ((await retry.json()) as T) : null;
    }

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Full details plus videos, logos and watch providers in one call. */
export function getDetails(type: TmdbMediaType, id: number) {
  return request<TmdbDetails>(`/${type}/${id}`, {
    append_to_response: "videos,images,watch/providers",
    include_image_language: "en,null",
  });
}

export async function searchTitle(
  type: TmdbMediaType,
  name: string,
  year?: number
): Promise<number | null> {
  const params: Record<string, string> = { query: name };
  if (year) params[type === "movie" ? "primary_release_year" : "first_air_date_year"] = String(year);

  const data = await request<{ results: { id: number; title?: string; name?: string }[] }>(
    `/search/${type}`,
    params
  );
  const results = data?.results ?? [];
  if (results.length === 0) return null;

  // Prefer the closest name match over TMDB's popularity ranking, which
  // likes to surface remakes and documentaries ahead of the real thing.
  let best = results[0];
  let bestScore = 0;
  for (const r of results.slice(0, 8)) {
    const score = titleSimilarity(name, r.title ?? r.name ?? "");
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best.id;
}

/**
 * Resolve a catalog entry to a TMDB id, treating the seeded id as a hint.
 *
 * A hardcoded id that has drifted (or was simply wrong) would otherwise
 * attach the wrong artwork and runtime to a title forever, so the fetched
 * name is checked against the expected one before the id is trusted.
 */
export async function resolveId(
  type: TmdbMediaType,
  name: string,
  year: number | undefined,
  hint: number | undefined
): Promise<{ id: number; details: TmdbDetails } | null> {
  if (hint) {
    const details = await getDetails(type, hint);
    const fetched = details?.title ?? details?.name ?? "";
    if (details && titleSimilarity(name, fetched) >= 0.55) {
      return { id: hint, details };
    }
  }

  const searched = await searchTitle(type, name, year);
  if (!searched) return null;
  const details = await getDetails(type, searched);
  return details ? { id: searched, details } : null;
}

export function getSeason(tvId: number, season: number) {
  return request<{ episodes: TmdbEpisode[] }>(`/tv/${tvId}/season/${season}`);
}

/** Region-scoped watch providers, refetched by the availability poller. */
export function getWatchProviders(type: TmdbMediaType, id: number) {
  return request<{
    results: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        free?: TmdbProvider[];
        ads?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
      }
    >;
  }>(`/${type}/${id}/watch/providers`);
}

export type TmdbDiscoverHit = {
  id: number;
  title?: string;
  name?: string;
  overview?: string | null;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  genre_ids?: number[];
};

const SKIP_NAME =
  /\b(assembled|legacy documentary|behind the scenes|official podcast|disney\+ day|marvel studios:)\b/i;

function keepHit(hit: TmdbDiscoverHit): boolean {
  const name = hit.title ?? hit.name ?? "";
  if (!name || SKIP_NAME.test(name)) return false;
  if (hit.genre_ids?.includes(99)) return false;
  return Boolean(hit.release_date || hit.first_air_date);
}

async function discoverPages(
  path: "/discover/movie" | "/discover/tv",
  params: Record<string, string>,
  pages = 4
): Promise<TmdbDiscoverHit[]> {
  const hits: TmdbDiscoverHit[] = [];
  for (let page = 1; page <= pages; page++) {
    const data = await request<{ results?: TmdbDiscoverHit[]; total_pages?: number }>(path, {
      ...params,
      page: String(page),
    });
    const rows = (data?.results ?? []).filter(keepHit);
    hits.push(...rows);
    if (!data?.results?.length || page >= (data.total_pages ?? 1)) break;
  }
  return hits;
}

/**
 * Live Marvel slate from TMDB: Marvel Studios productions plus the MCU
 * keyword, from two years back through the next 18 months.
 */
export async function discoverMarvelSlate(now = new Date()): Promise<
  {
    tmdbId: number;
    tmdbType: TmdbMediaType;
    name: string;
    released: string;
    posterPath: string | null;
    backdropPath: string | null;
    overview: string | null;
    voteAverage: number | null;
  }[]
> {
  const from = new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 18, 1))
    .toISOString()
    .slice(0, 10);

  const [studioMovies, keywordMovies, studioTv, keywordTv] = await Promise.all([
    discoverPages("/discover/movie", {
      with_companies: "420",
      "primary_release_date.gte": from,
      "primary_release_date.lte": to,
      sort_by: "primary_release_date.desc",
    }),
    discoverPages("/discover/movie", {
      with_keywords: "180547",
      "primary_release_date.gte": from,
      "primary_release_date.lte": to,
      sort_by: "primary_release_date.desc",
    }),
    discoverPages("/discover/tv", {
      with_companies: "420",
      "first_air_date.gte": from,
      "first_air_date.lte": to,
      sort_by: "first_air_date.desc",
    }),
    discoverPages("/discover/tv", {
      with_keywords: "180547",
      "first_air_date.gte": from,
      "first_air_date.lte": to,
      sort_by: "first_air_date.desc",
    }),
  ]);

  const seen = new Set<string>();
  const out: {
    tmdbId: number;
    tmdbType: TmdbMediaType;
    name: string;
    released: string;
    posterPath: string | null;
    backdropPath: string | null;
    overview: string | null;
    voteAverage: number | null;
  }[] = [];

  for (const [type, list] of [
    ["movie", [...studioMovies, ...keywordMovies]],
    ["tv", [...studioTv, ...keywordTv]],
  ] as const) {
    for (const hit of list) {
      const key = `${type}:${hit.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const released = (type === "movie" ? hit.release_date : hit.first_air_date) ?? "";
      if (!released) continue;
      out.push({
        tmdbId: hit.id,
        tmdbType: type,
        name: (hit.title ?? hit.name ?? "").trim(),
        released,
        posterPath: hit.poster_path ?? null,
        backdropPath: hit.backdrop_path ?? null,
        overview: hit.overview ?? null,
        voteAverage: hit.vote_average ?? null,
      });
    }
  }

  return out.sort((a, b) => b.released.localeCompare(a.released));
}
