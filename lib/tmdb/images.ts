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

/**
 * YouTube thumbnail, used for video rails without hitting the TMDB API.
 *
 * Defaults to "hq" (hqdefault, 480x360) because it's generated for every
 * video. "max" (maxresdefault, up to 1280x720) only exists for videos
 * uploaded at sufficient resolution — when it's missing, YouTube can
 * return a tiny ~120x90 placeholder with a 200 status instead of a 404,
 * which silently defeats naive onError fallbacks. Callers that want to
 * try for the sharper size (e.g. CoverArt) must opt in explicitly and
 * handle that soft-failure themselves.
 */
export function youtubeThumb(key: string, quality: "hq" | "max" = "hq") {
  return `https://i.ytimg.com/vi/${key}/${quality === "max" ? "maxresdefault" : "hqdefault"}.jpg`;
}
