import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, HardDrive } from "lucide-react";
import { WatchScreen } from "@/components/watch-screen";
import { getTitleBySlug, pickFeaturedVideo } from "@/lib/queries";
import { getCharacter, themeVars } from "@/lib/characters";
import { AVAILABILITY_LABEL, type AvailabilityKind } from "@/lib/constants";
import { providerLogoUrl, backdropUrl, youtubeThumb } from "@/lib/tmdb/images";
import { MIN_RESUME_SECONDS } from "@/lib/constants";
import { AttachLocal } from "@/components/attach-local";
import { LicensedWatch } from "@/components/licensed-watch";
import { withOfficialVideos } from "@/lib/videos";
import { TitleWatcherActions } from "@/components/title-watcher-actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };
type Search = { searchParams: Promise<{ v?: string; s?: string; e?: string; src?: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  return { title: title ? `Watch ${title.name}` : "Watch" };
}

export default async function WatchPage({ params, searchParams }: Params & Search) {
  const { slug } = await params;
  const { v, s, e, src } = await searchParams;
  const region = process.env.WATCH_REGION?.trim() || "US";

  const title = await getTitleBySlug(slug);
  if (!title) notFound();

  const theme = getCharacter(title.themeSlug);
  const videos = withOfficialVideos(title.slug, title.videos);

  const episode =
    s && e
      ? title.episodes.find((ep) => ep.season === Number(s) && ep.episode === Number(e)) ?? null
      : null;

  const requested = v ? videos.find((vid) => vid.youtubeKey === v) : null;
  const featured = requested ?? pickFeaturedVideo(videos);

  // A local file is the full movie. `?v=` or `?src=trailer` opts into the
  // official trailer instead, so both remain reachable from one page.
  const wantTrailer = Boolean(v) || src === "trailer";
  const localFile = wantTrailer
    ? undefined
    : episode
      ? title.localMedia.find((m) => m.episodeId === episode.id)
      : title.localMedia.find((m) => !m.episodeId);

  const poster =
    backdropUrl(title.backdropPath) ??
    (featured ? youtubeThumb(featured.youtubeKey, "max") : null);

  const progress = title.progress.find((p) => {
    if (localFile) return p.episodeId === (episode?.id ?? null) && !p.videoKey;
    return p.videoKey === featured?.youtubeKey;
  });
  const startAt =
    progress && progress.positionSec > MIN_RESUME_SECONDS && !progress.completed
      ? progress.positionSec
      : 0;

  const source = localFile
    ? {
        kind: "file" as const,
        src: `/api/media/${localFile.id}`,
        title: episode
          ? `${title.name} · S${episode.season}E${episode.episode} — ${episode.name}`
          : title.name,
        poster,
        startAt,
      }
    : featured
      ? {
          kind: "youtube" as const,
          src: featured.youtubeKey,
          title: `${title.name} — ${featured.name}`,
          poster,
          startAt,
        }
      : null;

  const streaming = title.availability.filter(
    (a) => a.kind === "FLATRATE" || a.kind === "FREE" || a.kind === "ADS"
  );
  const rentBuy = title.availability.filter((a) => a.kind === "RENT" || a.kind === "BUY");

  return (
    <div style={themeVars(theme)} className="watch-page min-h-dvh bg-ink-950">
      <div className="mx-auto max-w-[1500px] px-0 pb-16 sm:px-4 lg:px-8">
        <div className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-0 sm:py-4">
          <Link
            href={`/title/${title.slug}`}
            className="flex min-h-11 items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {title.name}
          </Link>
        </div>

        {source ? (
          <WatchScreen
            source={source}
            titleId={title.id}
            episodeId={localFile ? (episode?.id ?? null) : null}
            videoKey={localFile ? null : featured!.youtubeKey}
            isLocal={Boolean(localFile)}
            videos={videos.map((vid) => ({
              key: vid.youtubeKey,
              name: vid.name,
              kind: vid.kind,
            }))}
            slug={title.slug}
            activeVideoKey={featured?.youtubeKey ?? null}
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-ink-900 px-6 sm:rounded-xl">
            <div className="w-full max-w-lg text-center">
              <p className="mb-1 font-semibold text-white">No official trailer on file</p>
              <p className="text-sm leading-relaxed text-white/50">
                Use the licensed services on the right to watch the full title.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 px-4 sm:px-0 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title.name}
            </h1>
            {title.tagline && (
              <p
                className="mt-1.5 text-sm font-semibold uppercase tracking-[0.15em]"
                style={{ color: "var(--c-accent)" }}
              >
                {title.tagline}
              </p>
            )}
            {title.overview && (
              <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-white/70">
                {title.overview}
              </p>
            )}

            <TitleWatcherActions slug={title.slug} name={title.name} className="mt-5 max-w-md" />

            {localFile ? (
              <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
                <HardDrive className="h-4 w-4 shrink-0" />
                Playing your copy — {localFile.fileName}
              </p>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-white/45">
                Official trailer in the player. The full movie is on licensed
                services — Disney+, Prime, Apple TV and others via JustWatch.
              </p>
            )}

            {localFile && featured && (
              <div className="mt-6">
                <Link
                  href={`/watch/${title.slug}?src=trailer`}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
                >
                  Watch trailer instead
                </Link>
              </div>
            )}

            <div className="mt-8">
              <AttachLocal titleId={title.id} slug={title.slug} />
            </div>
          </div>

          <aside className="space-y-5">
            <LicensedWatch name={title.name} franchise={title.franchise} region={region} />
            {streaming.length > 0 && (
              <ProviderBlock heading="Recorded for your region" providers={streaming} />
            )}
            {rentBuy.length > 0 && (
              <ProviderBlock heading="Rent or buy" providers={rentBuy} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProviderBlock({
  heading,
  providers,
}: {
  heading: string;
  providers: {
    id: string;
    providerName: string;
    logoPath: string | null;
    link: string | null;
    kind: string;
  }[];
}) {
  return (
    <div className="panel rounded-xl p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
        {heading}
      </h2>
      <ul className="space-y-2">
        {providers.map((p) => (
          <li key={p.id}>
            <a
              href={p.link ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.07]"
            >
              {providerLogoUrl(p.logoPath) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={providerLogoUrl(p.logoPath)!}
                  alt=""
                  width={32}
                  height={32}
                  className="shrink-0 rounded-md"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-xs">
                  ?
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {p.providerName}
                </span>
                <span className="block text-[11px] text-white/45">
                  {AVAILABILITY_LABEL[p.kind as AvailabilityKind] ?? p.kind}
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/35" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
