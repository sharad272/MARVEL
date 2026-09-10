/**
 * Catalog read layer.
 *
 * Every UI read goes through here and hits SQLite only — never TMDB. The
 * sync worker owns all outbound network calls, which keeps page renders
 * fast and keeps the app working when TMDB is down or unkeyed.
 */

import { cache } from "react";
import { db } from "@/lib/db";
import {
  AVAILABILITY_KIND,
  COMPLETION_THRESHOLD,
  FRANCHISE,
  MIN_RESUME_SECONDS,
  VIDEO_KIND_PRIORITY,
  type Franchise,
} from "@/lib/constants";
import { RECOMMENDED_ORDER } from "@/data/catalog";
import { endOfTodayUtc, monthsAgoUtc } from "@/lib/clock";
import { pickCharacterWallpaper, type CharacterWallpaper } from "@/lib/character-art";
import {
  AVAILABILITY_REVALIDATE_SEC,
  SEARCH_REVALIDATE_SEC,
  catalogQuery,
} from "@/lib/catalog-cache";

/** Card-sized projection. Keep this narrow — rails render 100+ of these. */
export const titleCardSelect = {
  id: true,
  slug: true,
  name: true,
  mediaType: true,
  franchise: true,
  phase: true,
  themeSlug: true,
  releaseDate: true,
  runtime: true,
  posterPath: true,
  backdropPath: true,
  voteAverage: true,
  chronoOrder: true,
  chronoNote: true,
  tagline: true,
} as const;

export type TitleCard = {
  id: string;
  slug: string;
  name: string;
  mediaType: string;
  franchise: string;
  phase: number | null;
  themeSlug: string | null;
  releaseDate: Date | null;
  runtime: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  chronoOrder: number | null;
  chronoNote: string | null;
  tagline: string | null;
};

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

const loadTitlesByRelease = catalogQuery(
  "titles-by-release",
  async (franchise: string, take: number) =>
    db.title.findMany({
      where: franchise === "*" ? undefined : { franchise },
      orderBy: [{ releaseDate: "asc" }, { sortName: "asc" }],
      take: take < 0 ? undefined : take,
      select: titleCardSelect,
    })
);

export async function getTitlesByRelease(franchise?: Franchise, take?: number): Promise<TitleCard[]> {
  return loadTitlesByRelease(franchise ?? "*", take ?? -1);
}

/**
 * In-universe order. Titles without a chrono position (standalone
 * continuities like the Fox X-Men films) are appended by release date
 * rather than dropped, so the view is never lossy.
 */
const loadTitlesByChrono = catalogQuery(
  "titles-by-chrono",
  async (franchise: string, take: number) => {
    const where = franchise === "*" ? {} : { franchise };
    const [placed, unplaced] = await Promise.all([
      db.title.findMany({
        where: { chronoOrder: { not: null }, ...where },
        orderBy: { chronoOrder: "asc" },
        select: titleCardSelect,
      }),
      db.title.findMany({
        where: { chronoOrder: null, ...where },
        orderBy: { releaseDate: "asc" },
        select: titleCardSelect,
      }),
    ]);
    const all = [...placed, ...unplaced];
    return take < 0 ? all : all.slice(0, take);
  }
);

export async function getTitlesByChrono(franchise?: Franchise, take?: number): Promise<TitleCard[]> {
  return loadTitlesByChrono(franchise ?? "*", take ?? -1);
}

export type PhaseGroup = {
  phase: number | null;
  saga: string | null;
  titles: TitleCard[];
};

const loadTitlesByPhase = catalogQuery("titles-by-phase", async () => {
  const titles = await db.title.findMany({
    where: { phase: { not: null } },
    orderBy: [{ phase: "asc" }, { releaseDate: "asc" }],
    select: titleCardSelect,
  });

  const groups = new Map<number, TitleCard[]>();
  for (const t of titles) {
    if (t.phase == null) continue;
    const bucket = groups.get(t.phase) ?? [];
    bucket.push(t);
    groups.set(t.phase, bucket);
  }

  const { PHASE_SAGA } = await import("@/lib/constants");
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([phase, ts]) => ({ phase, saga: PHASE_SAGA[phase] ?? null, titles: ts }));
});

