import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { getTitlesByChrono } from "@/lib/queries";
import { getCharacter, themeVars } from "@/lib/characters";
import { ArtFallback } from "@/components/art-fallback";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import { formatRuntime, formatYear } from "@/lib/utils";
import { FRANCHISE } from "@/lib/constants";
import { TitleWatcherActions } from "@/components/title-watcher-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Timeline",
  description: "The Marvel Cinematic Universe in in-universe chronological order.",
};

export default async function TimelinePage() {
  const titles = await getTitlesByChrono(FRANCHISE.MCU);
  const placed = titles.filter((t) => t.chronoNote);

  return (
    <div className="page-shell mx-auto max-w-[1100px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-20">
      <header className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-marvel-400">
          In-universe chronology
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          The Marvel timeline
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-white/55">
          The saga in the order it happens, not the order it was released —
          from Steve Rogers in 1943 to the present day. {placed.length} titles,
          each anchored to when it takes place.
        </p>
      </header>

      <ol className="relative">
        {/* The spine. Absolute rather than a border on each row so it runs
            continuously behind the markers. */}
        <span
          className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-white/25 via-white/10 to-transparent sm:left-[19px]"
          aria-hidden
        />

        {titles.map((t, i) => {
          const theme = getCharacter(t.themeSlug);
          const art = posterUrl(t.posterPath, "w185");
          const backdrop = backdropUrl(t.backdropPath, "w780");

          return (
            <li key={t.id} style={themeVars(theme)} className="relative pb-6 pl-12 sm:pl-16">
              <span
                className="absolute left-0 top-3 grid h-8 w-8 place-items-center rounded-full text-[11px] font-black text-white shadow-lg ring-4 ring-ink-950 sm:h-10 sm:w-10 sm:text-xs"
                style={{ backgroundColor: theme.primary }}
              >
                {i + 1}
              </span>

              <article
                className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-ink-850 transition-colors hover:border-[var(--c-primary)]"
              >
                {backdrop && (
                  <Image
                    src={backdrop}
                    alt=""
                    fill
                    sizes="900px"
                    className="object-cover object-top opacity-[0.14] transition-opacity duration-500 group-hover:opacity-25"
                    quality={70}
                  />
                )}

                <div className="relative flex gap-4 p-3.5">
                  <Link
                    href={`/title/${t.slug}`}
                    className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-ink-800 ring-1 ring-white/10 sm:w-20"
                  >
                    {art ? (
                      <Image src={art} alt="" fill sizes="80px" quality={70} className="object-cover" />
                    ) : (
                      <ArtFallback name={t.name} themeSlug={t.themeSlug} variant="tile" />
                    )}
                  </Link>

                  <Link href={`/title/${t.slug}`} className="min-w-0 flex-1 py-0.5">
                    {t.chronoNote && (
                      <p
                        className="mb-1 text-[11px] font-black uppercase tracking-[0.15em]"
                        style={{ color: theme.accent }}
                      >
                        {t.chronoNote}
                      </p>
                    )}
                    <h2 className="text-balance text-base font-bold leading-tight text-white sm:text-lg">
                      {t.name}
                    </h2>
                    <p className="mt-1 text-xs text-white/40">
                      {t.mediaType === "SERIES" ? "Series" : "Film"}
                      {formatYear(t.releaseDate) && ` · released ${formatYear(t.releaseDate)}`}
                      {formatRuntime(t.runtime) && ` · ${formatRuntime(t.runtime)}`}
                      {t.phase && ` · Phase ${t.phase}`}
                    </p>
                    {t.tagline && (
                      <p className="clamp-2 mt-2 text-[13px] leading-relaxed text-white/45">
                        {t.tagline}
                      </p>
                    )}
                  </Link>

                  <Link
                    href={`/watch/${t.slug}`}
                    aria-label={`Play ${t.name}`}
                    className="flex shrink-0 items-center self-center"
                  >
                    <span
                      className="grid h-11 w-11 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-110 sm:h-10 sm:w-10"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </Link>
                </div>
                <div className="relative px-3.5 pb-3.5">
                  <TitleWatcherActions slug={t.slug} name={t.name} variant="compact" />
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
