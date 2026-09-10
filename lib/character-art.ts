/**
 * Wallpaper for a character tile/hero: lead-title artwork first, then any
 * appearance with a poster/backdrop, then the official YouTube trailer
 * still. TMDB CDN paths work without an API key once we have the file
 * path; YouTube stills cover titles that were never synced.
 */

import { officialTrailer } from "@/lib/videos";

export type AppearanceArt = {
  role?: string | null;
  title: {
    slug: string;
    posterPath: string | null;
    backdropPath: string | null;
  };
};

export type CharacterWallpaper = {
  posterPath: string | null;
  backdropPath: string | null;
  youtubeKey: string | null;
};

export function pickCharacterWallpaper(appearances: AppearanceArt[]): CharacterWallpaper {
  const ranked = [...appearances].sort((a, b) => score(b) - score(a));

  let posterPath: string | null = null;
  let backdropPath: string | null = null;
  let youtubeKey: string | null = null;

  for (const row of ranked) {
    if (!posterPath && row.title.posterPath) posterPath = row.title.posterPath;
    if (!backdropPath && row.title.backdropPath) backdropPath = row.title.backdropPath;
    if (!youtubeKey) {
      const trailer = officialTrailer(row.title.slug);
      if (trailer) youtubeKey = trailer.key;
    }
    if (posterPath && backdropPath && youtubeKey) break;
  }

  return { posterPath, backdropPath, youtubeKey };
}

function score(row: AppearanceArt): number {
  return (
    (row.role === "LEAD" ? 4 : 0) +
    (row.title.backdropPath ? 2 : 0) +
    (row.title.posterPath ? 1 : 0) +
    (officialTrailer(row.title.slug) ? 1 : 0)
  );
}
