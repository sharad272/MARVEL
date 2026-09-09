/**
 * Seeds the curated catalog, character registry and appearance graph.
 *
 * Idempotent — safe to re-run after editing data/catalog.ts. HD artwork
 * from data/artwork.ts fills empty poster/backdrop slots; a later
 * `npm run sync` overwrites them with live TMDB files.
 */

import "./env";
import { PrismaClient } from "@prisma/client";
import { CATALOG } from "../data/catalog";
import { SEED_ART } from "../data/artwork";
import { CHARACTERS } from "../lib/characters";
import { sortName } from "../lib/utils";

const db = new PrismaClient();

async function main() {
  console.log("Seeding MarvelVerse…\n");

  // --- Characters ------------------------------------------------------
  for (const c of CHARACTERS) {
    await db.character.upsert({
      where: { slug: c.slug },
      update: { name: c.name, realName: c.realName ?? null, bio: c.tagline },
      create: { slug: c.slug, name: c.name, realName: c.realName ?? null, bio: c.tagline },
    });
  }
  console.log(`  characters   ${CHARACTERS.length}`);

  // --- Titles ----------------------------------------------------------
  let created = 0;
  let updated = 0;

  for (const t of CATALOG) {
    const released = new Date(`${t.released}T00:00:00Z`);
    const fields = {
      name: t.name,
      sortName: sortName(t.name),
      tmdbId: t.tmdbId ?? null,
      tmdbType: t.tmdbType,
      mediaType: t.mediaType,
      franchise: t.franchise,
      phase: t.phase ?? null,
      themeSlug: t.theme,
      releaseDate: released,
      chronoOrder: t.chrono ?? null,
      chronoNote: t.chronoNote ?? null,
    };

    const art = SEED_ART[t.slug];
    const existing = await db.title.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await db.title.update({
        where: { slug: t.slug },
        data: {
          ...fields,
          ...(!existing.posterPath && art?.poster ? { posterPath: art.poster } : {}),
          ...(!existing.backdropPath && art?.backdrop ? { backdropPath: art.backdrop } : {}),
        },
      });
      updated++;
    } else {
      await db.title.create({
        data: {
          slug: t.slug,
          ...fields,
          posterPath: art?.poster ?? null,
          backdropPath: art?.backdrop ?? null,
        },
      });
      created++;
    }
  }

  // Only drop slugs we explicitly retired. Never wipe titles that TMDB
  // auto-ingest added, or a later seed would erase newly released entries.
  const RETIRED_SLUGS: string[] = [];
  const pruned = RETIRED_SLUGS.length
    ? await db.title.deleteMany({ where: { slug: { in: RETIRED_SLUGS } } })
    : { count: 0 };
  console.log(
    `  titles       ${created} created, ${updated} updated${
      pruned.count ? `, ${pruned.count} removed` : ""
    }`
  );

  // --- Appearance graph ------------------------------------------------
  // Rebuilt wholesale: cast lists in the catalog are the source of truth,
  // and a removed name should disappear from the character's arc.
  await db.appearance.deleteMany({});
  let appearances = 0;

  for (const t of CATALOG) {
    if (!t.cast?.length) continue;
    const title = await db.title.findUnique({ where: { slug: t.slug }, select: { id: true } });
    if (!title) continue;

    for (const slug of new Set(t.cast)) {
      const character = await db.character.findUnique({ where: { slug }, select: { id: true } });
      if (!character) {
        console.warn(`    ! unknown character "${slug}" in ${t.slug}`);
        continue;
      }
      await db.appearance.create({
        data: {
          characterId: character.id,
          titleId: title.id,
          role: t.theme === slug ? "LEAD" : "SUPPORTING",
        },
      });
      appearances++;
    }
  }
  console.log(`  appearances  ${appearances}`);

  // --- Official trailers -----------------------------------------------
  // Seeded independently of TMDB so the player is playable on first boot.
  const { OFFICIAL_TRAILERS } = await import("../data/trailers");
  let trailers = 0;
  for (const [slug, trailer] of Object.entries(OFFICIAL_TRAILERS)) {
    const title = await db.title.findUnique({ where: { slug }, select: { id: true } });
    if (!title) continue;
    await db.video.upsert({
      where: { titleId_youtubeKey: { titleId: title.id, youtubeKey: trailer.key } },
      update: { name: trailer.name, kind: "Trailer", official: true },
      create: {
        titleId: title.id,
        youtubeKey: trailer.key,
        name: trailer.name,
        kind: "Trailer",
        official: true,
      },
    });
    trailers++;
  }
  console.log(`  trailers     ${trailers}`);

  const total = await db.title.count();
  console.log(`\nDone. ${total} titles in the catalog.`);
  console.log("Next: add TMDB_API_KEY to .env.local, then `npm run sync`.");
}

main()
  .catch((e) => {
    console.error("\nSeed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
