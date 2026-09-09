/**
 * Enriches the seeded catalog from TMDB: artwork, runtimes, overviews,
 * official trailers, episode lists and regional streaming availability.
 *
 * Idempotent and resumable. Run it as often as you like — by default it
 * skips titles synced in the last 24h so a re-run after an interruption
 * picks up where it stopped.
 *
 *   npm run sync              # everything stale
 *   npm run sync -- --force   # re-sync all
 *   npm run sync -- --slug=loki
 */

import "./env";
import { PrismaClient } from "@prisma/client";
import { getDetails, getSeason, resolveId, type TmdbDetails } from "../lib/tmdb/client";
import { AVAILABILITY_KIND } from "../lib/constants";
import { env } from "./env";

const db = new PrismaClient();

const FORCE = process.argv.includes("--force");
const SLUG = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** TMDB rate limit is generous but not infinite; stay well under it. */
const DELAY_MS = 120;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PROVIDER_BUCKETS = [
  ["flatrate", AVAILABILITY_KIND.FLATRATE],
  ["free", AVAILABILITY_KIND.FREE],
  ["ads", AVAILABILITY_KIND.ADS],
  ["rent", AVAILABILITY_KIND.RENT],
  ["buy", AVAILABILITY_KIND.BUY],
] as const;

async function syncTitle(title: {
  id: string;
  slug: string;
  name: string;
  tmdbId: number | null;
  tmdbType: string | null;
  mediaType: string;
  releaseDate: Date | null;
}) {
  const type = (title.tmdbType ?? "movie") as "movie" | "tv";
  const year = title.releaseDate?.getUTCFullYear();

  const resolved = await resolveId(type, title.name, year, title.tmdbId ?? undefined);
  if (!resolved) {
    console.log(`  ✗ ${title.slug} — not found on TMDB`);
    return false;
  }

  const { id: tmdbId, details } = resolved;

  // --- Core metadata ---------------------------------------------------
  const runtime =
    details.runtime ??
    (details.episode_run_time?.length ? details.episode_run_time[0] : null);

  const englishLogo =
    details.images?.logos?.find((l) => l.iso_639_1 === "en")?.file_path ??
    details.images?.logos?.[0]?.file_path ??
    null;

  const endDate = details.last_air_date ? new Date(`${details.last_air_date}T00:00:00Z`) : null;

  await db.title.update({
    where: { id: title.id },
    data: {
      tmdbId,
      overview: details.overview ?? null,
      tagline: details.tagline ?? null,
      runtime,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      logoPath: englishLogo,
      voteAverage: details.vote_average,
      homepage: details.homepage,
      endDate,
      syncedAt: new Date(),
    },
  });

  // --- Official videos -------------------------------------------------
  const videos = (details.videos?.results ?? []).filter(
    (v) => v.site === "YouTube" && v.key
  );
  let videoCount = 0;
  for (const v of videos) {
    await db.video.upsert({
      where: { titleId_youtubeKey: { titleId: title.id, youtubeKey: v.key } },
      update: {
        name: v.name,
        kind: v.type,
        official: v.official ?? true,
        size: v.size ?? null,
      },
      create: {
        titleId: title.id,
        youtubeKey: v.key,
        name: v.name,
        kind: v.type,
        official: v.official ?? true,
        size: v.size ?? null,
        publishedAt: v.published_at ? new Date(v.published_at) : null,
      },
    });
    videoCount++;
  }

  // --- Availability ----------------------------------------------------
  const availCount = await syncAvailability(title.id, details);

  // --- Episodes --------------------------------------------------------
  let epCount = 0;
  if (type === "tv") epCount = await syncEpisodes(title.id, tmdbId, details);

  const bits = [`${videoCount} videos`, `${availCount} providers`];
  if (type === "tv") bits.push(`${epCount} episodes`);
  console.log(`  ✓ ${title.slug} — ${bits.join(", ")}`);
  return true;
}

