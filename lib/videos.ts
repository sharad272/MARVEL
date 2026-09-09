/**
 * Official playable videos, resolved from the curated YouTube map so the
 * player works even when the Video table is empty (no TMDB sync, no seed
 * of trailers). TMDB rows, when present, still win for extras/clips.
 */

import { OFFICIAL_TRAILERS } from "@/data/trailers";

export type PlayableVideo = {
  youtubeKey: string;
  name: string;
  kind: string;
  official?: boolean;
  publishedAt?: Date | null;
  size?: number | null;
};

export function officialTrailer(slug: string) {
  return OFFICIAL_TRAILERS[slug] ?? null;
}

/** Merge the curated official trailer onto a title's video list. */
export function withOfficialVideos<T extends PlayableVideo>(
  slug: string,
  videos: T[]
): Array<T | PlayableVideo> {
  const seeded = OFFICIAL_TRAILERS[slug];
  if (!seeded) return videos;
  if (videos.some((v) => v.youtubeKey === seeded.key)) return videos;
  return [
    {
      youtubeKey: seeded.key,
      name: seeded.name,
      kind: "Trailer",
      official: true,
      publishedAt: null,
      size: null,
    },
    ...videos,
  ];
}
