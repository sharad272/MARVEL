/**
 * Indexes the video files you own on this machine and matches them to
 * catalog titles, so the player can serve the full feature from disk
 * instead of falling back to a trailer.
 *
 * Idempotent — rows are keyed by absolute path, so re-running after you
 * move, rename or delete files reconciles the index rather than
 * duplicating it.
 *
 *   npm run scan
 *   npm run scan -- --dry-run   # report what would change, write nothing
 */

import "./env";
import { PrismaClient } from "@prisma/client";
import { access, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { titleSimilarity } from "../lib/utils";
import { MEDIA_TYPE } from "../lib/constants";
import { env } from "./env";

const db = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

/** Containers the player knows how to point a <video> element at. */
const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".m4v",
  ".webm",
  ".m2ts",
  ".ts",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".m3u8",
]);

/** Below this, the guess is worse than no guess at all. */
const MATCH_THRESHOLD = 0.45;
/** The catalog holds several same-named remakes; the year separates them. */
const YEAR_BONUS = 0.15;
const YEAR_MISMATCH_FACTOR = 0.75;
const YEAR_MIN = 1930;
const YEAR_MAX = 2035;

/**
 * Scene-release noise. Whatever survives this list is treated as the title.
 * A hyphen in a token also matches a space or nothing, so one entry covers
 * "WEB-DL", "WEB DL" and "WEBDL".
 */
const NOISE_TOKENS = [
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "576p",
  "480p",
  "4k",
  "uhd",
  "x264",
  "x265",
  "h264",
  "h265",
  "hevc",
  "avc",
  "xvid",
  "divx",
  "bluray",
  "bdrip",
  "brrip",
  "webrip",
  "web-dl",
  "hdrip",
  "dvdrip",
  "hdtv",
  "remux",
  "proper",
  "repack",
  "extended",
  "unrated",
  "imax",
  "hdr",
  "hdr10",
  "ddp",
  "dd",
  "aac",
  "ac3",
  "eac3",
  "dts",
  "dts-hd",
  "truehd",
  "atmos",
];

const NOISE_RE = new RegExp(
  `\\b(?:${NOISE_TOKENS.map((t) => t.replace(/-/g, "[\\s-]?")).join("|")})\\b`,
  "gi"
);

/**
 * Codec and channel-layout tokens carrying a dot. These have to go while the
 * dot is still there, or "H.264" survives the separator pass as the two
 * innocent-looking words "H" and "264".
 */
const DOTTED_NOISE = [
  /\bh\.26[45]\b/gi,
  /\b(?:ddp?|eac3|ac3|aac|dts)\+?\d\.\d\b/gi,
  /\b[257]\.[01](?:ch)?\b/gi,
];

/** S01E02, s1e2, Season 1 Episode 2, 1x02 — most explicit form first. */
const EPISODE_PATTERNS = [
  /\bs(\d{1,2})[\s-]*e(\d{1,3})\b/i,
  /\bseason[\s-]*(\d{1,2})[\s-]*episode[\s-]*(\d{1,3})\b/i,
  /\b(\d{1,2})x(\d{1,3})\b/i,
];

type ParsedName = {
  /** Best guess at the release's title, stripped of scene noise. */
  title: string;
  year: number | null;
  season: number | null;
  episode: number | null;
};

type Candidate = {
  id: string;
  name: string;
  mediaType: string;
  releaseDate: Date | null;
};

const exists = (target: string) => access(target).then(() => true, () => false);

// --- Filename parsing ------------------------------------------------------

function matchEpisode(text: string) {
  for (const re of EPISODE_PATTERNS) {
    const m = re.exec(text);
    if (m) return { index: m.index, season: Number(m[1]), episode: Number(m[2]) };
  }
  return null;
}

function matchYear(text: string) {
  // Fresh each call: a /g regex carries lastIndex between uses.
  const re = /\b(?:19|20)\d{2}\b/g;
  let found: { index: number; value: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = Number(m[0]);
    // The last plausible year wins, so "2012 2009 1080p" is the film 2012.
    if (value >= YEAR_MIN && value <= YEAR_MAX) found = { index: m.index, value };
  }
  return found;
}

