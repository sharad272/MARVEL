import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Zap } from "lucide-react";
import { getCharacter, themeVars } from "@/lib/characters";
import { ArtFallback } from "@/components/art-fallback";
import { backdropUrl, posterUrl, providerLogoUrl } from "@/lib/tmdb/images";
import { formatRelative } from "@/lib/utils";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import type { TitleCard } from "@/lib/queries";

type Row = {
  title: TitleCard;
  providerName: string;
  logoPath: string | null;
  link: string | null;
  firstSeenAt: Date;
};

/**
 * The "it appeared the moment it went live" rail.
 *
 * Ordered by when the availability poller first saw the title on a
 * service, not by release date, so a decade-old film landing on Disney+
 * this morning leads the rail.
 */
export function NewlyAvailableRail({ rows, region }: { rows: Row[]; region: string }) {
  if (rows.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mb-3 px-4 sm:px-6 lg:px-10">
        <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          <span className="grid h-6 w-6 place-items-center rounded bg-emerald-500/20 text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
          </span>
          Just landed
        </h2>
        <p className="mt-1 pl-[34px] text-sm text-white/45">
          Newly streamable in your region ({region}). Updated every time the
          availability poller runs.
        </p>
      </div>

      <div className="rail flex gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {rows.map(({ title, providerName, logoPath, link, firstSeenAt }) => {
          const theme = getCharacter(title.themeSlug);
          const art = backdropUrl(title.backdropPath, "w780") ?? posterUrl(title.posterPath, "w342");

          return (
            <div
              key={title.id}
              style={themeVars(theme)}
              className="group relative w-[min(78vw,300px)] shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/[0.08] transition-all hover:ring-[var(--c-primary)] hover:glow-primary sm:w-[300px]"
            >
              <Link href={`/title/${title.slug}`} className="block">
                <div className="relative aspect-video">
                  {art ? (
                    <Image
                      src={art}
                      alt={title.name}
                      fill
                      sizes="300px"
                      quality={75}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <ArtFallback name={title.name} themeSlug={title.themeSlug} variant="tile" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                  <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                    {formatRelative(firstSeenAt)}
                  </span>

                  <div className="absolute inset-x-3 bottom-3">
                    <h3 className="clamp-2 text-sm font-bold leading-snug text-white drop-shadow">
                      {title.name}
                    </h3>
                  </div>
                </div>
              </Link>

              <div className="flex flex-col gap-2 border-t border-white/[0.07] p-3">
                <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {providerLogoUrl(logoPath) && (
                    <Image
                      src={providerLogoUrl(logoPath)!}
                      alt={providerName}
                      width={24}
                      height={24}
                      className="shrink-0 rounded"
                    />
                  )}
                  <span className="truncate text-xs font-medium text-white/70">
                    {providerName}
                  </span>
                </div>

                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white hover:text-black"
                  >
                    Watch
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                </div>
                <TitleWatcherActions slug={title.slug} name={title.name} variant="compact" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
