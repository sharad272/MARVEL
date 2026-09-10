import Link from "next/link";
import { Play, Star, Tv } from "lucide-react";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import { getCharacter, themeVars } from "@/lib/characters";
import { CoverArt } from "@/components/cover-art";
import { officialTrailer } from "@/lib/videos";
import { cn, formatRuntime, formatYear } from "@/lib/utils";
import { formatShortDate, isUpcoming } from "@/lib/clock";
import type { TitleCard as TitleCardData } from "@/lib/queries";

type Props = {
  title: TitleCardData;
  /** Ordinal badge, used by the timeline and recommended views. */
  index?: number;
  /** Resume percentage 0..100, drawn as a bar across the poster foot. */
  progress?: number;
  /** When set, the card opens the player instead of the title page. */
  toWatch?: boolean;
  /** Override the player URL (continue-watching episodes). */
  watchHref?: string;
  className?: string;
  priority?: boolean;
};

export function TitleCard({
  title,
  index,
  progress,
  toWatch,
  watchHref,
  className,
  priority,
}: Props) {
  const theme = getCharacter(title.themeSlug);
  const trailer = officialTrailer(title.slug);
  const year = formatYear(title.releaseDate);
  const coming = isUpcoming(title.releaseDate);
  const when = coming ? `Coming ${formatShortDate(title.releaseDate)}` : year;
  const runtime = formatRuntime(title.runtime);
  const isSeries = title.mediaType === "SERIES";
  const infoHref = `/title/${title.slug}`;
  const playHref = watchHref ?? `/watch/${title.slug}`;
  const primaryHref = toWatch ? playHref : infoHref;

  return (
    <div
      style={themeVars(theme)}
      className={cn("group relative w-[42vw] max-w-[168px] shrink-0 sm:w-[168px] md:w-[196px]", className)}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/[0.08] transition-all duration-300 group-hover:ring-[var(--c-primary)] group-hover:glow-primary">
        <Link href={primaryHref} className="absolute inset-0" aria-label={title.name}>
          <CoverArt
            alt={title.name}
            name={title.name}
            themeSlug={title.themeSlug}
            posterPath={title.posterPath}
            youtubeKey={trailer?.key}
            sizes="(max-width: 640px) 42vw, 196px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        </Link>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-70 md:opacity-0 md:transition-opacity md:duration-300 md:group-hover:opacity-100" />

        {typeof index === "number" && (
          <span
            className="pointer-events-none absolute left-2 top-2 z-[1] grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-xs font-black text-white shadow-lg"
            style={{ backgroundColor: "var(--c-primary)" }}
          >
            {index + 1}
          </span>
        )}

        {isSeries && (
          <span className="pointer-events-none absolute right-2 top-2 z-[1] flex items-center gap-1 rounded bg-black/70 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">
            <Tv className="h-3 w-3" />
            Series
          </span>
        )}

        <Link
          href={playHref}
          className="absolute inset-x-0 bottom-0 z-[1] p-2.5 opacity-100 transition-all duration-300 md:translate-y-2 md:p-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-black shadow">
            <Play className="h-3 w-3 fill-current" />
            Play
          </span>
        </Link>

        {typeof progress === "number" && progress > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[3px] bg-black/60">
            <div
              className="h-full"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: "var(--c-primary)",
              }}
            />
          </div>
        )}
      </div>

      <Link href={infoHref} className="mt-2.5 block px-0.5">
        <h3 className="clamp-2 text-[13px] font-semibold leading-snug text-white/90 transition-colors group-hover:text-white">
          {title.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
          {when && <span>{when}</span>}
          {runtime && (
            <>
              <span className="text-white/20">·</span>
              <span>{runtime}</span>
            </>
          )}
          {title.voteAverage ? (
            <>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                {title.voteAverage.toFixed(1)}
              </span>
            </>
          ) : null}
        </div>
      </Link>
      <TitleWatcherActions slug={title.slug} name={title.name} variant="compact" className="mt-1.5" />
    </div>
  );
}