function parseFileName(fileName: string): ParsedName {
  const base = fileName.slice(0, fileName.length - path.extname(fileName).length);

  let text = base;
  let noiseFound = false;
  for (const re of DOTTED_NOISE) {
    const stripped = text.replace(re, " ");
    if (stripped !== text) noiseFound = true;
    text = stripped;
  }

  // Dots and underscores are separators in every scene naming scheme.
  // Hyphens are not, because plenty of titles carry one (Spider-Man).
  text = text.replace(/[._]+/g, " ");

  const episode = matchEpisode(text);
  const year = matchYear(text);

  // Past the episode marker lies the episode's own name, and past the year
  // lies more noise. Neither is ever part of the title.
  const cuts = [episode?.index, year?.index].filter(
    (i): i is number => typeof i === "number" && i > 0
  );
  if (cuts.length > 0) text = text.slice(0, Math.min(...cuts));

  text = text.replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, " ");

  const withoutNoise = text.replace(NOISE_RE, " ");
  if (withoutNoise !== text) noiseFound = true;
  text = withoutNoise;

  // "…x264-RARBG" leaves the release group dangling. Only drop it when the
  // name looked like a scene release, or "Spider-Man.mkv" loses its Man.
  if (noiseFound) text = text.replace(/-\s*[a-z0-9]+\s*$/i, " ");

  return {
    title: text.replace(/\s+/g, " ").replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""),
    year: year?.value ?? null,
    season: episode?.season ?? null,
    episode: episode?.episode ?? null,
  };
}

// --- Matching --------------------------------------------------------------

function bestMatch(parsed: ParsedName, titles: Candidate[]) {
  let best: { title: Candidate; score: number } | null = null;

  for (const candidate of titles) {
    // An episode marker is only ever a claim about a series.
    if (parsed.season !== null && candidate.mediaType !== MEDIA_TYPE.SERIES) continue;

    let score = titleSimilarity(parsed.title, candidate.name);
    const releaseYear = candidate.releaseDate?.getUTCFullYear() ?? null;

    if (parsed.year !== null && releaseYear !== null) {
      if (parsed.year === releaseYear) {
        score = Math.min(1, score + YEAR_BONUS);
      } else if (parsed.season === null) {
        // A series runs for years, so a year that misses its premiere says
        // nothing. Only films are penalised for landing on the wrong one.
        score *= YEAR_MISMATCH_FACTOR;
      }
    }

    if (!best || score > best.score) best = { title: candidate, score };
  }

  return best;
}

// --- Walking the media root ------------------------------------------------

/**
 * Yields every video file under `dir`. `seen` holds the real path of each
 * directory already visited, so a symlink pointing back at an ancestor
 * stops instead of recursing forever.
 */
