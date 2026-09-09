/**
 * Licensed "where to watch the full title" destinations.
 *
 * These are search/deep links into services that actually license the
 * films — never unofficial hosts. JustWatch is the region-aware index;
 * Disney+ / Apple TV / Prime are direct jumps for the common cases.
 */

export type WatchLink = {
  id: string;
  label: string;
  href: string;
  blurb: string;
};

export function licensedWatchLinks(
  name: string,
  franchise: string,
  region = process.env.WATCH_REGION?.trim() || "US"
): WatchLink[] {
  const q = encodeURIComponent(name);
  const jw = region.trim().toLowerCase() || "us";
  const disneyFamily =
    franchise === "MCU" || franchise === "DEFENDERS" || franchise === "ANIMATED";

  const links: WatchLink[] = [];

  if (disneyFamily) {
    links.push({
      id: "disney",
      label: "Disney+",
      href: `https://www.disneyplus.com/search?q=${q}`,
      blurb: "Search Disney+ for the full title",
    });
  }

  links.push({
    id: "justwatch",
    label: "JustWatch",
    href: `https://www.justwatch.com/${jw}/search?q=${q}`,
    blurb: `Licensed stream, rent and buy options in ${region.toUpperCase()}`,
  });

  links.push({
    id: "appletv",
    label: "Apple TV",
    href: `https://tv.apple.com/search?term=${q}`,
    blurb: "Rent or buy the official release",
  });

  if (franchise === "SONY" || franchise === "XMEN" || franchise === "OTHER") {
    links.push({
      id: "prime",
      label: "Prime Video",
      href: `https://www.primevideo.com/search?phrase=${q}`,
      blurb: "Search Prime Video",
    });
  }

  return links;
}
