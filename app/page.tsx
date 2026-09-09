import Link from "next/link";
import { Sparkles, Database } from "lucide-react";
import { HeroBillboard } from "@/components/hero-billboard";
import { TitleRail } from "@/components/title-rail";
import { NewlyAvailableRail } from "@/components/newly-available-rail";
import { CharacterRail } from "@/components/character-rail";
import {
  getHeroTitles,
  getNewlyAvailable,
  getRecommendedOrder,
  getTitlesByChrono,
  getTitlesByRelease,
  getRecentTitles,
  getUpcomingTitles,
  continueWatching,
  getCharactersByPresence,
  getCatalogStats,
  getWatchlist,
} from "@/lib/queries";
import { after } from "next/server";
import { FRANCHISE } from "@/lib/constants";
import { formatAsOf } from "@/lib/clock";
import { maybeRefreshCatalog } from "@/lib/catalog/refresh";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  after(() => {
    // Serverless SQLite is a copy in /tmp — persist new titles at build
    // time (`npm run refresh`) or via the local worker, not here.
    if (process.env.VERCEL) return;
    void maybeRefreshCatalog();
  });

  const region = process.env.WATCH_REGION?.trim() || "US";

  const [
    heroes,
    resume,
    newly,
    recommended,
    chrono,
    recent,
    upcoming,
    mcu,
    defenders,
    xmen,
    sony,
    animated,
    characters,
    stats,
    watchlist,
  ] = await Promise.all([
    getHeroTitles(6),
    continueWatching(12),
    getNewlyAvailable(region),
    getRecommendedOrder(),
    getTitlesByChrono(FRANCHISE.MCU, 18),
    getRecentTitles(18),
    getUpcomingTitles(12),
    getTitlesByRelease(FRANCHISE.MCU, 18),
    getTitlesByRelease(FRANCHISE.DEFENDERS, 18),
    getTitlesByRelease(FRANCHISE.XMEN, 18),
    getTitlesByRelease(FRANCHISE.SONY, 18),
    getTitlesByRelease(FRANCHISE.ANIMATED, 18),
    getCharactersByPresence(),
    getCatalogStats(),
    getWatchlist(80),
  ]);

  const progressById = Object.fromEntries(
    resume
      .filter((r) => r.durationSec)
      .map((r) => [r.title.id, (r.positionSec / r.durationSec!) * 100])
  );

  return (
    <>
      {heroes.length > 0 && (
        <HeroBillboard
          titles={heroes}
          watchlistIds={watchlist.map((w) => w.title.id)}
        />
      )}

      <div className="relative z-[2] -mt-8 pb-8">
        {!stats.synced && <SetupBanner titleCount={stats.titles} />}

        {resume.length > 0 && (
          <TitleRail
            heading="Continue watching"
            titles={resume.map((r) => r.title)}
            progressById={progressById}
            toWatch
            watchHrefById={Object.fromEntries(
              resume.map((r) => [
                r.title.id,
                r.episode
                  ? `/watch/${r.title.slug}?s=${r.episode.season}&e=${r.episode.episode}`
                  : `/watch/${r.title.slug}`,
              ])
            )}
          />
        )}

        {newly.length > 0 && (
          <NewlyAvailableRail
            rows={newly.map((r) => ({
              title: r.title,
              providerName: r.providerName,
              logoPath: r.logoPath,
              link: r.link,
              firstSeenAt: r.firstSeenAt,
            }))}
            region={region}
          />
        )}

        <AskPromo />

        {recent.length > 0 && (
          <TitleRail
            heading="Latest"
            subheading={`Released through ${formatAsOf()}, newest first. Known titles move here on their release day.`}
            titles={recent}
            href="/browse?franchise=MCU"
            priority
          />
        )}

        {upcoming.length > 0 && (
          <TitleRail
            heading="Coming soon"
            subheading="Dated after today — they move into Latest on release day."
            titles={upcoming}
            href="/browse?franchise=MCU"
          />
        )}

        <TitleRail
          heading="Start here"
          subheading="A curated path through the saga for a first watch."
          titles={recommended}
          numbered
          href="/browse?order=recommended"
          priority
        />

        <TitleRail
          heading="The MCU in timeline order"
          subheading="In-universe chronology, from the Second World War to the present."
          titles={chrono}
          numbered
          href="/timeline"
        />

        <CharacterRail characters={characters.slice(0, 18)} />

        <TitleRail
          heading="Marvel Cinematic Universe"
          subheading="Every film and series in the main continuity, in release order."
          titles={mcu}
          href="/browse?franchise=MCU"
        />

        <TitleRail
          heading="The Defenders Saga"
          subheading="Street-level Marvel out of Hell's Kitchen."
          titles={defenders}
          href="/browse?franchise=DEFENDERS"
        />

        <TitleRail
          heading="Animation"
          subheading="What If…?, X-Men '97 and the Spider-Verse."
          titles={animated}
          href="/browse?franchise=ANIMATED"
        />

        <TitleRail
          heading="X-Men"
          subheading="Two decades of mutant cinema."
          titles={xmen}
          href="/browse?franchise=XMEN"
        />

        <TitleRail
          heading="Spider-Man at Sony"
          subheading="The Raimi and Webb trilogies, plus the Venom films."
          titles={sony}
          href="/browse?franchise=SONY"
        />
      </div>
    </>
  );
}

/**
 * Shown until the first TMDB sync lands. The catalog is fully browsable
 * without it — this only explains why the art is generated rather than
 * photographic.
 */
function SetupBanner({ titleCount }: { titleCount: number }) {
  return (
    <div className="px-4 pb-2 pt-6 sm:px-6 lg:px-10">
      <div className="panel panel-accent flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-white/70">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">
              {titleCount} titles seeded — artwork not synced yet
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">
              Official trailers already play in the built-in player. Posters and
              streaming availability come from TMDB. Add a free{" "}
              <code className="rounded bg-white/10 px-1 text-xs">TMDB_API_KEY</code> to{" "}
              <code className="rounded bg-white/10 px-1 text-xs">.env.local</code>, then run{" "}
              <code className="rounded bg-white/10 px-1 text-xs">npm run sync</code>.
            </p>
          </div>
        </div>

        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 self-start rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white hover:text-black sm:self-auto"
        >
          Get a free key →
        </a>
      </div>
    </div>
  );
}

function AskPromo() {
  return (
    <section className="px-4 py-6 sm:px-6 lg:px-10">
      <Link
        href="/ask"
        className="speedlines group flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-850 p-6 transition-colors hover:border-marvel/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-grad text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-white">Ask the Watcher</h3>
            <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-white/55">
              &ldquo;The one where Cap fights Tony&rdquo;. &ldquo;What do I need to
              watch before Endgame?&rdquo; &ldquo;Recap Wanda&rsquo;s story without
              spoilers.&rdquo; Ask in plain English.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors group-hover:bg-white group-hover:text-black">
          Try it →
        </span>
      </Link>
    </section>
  );
}