async function* walk(dir: string, seen: Set<string>): AsyncGenerator<string> {
  const real = await realpath(dir).catch(() => null);
  if (real === null || seen.has(real)) return;
  seen.add(real);

  const entries = await readdir(dir, { withFileTypes: true }).catch((e: Error) => {
    console.log(`  ! ${dir} — ${e.message}`);
    return null;
  });
  if (!entries) return;

  for (const entry of entries) {
    // Dotfiles are editor and OS bookkeeping; node_modules is never media.
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const full = path.join(dir, entry.name);
    let isDirectory = entry.isDirectory();
    let isFile = entry.isFile();

    if (entry.isSymbolicLink()) {
      // A Dirent describes the link itself, so stat through it to find out
      // what is actually on the other end.
      const target = await stat(full).catch(() => null);
      if (!target) continue;
      isDirectory = target.isDirectory();
      isFile = target.isFile();
    }

    if (isDirectory) yield* walk(full, seen);
    else if (isFile && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

// --- Entry point -----------------------------------------------------------

async function main() {
  let mediaRoot = env.mediaRoot;
  if (!mediaRoot) {
    try {
      const saved = await db.appSetting.findUnique({ where: { key: "mediaRoot" } });
      mediaRoot = saved?.value ?? "";
    } catch {
      mediaRoot = "";
    }
  }

  if (!mediaRoot) {
    console.error(
      "No LOCAL_MEDIA_ROOT in .env.local.\n\n" +
        "Point it at the folder holding the films and episodes you own:\n" +
        '  LOCAL_MEDIA_ROOT="D:\\Media\\Marvel"\n\n' +
        "Then re-run `npm run scan`. Nothing is copied or uploaded — the app\n" +
        "reads the files where they already are."
    );
    process.exit(1);
  }

  // Resolved, not realpath'd: the streaming route resolves the same env var
  // and compares it against the stored path, so both must agree.
  const root = path.resolve(mediaRoot);

  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    console.error(
      `LOCAL_MEDIA_ROOT is not a readable directory:\n  ${root}\n\n` +
        "Fix the path in .env.local and re-run. Stopping here on purpose: an\n" +
        "unreadable root looks exactly like an empty library, and the prune\n" +
        "pass would throw away the whole index."
    );
    process.exit(1);
  }

  console.log(`Scanning ${root}${DRY_RUN ? " (dry run)" : ""}…\n`);

  const log = DRY_RUN
    ? null
    : await db.syncLog.create({ data: { job: "media-scan", status: "OK" } });

  // The catalog is a few hundred rows, so score against it in memory rather
  // than issuing a query per file.
  const titles = await db.title.findMany({
    select: { id: true, name: true, mediaType: true, releaseDate: true },
  });

  let scanned = 0;
  let matched = 0;
  const unmatched: string[] = [];

  for await (const file of walk(root, new Set<string>())) {
    const fileName = path.basename(file);

    const info = await stat(file).catch(() => null);
    if (!info) {
      console.log(`  ! ${fileName} — disappeared mid-scan`);
      continue;
    }
    scanned++;

    const parsed = parseFileName(fileName);
    const best = bestMatch(parsed, titles);
    const hit = best && best.score >= MATCH_THRESHOLD ? best : null;

    let episodeId: string | null = null;
    if (hit && parsed.season !== null && parsed.episode !== null) {
      const row = await db.episode.findUnique({
        where: {
          titleId_season_episode: {
            titleId: hit.title.id,
            season: parsed.season,
            episode: parsed.episode,
          },
        },
        select: { id: true },
      });
      episodeId = row?.id ?? null;
    }

    const existing = await db.localMedia.findUnique({
      where: { path: file },
      select: { titleId: true, episodeId: true, matchScore: true },
    });

    // The scanner always writes a score alongside a link, so a row holding a
    // link without one was corrected by hand in the UI. Leave it alone.
    const link =
      existing?.titleId != null && existing.matchScore === null
        ? { titleId: existing.titleId, episodeId: existing.episodeId, matchScore: null }
        : { titleId: hit?.title.id ?? null, episodeId, matchScore: hit?.score ?? null };

    if (link.titleId === null) {
      unmatched.push(fileName);
      const near = best ? ` (closest ${best.score.toFixed(2)}: ${best.title.name})` : "";
      console.log(`  ? ${fileName} — no match${near}`);
    } else {
      matched++;
      if (link.matchScore === null) {
        console.log(`  · ${fileName} — kept your manual link`);
      } else {
        const episodeNote =
          parsed.season === null
            ? ""
            : ` S${parsed.season}E${parsed.episode}${episodeId ? "" : " (not in catalog)"}`;
        console.log(
          `  ✓ ${fileName} — ${hit!.title.name}${episodeNote} (${link.matchScore.toFixed(2)})`
        );
      }
    }

    if (DRY_RUN) continue;

    const fields = {
      fileName,
      sizeBytes: BigInt(info.size),
      container: path.extname(fileName).slice(1).toLowerCase(),
      ...link,
    };
    await db.localMedia.upsert({
      where: { path: file },
      update: fields,
      create: { path: file, ...fields },
    });
  }

  // --- Prune -------------------------------------------------------------
  // Checked against the filesystem rather than against what this run
  // happened to see, so files under a root you no longer scan survive.
  const indexed = await db.localMedia.findMany({ select: { id: true, path: true } });
  const gone: string[] = [];
  for (const row of indexed) {
    if (!(await exists(row.path))) gone.push(row.id);
  }
  if (gone.length > 0 && !DRY_RUN) {
    await db.localMedia.deleteMany({ where: { id: { in: gone } } });
  }

  const summary = [
    `${scanned} scanned`,
    `${matched} matched`,
    `${unmatched.length} unmatched`,
    `${gone.length} pruned`,
  ].join(", ");

  console.log(`\n${DRY_RUN ? "Dry run — would be" : "Done."} ${summary}.`);

  if (unmatched.length > 0) {
    console.log("\nUnmatched — link these by hand from the title page:");
    for (const name of unmatched) console.log(`  ${name}`);
  }

  if (log) {
    await db.syncLog.update({
      where: { id: log.id },
      data: {
        status: unmatched.length === 0 ? "OK" : "PARTIAL",
        itemCount: matched,
        message: summary,
        finishedAt: new Date(),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error("\nScan failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
