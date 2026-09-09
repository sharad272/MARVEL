# MarvelVerse

Every Marvel film, series and animation in one place — with a real player,
timeline orders, character arcs and legal streaming links.

104 titles across six continuities: the MCU (Phases 1–6), the Defenders
saga, the Fox X-Men films, Sony's Spider-Man universe, the animated shows
and the pre-MCU Marvel cinema.

## What it does

**Complete, curated catalog.** Hand-maintained in `data/catalog.ts` rather
than scraped, because no TMDB query cleanly expresses "every Marvel screen
production, grouped by continuity, ordered by in-universe chronology".
TMDB then enriches each entry with artwork, runtimes, trailers, episode
lists and streaming availability.

**Four viewing orders.** Release, in-universe timeline, phase-by-phase
(grouped into sagas), and a curated "first watch" path for newcomers.

**A player with the full YouTube control surface.** One control bar drives
two backends — official trailers from YouTube, and media files you already
own from disk. Keyboard shortcuts (`k`/`space`, `j`/`l`, arrows, `0`–`9`,
`f`, `t`, `i`, `m`, `<`/`>`), scrubber with hover preview and chapter
ticks, playback speed, quality selection for HLS, picture-in-picture,
theater mode, autoplay-next queue, and resume-from-where-you-stopped.

**Character-based theming.** Every character in `lib/characters.ts` carries
a palette lifted from their suit. Those palettes drive accents, glows and
gradients throughout, so browsing Thor looks like Asgard and browsing Loki
looks like the TVA.

**"Just landed" rail.** A poller watches regional streaming availability
and surfaces titles the moment a service adds them, ordered by when this
app first saw them — so a decade-old film arriving on Disney+ this morning
leads the rail.

**LLM features, grounded on your catalog.** Natural-language search
("the one where Cap fights Tony" → Civil War), spoiler-free "previously
on" recaps, watch-order prerequisites, and character arcs traced across
every appearance. Every title-returning prompt asks the model to pick
slugs from a supplied list, so a hallucinated title becomes an unknown
slug that gets dropped rather than a fake result.

## Setup

```bash
npm install
npm run setup      # generate client, create SQLite db, seed the catalog
npm run dev        # http://localhost:3001
```

The app is browsable immediately, but posters, backdrops, trailers and
availability all come from TMDB. Add a key to light it up:

1. Sign up at [themoviedb.org](https://www.themoviedb.org/signup), then
   **Settings → API → Request an API key** (choose Developer). It's free
   and issued instantly.
2. Put it in `.env.local` as `TMDB_API_KEY`.
3. `npm run sync` — takes a few minutes for the full catalog.

### Environment

Copy `.env.example` to `.env.local` and fill in what you want:

| Variable | Purpose |
| --- | --- |
| `TMDB_API_KEY` | Artwork, trailers, episodes, availability. Free. |
| `HF_TOKEN` | Ask the Watcher, recaps and arcs via Hugging Face (`gpt-oss-120b`). |
| `WATCH_REGION` | ISO 3166-1 code driving "where to watch" (`IN`, `US`, `GB`…). |
| `LOCAL_MEDIA_ROOT` | Folder of media you own, for full-length playback. |

`.env.local` is gitignored and read server-side only, so no key ever
reaches the browser.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3001. |
| `npm run setup` | Generate Prisma client, create the DB, seed the catalog. |
| `npm run seed` | Re-seed after editing `data/catalog.ts`. Idempotent. |
| `npm run sync` | Pull TMDB metadata for stale titles. `-- --force` for all, `-- --slug=loki` for one. |
| `npm run poll` | Refresh streaming availability only. Cheap; run hourly. |
| `npm run scan` | Index local media files and match them to titles. |
| `npm run worker` | Scheduler: availability hourly, catalog daily, media scan every 6h. |
| `npm run check:llm` | Verify the Hugging Face connection and JSON mode. |
| `npm run db:studio` | Browse the database. |

## Architecture

```
app/                  Next.js 15 App Router
  (pages)             home, browse, timeline, characters, title, watch,
                      search, ask, library, settings
  api/                BFF route handlers — all secrets stay server-side
    progress/         playback position writes (incl. sendBeacon on unload)
    library/          watchlist, watched, favourites, ratings
    media/[id]/       range-request streaming for local files
    search/           instant substring search
    llm/              grounded search, recaps, character arcs
components/
  player/             engine abstraction + control surface
    types.ts          PlayerEngine interface, shared by both backends
    html5-engine.ts   native <video>, HLS via dynamically-imported hls.js
    youtube-engine.ts YouTube IFrame API adapter
    use-player.ts     unified state, fullscreen, PiP, progress writes
    use-keyboard.ts   the shortcut map
    controls.tsx      scrubber, volume, speed, quality, mode toggles
lib/
  characters.ts       character registry and theme engine
  constants.ts        enum-like constants (SQLite has no real enums)
  queries.ts          every UI read; hits SQLite only, never TMDB
  tmdb/               client with self-healing id resolution
  llm/                Hugging Face client + the grounded feature prompts
data/catalog.ts       the curated catalog and recommended order
scripts/              seed, sync, poll, scan, worker, check-llm
prisma/schema.prisma  SQLite schema
```

Data flows one direction. The scripts own every outbound network call and
write to SQLite; the pages read from SQLite only. Page renders are
therefore fast and keep working when TMDB is down or unkeyed.

Two details worth knowing if you extend this:

- **Theming is a CSS-variable contract.** Components never hard-code a
  hero colour — they read `--c-primary` / `--c-secondary` / `--c-accent`,
  which `themeVars()` writes onto a wrapper element. Re-skinning any
  subtree is one style attribute.
- **TMDB ids in the catalog are hints, not truth.** `resolveId()` verifies
  the fetched name against the expected one and falls back to a search, so
  a wrong or drifted id self-heals instead of permanently attaching the
  wrong artwork to a title.

## On video sources

This app hosts no video and resolves no third-party stream links. It plays
exactly three things:

1. Official trailers, teasers and clips from Marvel's YouTube channels,
   via the YouTube IFrame API.
2. Media files already on your machine that you legally own, served by the
   app's own range-request route.
3. Nothing else — for full features it links out to whichever licensed
   service carries the title in your region.

## Legal

Unofficial personal-use project, not affiliated with, endorsed by or
sponsored by Marvel or The Walt Disney Company. All characters, artwork and
trailers are the property of their respective owners. Metadata and artwork
courtesy of [TMDB](https://www.themoviedb.org/), which does not endorse
this product.