export async function getTitlesByPhase(): Promise<PhaseGroup[]> {
  return loadTitlesByPhase();
}

/** The curated newcomer path, in the hand-authored order. */
const loadRecommendedOrder = catalogQuery("recommended-order", async () => {
  const titles = await db.title.findMany({
    where: { slug: { in: [...RECOMMENDED_ORDER] } },
    select: titleCardSelect,
  });
  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  return RECOMMENDED_ORDER.map((s) => bySlug.get(s)).filter((t): t is TitleCard => Boolean(t));
});

export async function getRecommendedOrder(): Promise<TitleCard[]> {
  return loadRecommendedOrder();
}

// ---------------------------------------------------------------------------
// Title detail
// ---------------------------------------------------------------------------

const loadTitleMeta = catalogQuery("title-meta", async (slug: string) =>
  db.title.findUnique({
    where: { slug },
    select: { name: true, overview: true, tagline: true },
  })
);

/** Lightweight row for `generateMetadata` — skips episodes/videos. */
export const getTitleMeta = cache(async (slug: string) => loadTitleMeta(slug));

const loadTitleCatalog = catalogQuery("title-catalog", async (slug: string) =>
  db.title.findUnique({
    where: { slug },
    include: {
      videos: { orderBy: { publishedAt: "desc" } },
      episodes: { orderBy: [{ season: "asc" }, { episode: "asc" }] },
      availability: { orderBy: { providerName: "asc" } },
      appearances: {
        include: { character: { select: { slug: true, name: true, realName: true } } },
      },
    },
  })
);

export const getTitleBySlug = cache(async (slug: string) => {
  const catalog = await loadTitleCatalog(slug);
  if (!catalog) return null;
  // Library, progress and local files are per-viewer and must not share
  // the catalog cache. This is the only SQLite hit on a warm title page.
  const user = await db.title.findUnique({
    where: { slug },
    select: { localMedia: true, progress: true, library: true },
  });
  return {
    ...catalog,
    localMedia: user?.localMedia ?? [],
    progress: user?.progress ?? [],
    library: user?.library ?? [],
  };
});

export type TitleDetail = NonNullable<Awaited<ReturnType<typeof getTitleBySlug>>>;

/** Best single video to feature, by kind priority then recency. */
export function pickFeaturedVideo<
  T extends {
    kind: string;
    publishedAt?: Date | null;
    size?: number | null;
    official?: boolean;
  },
>(videos: T[]): T | null {
  if (videos.length === 0) return null;

  const rank = (kind: string) => {
    const i = VIDEO_KIND_PRIORITY.indexOf(kind as never);
    return i === -1 ? VIDEO_KIND_PRIORITY.length : i;
  };

  return [...videos].sort((a, b) => {
    const byKind = rank(a.kind) - rank(b.kind);
    if (byKind !== 0) return byKind;
    const byOfficial = Number(Boolean(b.official)) - Number(Boolean(a.official));
    if (byOfficial !== 0) return byOfficial;
    const bySize = (b.size ?? 0) - (a.size ?? 0);
    if (bySize !== 0) return bySize;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  })[0];
}

// ---------------------------------------------------------------------------
// Home page rails
// ---------------------------------------------------------------------------

/**
 * Hero candidates: titles with a backdrop, biased toward well-rated recent
 * work so the front door looks like a Marvel billboard rather than a
 * random draw from 1998.
 */