async function syncAvailability(titleId: string, details: TmdbDetails): Promise<number> {
  const regional = details["watch/providers"]?.results?.[env.region];
  if (!regional) return 0;

  const now = new Date();
  let count = 0;

  for (const [bucket, kind] of PROVIDER_BUCKETS) {
    for (const p of regional[bucket] ?? []) {
      await db.availability.upsert({
        where: {
          titleId_region_providerId_kind: {
            titleId,
            region: env.region,
            providerId: p.provider_id,
            kind,
          },
        },
        // firstSeenAt is deliberately untouched — it drives the
        // "newly available" rail and must survive re-syncs.
        update: {
          providerName: p.provider_name,
          logoPath: p.logo_path,
          link: regional.link ?? null,
          lastSeenAt: now,
        },
        create: {
          titleId,
          region: env.region,
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: p.logo_path,
          kind,
          link: regional.link ?? null,
        },
      });
      count++;
    }
  }
  return count;
}

async function syncEpisodes(
  titleId: string,
  tmdbId: number,
  details: TmdbDetails
): Promise<number> {
  // Season 0 is TMDB's "Specials" bucket; skip it.
  const seasons = (details.seasons ?? []).filter((s) => s.season_number > 0);
  let count = 0;

  for (const season of seasons) {
    const data = await getSeason(tmdbId, season.season_number);
    await sleep(DELAY_MS);
    if (!data?.episodes) continue;

    for (const ep of data.episodes) {
      await db.episode.upsert({
        where: {
          titleId_season_episode: {
            titleId,
            season: ep.season_number,
            episode: ep.episode_number,
          },
        },
        update: {
          tmdbId: ep.id,
          name: ep.name,
          overview: ep.overview,
          runtime: ep.runtime,
          stillPath: ep.still_path,
          airDate: ep.air_date ? new Date(`${ep.air_date}T00:00:00Z`) : null,
        },
        create: {
          titleId,
          tmdbId: ep.id,
          season: ep.season_number,
          episode: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          runtime: ep.runtime,
          stillPath: ep.still_path,
          airDate: ep.air_date ? new Date(`${ep.air_date}T00:00:00Z`) : null,
        },
      });
      count++;
    }
  }
  return count;
}

async function main() {
  if (!env.tmdbKey) {
    console.error(
      "No TMDB_API_KEY in .env.local.\n\n" +
        "Grab a free one at https://www.themoviedb.org/settings/api\n" +
        "(sign up, then 'Request an API key' -> Developer). The app runs\n" +
        "without it, but you'll have no artwork, trailers or availability."
    );
    process.exit(1);
  }

  const log = await db.syncLog.create({ data: { job: "catalog", status: "OK" } });

  const where = SLUG
    ? { slug: SLUG }
    : FORCE
      ? {}
      : {
          OR: [
            { syncedAt: null },
            { syncedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
          ],
        };

  const titles = await db.title.findMany({
    where,
    orderBy: { releaseDate: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tmdbId: true,
      tmdbType: true,
      mediaType: true,
      releaseDate: true,
    },
  });

  if (titles.length === 0) {
    console.log("Everything is already up to date. Use --force to re-sync.");
    await db.syncLog.update({
      where: { id: log.id },
      data: { finishedAt: new Date(), message: "nothing stale" },
    });
    return;
  }

  console.log(`Syncing ${titles.length} title(s) from TMDB (region ${env.region})…\n`);

  let ok = 0;
  let failed = 0;
  for (const title of titles) {
    try {
      (await syncTitle(title)) ? ok++ : failed++;
    } catch (e) {
      failed++;
      console.log(`  ✗ ${title.slug} — ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  await db.syncLog.update({
    where: { id: log.id },
    data: {
      status: failed === 0 ? "OK" : "PARTIAL",
      itemCount: ok,
      message: `${ok} synced, ${failed} failed`,
      finishedAt: new Date(),
    },
  });

  console.log(`\nDone. ${ok} synced, ${failed} failed.`);
}

main()
  .catch((e) => {
    console.error("\nSync failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
