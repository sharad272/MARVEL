"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { Play, Info, Star } from "lucide-react";
import { getCharacter, themeVars } from "@/lib/characters";
import { CoverArt } from "@/components/cover-art";
import { WatchlistIconButton } from "@/components/library-buttons";
import { logoUrl } from "@/lib/tmdb/images";
import { officialTrailer } from "@/lib/videos";
import { cn, formatRuntime, formatYear } from "@/lib/utils";
import type { TitleCard } from "@/lib/queries";
import { TitleWatcherActions } from "@/components/title-watcher-actions";

type HeroTitle = TitleCard & { logoPath?: string | null; overview?: string | null };

const ROTATE_MS = 9000;

export function HeroBillboard({
  titles,
  watchlistIds = [],
}: {
  titles: HeroTitle[];
  watchlistIds?: string[];
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [listed, setListed] = useState(() => new Set(watchlistIds));
  const swipeX = useRef<number | null>(null);

  const go = useCallback(
    (i: number) => setActive(((i % titles.length) + titles.length) % titles.length),
    [titles.length]
  );

  useEffect(() => {
    if (paused || titles.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % titles.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, titles.length]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (titles.length === 0) return null;

  const current = titles[active];
  const theme = getCharacter(current.themeSlug);

  return (
    <section
      style={themeVars(theme)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        swipeX.current = e.changedTouches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = swipeX.current;
        swipeX.current = null;
        if (start == null || titles.length < 2) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
      }}
      className="relative min-h-[min(92svh,640px)] w-full sm:min-h-[86vh]"
    >
      {/* Wallpaper is clipped so Ken-Burns scale never spills; the copy
          layer below is not, so Play/More-info can't get chopped off on
          short phone viewports. */}
      <div className="absolute inset-0 overflow-hidden">
      {titles.map((t, i) => {
        const nearby =
          i === active ||
          i === (active + 1) % titles.length ||
          i === (active - 1 + titles.length) % titles.length;
        const yt = nearby ? officialTrailer(t.slug) : null;
        return (
          <div
            key={t.id}
            aria-hidden={i !== active}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-out",
              i === active ? "opacity-100" : "opacity-0"
            )}
          >
            {nearby ? (
              <CoverArt
                alt=""
                variant="backdrop"
                backdropPath={t.backdropPath}
                youtubeKey={yt?.key}
                themeSlug={t.themeSlug}
                sizes="100vw"
                priority={i === 0}
                className={cn(
                  "object-cover object-top motion-safe:transition-transform motion-safe:duration-[9000ms] motion-safe:ease-linear",
                  i === active ? "sm:scale-105" : "scale-100"
                )}
              />
            ) : null}
          </div>
        );
      })}
      <div className="hero-scrim absolute inset-0" />
      <div className="hero-tint absolute inset-0" />
      </div>

      <div className="relative flex min-h-[min(92svh,640px)] items-end pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:min-h-[86vh] sm:pb-20 sm:pt-28">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <div key={current.id} className="max-w-2xl animate-slide-up">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                style={{ backgroundColor: "var(--c-primary)" }}
              >
                {current.franchise === "MCU" ? "Marvel Studios" : current.franchise}
              </span>
              {current.phase && (
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/55">
                  Phase {current.phase}
                </span>
              )}
            </div>

            {/* Official title treatment when TMDB has one; type otherwise. */}
            {current.logoPath ? (
              <div className="relative mb-5 h-20 w-full max-w-[420px] sm:h-28">
                  <Image
                    src={logoUrl(current.logoPath, "w500")!}
                    alt={current.name}
                    fill
                    sizes="420px"
                    quality={75}
                    className="object-contain object-left drop-shadow-2xl"
                />
              </div>
            ) : (
              <h1 className="title-stroke mb-4 text-balance text-[2rem] font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl sm:mb-5 sm:text-6xl lg:text-7xl">
                {current.name}
              </h1>
            )}

            {current.tagline && (
              <p
                className="mb-3 text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--c-accent)" }}
              >
                {current.tagline}
              </p>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              {formatYear(current.releaseDate) && <span>{formatYear(current.releaseDate)}</span>}
              {formatRuntime(current.runtime) && (
                <>
                  <span className="text-white/25">·</span>
                  <span>{formatRuntime(current.runtime)}</span>
                </>
              )}
              {current.voteAverage ? (
                <>
                  <span className="text-white/25">·</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {current.voteAverage.toFixed(1)}
                  </span>
                </>
              ) : null}
              {current.chronoNote && (
                <>
                  <span className="text-white/25">·</span>
                  <span className="text-white/50">Set in {current.chronoNote}</span>
                </>
              )}
            </div>

            {current.overview && (
              <p className="clamp-2 mb-5 max-w-xl text-pretty text-[15px] leading-relaxed text-white/75 sm:clamp-3 sm:mb-7">
                {current.overview}
              </p>
            )}

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={`/watch/${current.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black shadow-xl transition-transform hover:scale-105 sm:w-auto sm:py-3"
              >
                <Play className="h-4 w-4 fill-current" />
                Play
              </Link>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href={`/title/${current.slug}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  <Info className="h-4 w-4" />
                  More info
                </Link>
                <TitleWatcherActions slug={current.slug} name={current.name} />
                <WatchlistIconButton
                  key={current.id}
                  titleId={current.id}
                  initialInList={listed.has(current.id)}
                  onToggle={(on) => {
                    setListed((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(current.id);
                      else next.delete(current.id);
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {titles.length > 1 && (
            <div className="mt-8 flex items-center gap-2 sm:mt-10">
              {titles.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show ${t.name}`}
                  aria-current={i === active}
                  className={cn(
                    "h-2 min-w-8 rounded-full transition-all duration-300 sm:h-1 sm:min-w-0",
                    i === active ? "w-10" : "w-5 bg-white/25 hover:bg-white/50"
                  )}
                  style={i === active ? { backgroundColor: "var(--c-primary)" } : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