const loadHeroTitles = catalogQuery(
  "hero-titles",
  async (count: number, day: string) => {
    const select = { ...titleCardSelect, logoPath: true, overview: true };
    const today = new Date(`${day}T23:59:59.999Z`);
    const where = {
      franchise: { in: [FRANCHISE.MCU, FRANCHISE.ANIMATED] },
      releaseDate: { lte: today },
    };

    let pool = await db.title.findMany({
      where,
      orderBy: [{ releaseDate: "desc" }, { voteAverage: "desc" }],
      take: 40,
      select,
    });

    const withArt = pool.filter((t) => t.backdropPath);
    if (withArt.length >= count) pool = withArt;

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
);

export async function getHeroTitles(count = 6) {
  return loadHeroTitles(count, endOfTodayUtc().toISOString().slice(0, 10));
}

const loadRecentTitles = catalogQuery(
  "recent-titles",
  async (take: number, day: string) => {
    const today = new Date(`${day}T23:59:59.999Z`);
    return db.title.findMany({
      where: {
        releaseDate: {
          gte: monthsAgoUtc(30),
          lte: today,
        },
      },
      orderBy: { releaseDate: "desc" },
      take,
      select: titleCardSelect,
    });
  }
);

export async function getRecentTitles(take = 18): Promise<TitleCard[]> {
  return loadRecentTitles(take, endOfTodayUtc().toISOString().slice(0, 10));
}

const loadUpcomingTitles = catalogQuery(
  "upcoming-titles",
  async (take: number, day: string) =>
    db.title.findMany({
      where: { releaseDate: { gt: new Date(`${day}T23:59:59.999Z`) } },
      orderBy: { releaseDate: "asc" },
      take,
      select: titleCardSelect,
    })
);

export async function getUpcomingTitles(take = 12): Promise<TitleCard[]> {
  return loadUpcomingTitles(take, endOfTodayUtc().toISOString().slice(0, 10));
}

export type ContinueWatchingRow = {
  positionSec: number;
  durationSec: number | null;
  updatedAt: Date;
  title: TitleCard;
  episode: { id: string; season: number; episode: number; name: string } | null;
};

export async function continueWatching(limit = 12): Promise<ContinueWatchingRow[]> {
  const rows = await db.watchProgress.findMany({
    where: {
      completed: false,
      positionSec: { gt: MIN_RESUME_SECONDS },
      // Trailers resume separately and shouldn't clutter the main rail.
      videoKey: null,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      positionSec: true,
      durationSec: true,
      updatedAt: true,
      title: { select: titleCardSelect },
      episode: { select: { id: true, season: true, episode: true, name: true } },
    },
  });

  // Drop anything effectively finished but never flagged complete (e.g.
  // the tab closed before the final progress write landed).
  return rows.filter(
    (r) =>
      !r.durationSec ||
      r.positionSec / r.durationSec < COMPLETION_THRESHOLD
  );
}

/**
 * Newly streamable titles, driven by Availability.firstSeenAt. This is the
 * "it shows up here the moment it lands" rail.
 */
const loadNewlyAvailable = catalogQuery(
  "newly-available",
  async (region: string, days: number, limit: number) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await db.availability.findMany({
      where: {
        region,
        firstSeenAt: { gte: since },
        kind: { in: [AVAILABILITY_KIND.FLATRATE, AVAILABILITY_KIND.FREE, AVAILABILITY_KIND.ADS] },
      },
      orderBy: { firstSeenAt: "desc" },
      select: {
        firstSeenAt: true,
        providerName: true,
        logoPath: true,
        link: true,
        title: { select: titleCardSelect },
      },
    });

    const seen = new Set<string>();
    const unique = [];
    for (const r of rows) {
      if (seen.has(r.title.id)) continue;
      seen.add(r.title.id);
      unique.push(r);
      if (unique.length >= limit) break;
    }
    return unique;
  },
  AVAILABILITY_REVALIDATE_SEC
);

export async function getNewlyAvailable(region: string, days = 60, limit = 14) {
  return loadNewlyAvailable(region, days, limit);
}

export async function getWatchlist(limit = 20) {
  return db.libraryEntry.findMany({
    where: { status: "WATCHLIST" },
    orderBy: { addedAt: "desc" },
    take: limit,
    select: { addedAt: true, title: { select: titleCardSelect } },
  });
}

const loadFranchiseCounts = catalogQuery("franchise-counts", async () => {
  const grouped = await db.title.groupBy({
    by: ["franchise"],
    _count: { _all: true },
  });
  return grouped.map((g) => ({ franchise: g.franchise, count: g._count._all }));
});

