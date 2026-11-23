import { posterUrl, youtubeThumb, type PosterSize } from "@/lib/tmdb/images";
import type { LeadFilmStill } from "@/lib/queries";

/**
 * Movie art when a film is built around this character (poster, or the
 * trailer frame when the poster was never synced). Otherwise the comic image.
 */
export function filmStill(
  slug: string | null | undefined,
  stills: Record<string, LeadFilmStill>,
  fallback: string,
  size: PosterSize = "w500"
): string {
  const still = slug ? stills[slug] : undefined;
  if (!still) return fallback;
  if (still.poster) return posterUrl(still.poster, size) ?? fallback;
  if (still.trailer) return youtubeThumb(still.trailer, "hq");
  return fallback;
}
