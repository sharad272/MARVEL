"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { stillUrl } from "@/lib/tmdb/images";
import { cn, formatDate, formatRuntime } from "@/lib/utils";

type Episode = {
  id: string;
  season: number;
  episode: number;
  name: string;
  overview: string | null;
  airDate: Date | null;
  runtime: number | null;
  stillPath: string | null;
};

export function EpisodeList({ slug, episodes }: { slug: string; episodes: Episode[] }) {
  const seasons = useMemo(
    () => [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b),
    [episodes]
  );
  const [season, setSeason] = useState(seasons[0] ?? 1);

  const visible = episodes.filter((e) => e.season === season);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
          <span
            className="h-5 w-[3px] rounded-full"
            style={{ backgroundColor: "var(--c-primary)" }}
          />
          Episodes
        </h2>

        {seasons.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {seasons.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(s)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  s === season
                    ? "text-white"
                    : "bg-white/[0.07] text-white/60 hover:bg-white/15 hover:text-white"
                )}
                style={s === season ? { backgroundColor: "var(--c-primary)" } : undefined}
              >
                Season {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {visible.map((ep) => {
          const still = stillUrl(ep.stillPath, "w300");
          return (
            <li key={ep.id}>
              <Link
                href={`/watch/${slug}?s=${ep.season}&e=${ep.episode}`}
                className="group flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-[var(--c-primary)] hover:bg-white/[0.05] sm:gap-4"
              >
                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:w-44">
                  {still ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={still}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="crackle h-full" />
                  )}
                  <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full text-white"
                      style={{ backgroundColor: "var(--c-primary)" }}
                    >
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold tabular-nums text-white/40">
                      {ep.episode}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-white/90 group-hover:text-white">
                      {ep.name}
                    </h3>
                  </div>
                  {ep.overview && (
                    <p className="clamp-2 mt-1.5 text-[13px] leading-relaxed text-white/50">
                      {ep.overview}
                    </p>
                  )}
                  <p className="mt-1.5 flex items-center gap-2 text-[11px] text-white/35">
                    {ep.airDate && <span>{formatDate(ep.airDate)}</span>}
                    {formatRuntime(ep.runtime) && (
                      <>
                        <span>·</span>
                        <span>{formatRuntime(ep.runtime)}</span>
                      </>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
