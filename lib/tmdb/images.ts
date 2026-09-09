/**
 * TMDB image URL helpers.
 *
 * Image delivery is unauthenticated once you have a file path, so these
 * are safe to call from client components.
 */

const IMG = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w780" | "w1280" | "original";
export type LogoSize = "w185" | "w300" | "w500";
export type StillSize = "w300" | "w780";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = "w1280") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function logoUrl(path: string | null | undefined, size: LogoSize = "w300") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function stillUrl(path: string | null | undefined, size: StillSize = "w300") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function providerLogoUrl(path: string | null | undefined) {
  return path ? `${IMG}/w92${path}` : null;
}

/** YouTube thumbnail, used for video rails without hitting the TMDB API. */
export function youtubeThumb(key: string, quality: "hq" | "max" = "max") {
  return `https://i.ytimg.com/vi/${key}/${quality === "max" ? "maxresdefault" : "hqdefault"}.jpg`;
}
