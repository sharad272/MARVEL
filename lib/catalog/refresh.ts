/**
 * Keep the SQLite catalog aligned with newly released Marvel titles.
 *
 * Date rails already flip a known title from "coming soon" to "latest"
 * on its release day. This module goes further: when a TMDB key is set,
 * it discovers new Marvel Studios / MCU titles and upserts them so the
 * app does not wait on a hand edit of data/catalog.ts.
 */

import { db } from "@/lib/db";
import { FRANCHISE, MEDIA_TYPE } from "@/lib/constants";
import { slugify, sortName } from "@/lib/utils";
import { discoverMarvelSlate, getDetails, hasTmdbKey } from "@/lib/tmdb/client";

const REFRESH_KEY = "catalog.refreshedAt";
const STALE_MS = 12 * 60 * 60 * 1000;

const THEME_HINTS: [string, string][] = [
  ["friendly neighborhood spider", "spider-man"],
  ["spider-man", "spider-man"],
  ["spiderman", "spider-man"],
  ["punisher", "punisher"],
  ["daredevil", "daredevil"],
  ["fantastic four", "fantastic-four"],
  ["fantastic 4", "fantastic-four"],
  ["black panther", "black-panther"],
  ["doctor strange", "doctor-strange"],
  ["captain america", "captain-america"],
  ["captain marvel", "captain-marvel"],
  ["scarlet witch", "scarlet-witch"],
  ["wandavision", "scarlet-witch"],
  ["agatha", "scarlet-witch"],
  ["visionquest", "vision"],
  ["vision", "vision"],
  ["deadpool", "deadpool"],
  ["wolverine", "wolverine"],
  ["x-men", "x-men"],
  ["thunderbolts", "winter-soldier"],
  ["winter soldier", "winter-soldier"],
  ["ironheart", "iron-man"],
  ["iron man", "iron-man"],
  ["guardians", "guardians"],
  ["groot", "groot"],
  ["thor", "thor"],
  ["hulk", "hulk"],
  ["loki", "loki"],
  ["moon knight", "moon-knight"],
  ["ms. marvel", "ms-marvel"],
  ["ms marvel", "ms-marvel"],
  ["she-hulk", "she-hulk"],
  ["ant-man", "ant-man"],
  ["venom", "venom"],
  ["blade", "blade"],
  ["avengers", "avengers"],
  ["echo", "daredevil"],
  ["born again", "daredevil"],
  ["wakanda", "black-panther"],
];

function guessTheme(name: string): string {
  const n = name.toLowerCase();
  for (const [needle, slug] of THEME_HINTS) {
    if (n.includes(needle)) return slug;
  }
  return "avengers";
}

function guessPhase(released: string): number | null {
  const year = Number(released.slice(0, 4));
  if (year >= 2025) return 6;
  if (year >= 2023) return 5;
  if (year >= 2021) return 4;
  if (year >= 2016) return 3;
  return null;
}

export type RefreshResult = {
  added: number;
  updated: number;
  skipped: boolean;
  reason?: string;
};

export async function catalogRefreshedAt(): Promise<Date | null> {
  const row = await db.appSetting.findUnique({ where: { key: REFRESH_KEY } });
  if (!row?.value) return null;
  const d = new Date(row.value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function stampRefresh() {
  const value = new Date().toISOString();
  await db.appSetting.upsert({
    where: { key: REFRESH_KEY },
    update: { value },
    create: { key: REFRESH_KEY, value },
  });
}

export async function maybeRefreshCatalog(force = false): Promise<RefreshResult> {
  if (!force) {
    const last = await catalogRefreshedAt();
    if (last && Date.now() - last.getTime() < STALE_MS) {
      return { added: 0, updated: 0, skipped: true, reason: "fresh" };
    }
  }

  if (!hasTmdbKey()) {
    await stampRefresh();
    await db.syncLog.create({
      data: {
        job: "refresh",
        status: "PARTIAL",
        message:
          "No TMDB_API_KEY — date rails still follow today, but new titles were not ingested.",
        itemCount: 0,
        finishedAt: new Date(),
      },
    });
    return { added: 0, updated: 0, skipped: true, reason: "no-tmdb" };
  }

  const slate = await discoverMarvelSlate();
  let added = 0;
  let updated = 0;

  for (const hit of slate) {
    const slug = slugify(hit.name);
    if (!slug) continue;
    const released = new Date(`${hit.released}T00:00:00Z`);
    const existing = await db.title.findFirst({
      where: { OR: [{ tmdbId: hit.tmdbId }, { slug }] },
    });

    if (existing) {
      const data: {
        releaseDate?: Date;
        posterPath?: string | null;
        backdropPath?: string | null;
        overview?: string | null;
        voteAverage?: number | null;
        tmdbId?: number;
        tmdbType?: string;
      } = {};
      if (!existing.posterPath && hit.posterPath) data.posterPath = hit.posterPath;
      if (!existing.backdropPath && hit.backdropPath) data.backdropPath = hit.backdropPath;
      if (!existing.overview && hit.overview) data.overview = hit.overview;
      if (hit.voteAverage != null) data.voteAverage = hit.voteAverage;
      if (!existing.tmdbId) data.tmdbId = hit.tmdbId;
      if (!existing.tmdbType) data.tmdbType = hit.tmdbType;
      if (!existing.releaseDate) data.releaseDate = released;
      else if (
        Math.abs(existing.releaseDate.getTime() - released.getTime()) > 24 * 60 * 60 * 1000
      ) {
        data.releaseDate = released;
      }
      if (Object.keys(data).length) {
        await db.title.update({ where: { id: existing.id }, data });
        updated++;
      }
      continue;
    }

    const created = await db.title.create({
      data: {
        slug,
        name: hit.name,
        sortName: sortName(hit.name),
        tmdbId: hit.tmdbId,
        tmdbType: hit.tmdbType,
        mediaType: hit.tmdbType === "tv" ? MEDIA_TYPE.SERIES : MEDIA_TYPE.FILM,
        franchise: FRANCHISE.MCU,
        phase: guessPhase(hit.released),
        themeSlug: guessTheme(hit.name),
        releaseDate: released,
        overview: hit.overview,
        posterPath: hit.posterPath,
        backdropPath: hit.backdropPath,
        voteAverage: hit.voteAverage,
      },
    });
    added++;

    const details = await getDetails(hit.tmdbType, hit.tmdbId);
    const trailer = details?.videos?.results?.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.key
    );
    if (trailer) {
      await db.video.upsert({
        where: { titleId_youtubeKey: { titleId: created.id, youtubeKey: trailer.key } },
        update: { name: trailer.name, kind: trailer.type, official: trailer.official ?? true },
        create: {
          titleId: created.id,
          youtubeKey: trailer.key,
          name: trailer.name,
          kind: trailer.type,
          official: trailer.official ?? true,
        },
      });
    }
  }

  await stampRefresh();
  await db.syncLog.create({
    data: {
      job: "refresh",
      status: "OK",
      message: `Ingested Marvel slate: ${added} added, ${updated} updated.`,
      itemCount: added + updated,
      finishedAt: new Date(),
    },
  });
  return { added, updated, skipped: false };
}
