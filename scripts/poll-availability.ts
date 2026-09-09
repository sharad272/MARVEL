/**
 * Refreshes regional streaming availability for the whole catalog.
 *
 * Lighter than a full `sync`: one request per title, no episodes or
 * images. Cheap enough to run hourly, which is what makes a title show up
 * in the "Just landed" rail shortly after a service adds it.
 *
 *   npm run poll
 *   npm run poll -- --region=US
 *
 * `firstSeenAt` is only ever set on insert, so it records the moment this
 * app first saw a title on a service. That timestamp is what the UI sorts
 * "newly available" by — deleting and reinserting would falsify it, so
 * rows that vanish are marked stale rather than dropped.
 */

import "./env";
import { PrismaClient } from "@prisma/client";
import { getWatchProviders } from "../lib/tmdb/client";
import { AVAILABILITY_KIND } from "../lib/constants";
import { env } from "./env";

const db = new PrismaClient();

const REGION =
  process.argv.find((a) => a.startsWith("--region="))?.split("=")[1] ?? env.region;

const DELAY_MS = 110;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BUCKETS = [
  ["flatrate", AVAILABILITY_KIND.FLATRATE],
  ["free", AVAILABILITY_KIND.FREE],
  ["ads", AVAILABILITY_KIND.ADS],
  ["rent", AVAILABILITY_KIND.RENT],
  ["buy", AVAILABILITY_KIND.BUY],
] as const;

async function main() {
  if (!env.tmdbKey) {
    console.error("No TMDB_API_KEY in .env.local — availability comes from TMDB.");
    process.exit(1);
  }

  const log = await db.syncLog.create({ data: { job: "availability", status: "OK" } });
  const startedAt = new Date();

  const titles = await db.title.findMany({
    where: { tmdbId: { not: null } },
    select: { id: true, slug: true, name: true, tmdbId: true, tmdbType: true },
    orderBy: { releaseDate: "desc" },
  });

  console.log(`Polling availability for ${titles.length} titles in ${REGION}…\n`);

  let added = 0;
  let refreshed = 0;
  let failed = 0;
  const newTitles: string[] = [];

  for (const title of titles) {
    try {
      const data = await getWatchProviders(
        (title.tmdbType ?? "movie") as "movie" | "tv",
        title.tmdbId!
      );
      const regional = data?.results?.[REGION];

      if (regional) {
        let titleIsNew = false;

        for (const [bucket, kind] of BUCKETS) {
          for (const p of regional[bucket] ?? []) {
            const existing = await db.availability.findUnique({
              where: {
                titleId_region_providerId_kind: {
                  titleId: title.id,
                  region: REGION,
                  providerId: p.provider_id,
                  kind,
                },
              },
              select: { id: true },
            });

            if (existing) {
              await db.availability.update({
                where: { id: existing.id },
                data: {
                  providerName: p.provider_name,
                  logoPath: p.logo_path,
                  link: regional.link ?? null,
                  lastSeenAt: new Date(),
                },
              });
              refreshed++;
            } else {
              await db.availability.create({
                data: {
                  titleId: title.id,
                  region: REGION,
                  providerId: p.provider_id,
                  providerName: p.provider_name,
                  logoPath: p.logo_path,
                  kind,
                  link: regional.link ?? null,
                },
              });
              added++;
              // Only streaming tiers count as news; a title becoming
              // rentable is not "it's on Disney+ now".
              if (
                kind === AVAILABILITY_KIND.FLATRATE ||
                kind === AVAILABILITY_KIND.FREE ||
                kind === AVAILABILITY_KIND.ADS
              ) {
                titleIsNew = true;
              }
            }
          }
        }

        if (titleIsNew) {
          newTitles.push(`${title.name} (${REGION})`);
          console.log(`  + ${title.name}`);
        }
      }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${title.slug} — ${(e as Error).message}`);
    }

    await sleep(DELAY_MS);
  }

  // Rows untouched by this run are no longer offered. Keep them (so
  // firstSeenAt survives a service pulling and re-adding a title) but age
  // out anything unseen for a fortnight.
  const stale = await db.availability.deleteMany({
    where: {
      region: REGION,
      lastSeenAt: { lt: new Date(startedAt.getTime() - 14 * 24 * 60 * 60 * 1000) },
    },
  });

  await db.syncLog.update({
    where: { id: log.id },
    data: {
      status: failed === 0 ? "OK" : "PARTIAL",
      itemCount: added,
      message: `${added} new, ${refreshed} refreshed, ${stale.count} expired, ${failed} failed`,
      finishedAt: new Date(),
    },
  });

  console.log(
    `\nDone. ${added} new, ${refreshed} refreshed, ${stale.count} expired, ${failed} failed.`
  );
  if (newTitles.length > 0) {
    console.log(`\nNewly streamable:\n${newTitles.map((t) => `  · ${t}`).join("\n")}`);
  }
}

main()
  .catch((e) => {
    console.error("\nPoll failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