export async function getFranchiseCounts() {
  return loadFranchiseCounts();
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

const loadCharacterWithAppearances = catalogQuery("character-appearances", async (slug: string) => {
  const character = await db.character.findUnique({
    where: { slug },
    include: {
      appearances: {
        include: { title: { select: titleCardSelect } },
      },
    },
  });
  if (!character) return null;
  return {
    ...character,
    wallpaper: pickCharacterWallpaper(character.appearances),
  };
});

export const getCharacterWithAppearances = cache(async (slug: string) =>
  loadCharacterWithAppearances(slug)
);

export type CharacterSummary = {
  slug: string;
  name: string;
  realName: string | null;
  bio: string | null;
  appearanceCount: number;
  art: CharacterWallpaper;
};

/** Characters ordered by how much of the catalog they actually carry. */
const loadCharactersByPresence = catalogQuery("characters-by-presence", async () => {
  const characters = await db.character.findMany({
    include: {
      _count: { select: { appearances: true } },
      appearances: {
        select: {
          role: true,
          title: { select: { slug: true, posterPath: true, backdropPath: true } },
        },
      },
    },
  });

  return characters
    .filter((c) => c._count.appearances > 0)
    .sort((a, b) => b._count.appearances - a._count.appearances)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      realName: c.realName,
      bio: c.bio,
      appearanceCount: c._count.appearances,
      art: pickCharacterWallpaper(c.appearances),
    }));
});

export async function getCharactersByPresence(): Promise<CharacterSummary[]> {
  return loadCharactersByPresence();
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const loadSearchTitles = catalogQuery(
  "search-titles",
  async (q: string, limit: number, deep: boolean) =>
    db.title.findMany({
      where: {
        OR: deep
          ? [{ name: { contains: q } }, { sortName: { contains: q } }, { overview: { contains: q } }, { tagline: { contains: q } }]
          : [{ name: { contains: q } }, { sortName: { contains: q } }, { tagline: { contains: q } }],
      },
      orderBy: [{ voteAverage: "desc" }, { releaseDate: "desc" }],
      take: limit,
      select: titleCardSelect,
    }),
  SEARCH_REVALIDATE_SEC
);

/** Plain substring search — the instant path, no LLM round-trip. */
export async function searchTitles(
  query: string,
  limit = 20,
  opts?: { deep?: boolean }
): Promise<TitleCard[]> {
  const q = query.trim();
  if (!q) return [];
  return loadSearchTitles(q, limit, Boolean(opts?.deep));
}

const loadTitlesBySlugs = catalogQuery("titles-by-slugs", async (joined: string) => {
  const slugs = joined.split("\n").filter(Boolean);
  if (slugs.length === 0) return [] as TitleCard[];
  const titles = await db.title.findMany({
    where: { slug: { in: slugs } },
    select: titleCardSelect,
  });
  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  return slugs.map((s) => bySlug.get(s)).filter((t): t is TitleCard => Boolean(t));
});

export async function getTitlesBySlugs(slugs: string[]): Promise<TitleCard[]> {
  if (slugs.length === 0) return [];
  return loadTitlesBySlugs(slugs.join("\n"));
}

const loadCatalogStats = catalogQuery("catalog-stats", async () => {
  const [titles, films, series, episodes, videos, withArt, refreshed] = await Promise.all([
    db.title.count(),
    db.title.count({ where: { mediaType: "FILM" } }),
    db.title.count({ where: { mediaType: "SERIES" } }),
    db.episode.count(),
    db.video.count(),
    db.title.count({ where: { posterPath: { not: null } } }),
    db.appSetting.findUnique({ where: { key: "catalog.refreshedAt" } }),
  ]);
  return {
    titles,
    films,
    series,
    episodes,
    videos,
    withArt,
    synced: withArt > 0,
    refreshedAt: refreshed?.value ? new Date(refreshed.value) : null,
  };
});

export async function getCatalogStats() {
  return loadCatalogStats();
}
