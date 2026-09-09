import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Star,
  Calendar,
  Clock,
  Layers,
  ExternalLink,
  HardDrive,
} from "lucide-react";
import { getTitleBySlug, pickFeaturedVideo } from "@/lib/queries";
import { getCharacter, themeVars } from "@/lib/characters";
import { CoverArt } from "@/components/cover-art";
import { logoUrl, providerLogoUrl, youtubeThumb } from "@/lib/tmdb/images";
import {
  AVAILABILITY_LABEL,
  FRANCHISE_META,
  PHASE_SAGA,
  type AvailabilityKind,
  type Franchise,
} from "@/lib/constants";
import { formatDate, formatRuntime, formatYear } from "@/lib/utils";
import { LibraryButtons } from "@/components/library-buttons";
import { EpisodeList } from "@/components/episode-list";
import { TitleInsights } from "@/components/title-insights";
import { AttachLocal } from "@/components/attach-local";
import { LicensedWatch } from "@/components/licensed-watch";
import { withOfficialVideos } from "@/lib/videos";
import { hasLlm } from "@/lib/llm/groq";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) return { title: "Not found" };
  return {
    title: title.name,
    description: title.overview ?? undefined,
  };
}

export default async function TitlePage({ params }: Params) {
  await connection();
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) notFound();

  const theme = getCharacter(title.themeSlug);
  const videos = withOfficialVideos(title.slug, title.videos);
  const featured = pickFeaturedVideo(videos);
  const region = process.env.WATCH_REGION?.trim() || "US";
  const franchise = FRANCHISE_META[title.franchise as Franchise];

  const streaming = title.availability.filter((a) =>
    ["FLATRATE", "FREE", "ADS"].includes(a.kind)
  );
  const rentBuy = title.availability.filter((a) => ["RENT", "BUY"].includes(a.kind));

  const extras = videos.filter((v) => v.kind !== "Trailer" && v.kind !== "Teaser");

  const leads = title.appearances.filter((a) => a.role === "LEAD");
  const supporting = title.appearances.filter((a) => a.role !== "LEAD");

  const localFile = title.localMedia.find((m) => !m.episodeId);
  const libraryEntry = title.library[0] ?? null;

  return (
    <div style={themeVars(theme)}>
      {/* --- Wallpaper header ------------------------------------------- */}
      <div className="relative min-h-[min(88svh,620px)] w-full sm:min-h-[68vh]">
        <div className="absolute inset-0 overflow-hidden">
        <CoverArt
          alt=""
          variant="backdrop"
          backdropPath={title.backdropPath}
          youtubeKey={featured?.youtubeKey}
          themeSlug={title.themeSlug}
          sizes="100vw"
          priority
          className="object-cover object-top"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="hero-tint absolute inset-0" />
        </div>

        <div className="relative mx-auto flex min-h-[min(88svh,620px)] max-w-[1500px] items-end px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:min-h-[68vh] sm:px-6 sm:pb-10 sm:pt-28 lg:px-10">
          <div className="flex w-full items-end gap-4 sm:gap-8">
            <div className="relative aspect-[2/3] w-[112px] shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/15 sm:w-[210px]">
              <CoverArt
                alt={title.name}
                name={title.name}
                posterPath={title.posterPath}
                posterSize="w780"
                youtubeKey={featured?.youtubeKey}
                themeSlug={title.themeSlug}
                badge={title.phase ? `Phase ${title.phase}` : title.franchise}
                sizes="210px"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/browse?franchise=${title.franchise}`}
                  className="rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-85"
                  style={{ backgroundColor: "var(--c-primary)" }}
                >
                  {franchise?.label ?? title.franchise}
                </Link>
                {title.phase && (
                  <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Phase {title.phase} · {PHASE_SAGA[title.phase]}
                  </span>
                )}
              </div>

              {title.logoPath ? (
                <div className="relative mb-4 h-20 w-full max-w-[440px] sm:h-24">
                  <Image
                    src={logoUrl(title.logoPath, "w500")!}
                    alt={title.name}
                    fill
                    sizes="440px"
                    className="object-contain object-left drop-shadow-2xl"
                    quality={75}
                  />
                </div>
              ) : (
                <h1 className="title-stroke mb-4 text-balance text-[2rem] font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
                  {title.name}
                </h1>
              )}

              {title.tagline && (
                <p
                  className="mb-4 text-sm font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--c-accent)" }}
                >
                  {title.tagline}
                </p>
              )}

              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
                {title.voteAverage ? (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">
                      {title.voteAverage.toFixed(1)}
                    </span>
                  </span>
                ) : null}
                {title.releaseDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(title.releaseDate)}
                  </span>
                )}
                {formatRuntime(title.runtime) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRuntime(title.runtime)}
                    {title.mediaType === "SERIES" && " / ep"}
                  </span>
                )}
                {title.chronoNote && (
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Set in {title.chronoNote}
                  </span>
                )}
              </div>

              {title.overview && (
                <p className="mb-6 max-w-2xl text-pretty leading-relaxed text-white/80 max-sm:clamp-3 sm:mb-7">
                  {title.overview}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={`/watch/${title.slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black shadow-xl transition-transform hover:scale-105 sm:w-auto sm:py-3"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {localFile ? "Play movie" : "Play trailer"}
                </Link>
                {localFile && featured && (
                  <Link
                    href={`/watch/${title.slug}?src=trailer`}
                    className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                  >
                    Trailer
                  </Link>
                )}
                <LibraryButtons
                  titleId={title.id}
                  initialStatus={libraryEntry?.status ?? null}
                  initialFavorite={libraryEntry?.favorite ?? false}
                />
                <Link
                  href={`/ask?q=${encodeURIComponent(`What do I need to watch before ${title.name}?`)}`}
                  className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  Ask
                </Link>
              </div>

              {localFile && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <HardDrive className="h-3.5 w-3.5" />
                  Local copy indexed — plays in full
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Body -------------------------------------------------------- */}
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-12">
            <TitleInsights slug={title.slug} name={title.name} llmEnabled={hasLlm()} />

            <section className="panel rounded-xl p-5">
              <AttachLocal titleId={title.id} slug={title.slug} />
            </section>

            {title.episodes.length > 0 && (
              <EpisodeList slug={title.slug} episodes={title.episodes} />
            )}

            {videos.filter((v) => v.kind === "Trailer" || v.kind === "Teaser").length > 0 && (
              <VideoSection
                heading="Trailers & teasers"
                slug={title.slug}
                videos={videos.filter((v) => v.kind === "Trailer" || v.kind === "Teaser")}
              />
            )}

            {extras.length > 0 && (
              <VideoSection heading="Clips & featurettes" slug={title.slug} videos={extras} />
            )}

            {(leads.length > 0 || supporting.length > 0) && (
              <section>
                <SectionHeading>Characters</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {[...leads, ...supporting].map((a) => {
                    const charTheme = getCharacter(a.character.slug);
                    return (
                      <Link
                        key={a.character.slug}
                        href={`/characters/${a.character.slug}`}
                        style={themeVars(charTheme)}
                        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-3.5 transition-colors hover:border-[var(--c-primary)]"
                      >
                        <span
                          className="h-6 w-6 shrink-0 rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${charTheme.primary}, ${charTheme.secondary})`,
                          }}
                        />
                        <span className="text-sm font-medium text-white/85 group-hover:text-white">
                          {a.character.name}
                        </span>
                        {a.role === "LEAD" && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                            Lead
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* --- Sidebar --------------------------------------------------- */}
          <aside className="space-y-6">
            <LicensedWatch name={title.name} franchise={title.franchise} region={region} />
            {streaming.length > 0 && (
              <ProviderPanel heading="Recorded for your region" providers={streaming} />
            )}
            {rentBuy.length > 0 && <ProviderPanel heading="Rent or buy" providers={rentBuy} />}

            <div className="panel rounded-xl p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
                Details
              </h2>
              <dl className="space-y-2.5 text-sm">
                <Detail label="Type" value={title.mediaType === "SERIES" ? "Series" : "Film"} />
                <Detail label="Continuity" value={franchise?.label ?? title.franchise} />
                {title.phase && <Detail label="Phase" value={`Phase ${title.phase}`} />}
                {title.releaseDate && (
                  <Detail label="Released" value={formatYear(title.releaseDate)} />
                )}
                {title.endDate && <Detail label="Ended" value={formatYear(title.endDate)} />}
                {title.episodes.length > 0 && (
                  <Detail label="Episodes" value={String(title.episodes.length)} />
                )}
                {title.chronoNote && <Detail label="Setting" value={title.chronoNote} />}
                {title.homepage && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-white/45">Official</dt>
                    <dd className="min-w-0 text-right">
                      <a
                        href={title.homepage}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 truncate text-white/80 underline decoration-white/25 underline-offset-2 hover:text-white"
                      >
                        Site
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
      <span className="h-5 w-[3px] rounded-full" style={{ backgroundColor: "var(--c-primary)" }} />
      {children}
    </h2>
  );
}

function VideoSection({
  heading,
  slug,
  videos,
}: {
  heading: string;
  slug: string;
  videos: { id?: string; youtubeKey: string; name: string; kind: string }[];
}) {
  return (
    <section>
      <SectionHeading>{heading}</SectionHeading>
      <div className="rail flex gap-4 overflow-x-auto pb-2">
        {videos.map((v) => (
          <Link
            key={v.id ?? v.youtubeKey}
            href={`/watch/${slug}?v=${v.youtubeKey}`}
            className="group w-[min(72vw,260px)] shrink-0 sm:w-[260px]"
          >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-ink-800 ring-1 ring-white/[0.08] transition-all group-hover:ring-[var(--c-primary)] group-hover:glow-primary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumb(v.youtubeKey)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 grid place-items-center bg-black/25 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white shadow-xl"
                  style={{ backgroundColor: "var(--c-primary)" }}
                >
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </span>
              </div>
            </div>
            <p className="clamp-2 mt-2 text-[13px] font-medium leading-snug text-white/85 group-hover:text-white">
              {v.name}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">{v.kind}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProviderPanel({
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
    <div className="panel panel-accent rounded-xl p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">{heading}</h2>
      <ul className="space-y-1.5">
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
                <span className="h-8 w-8 shrink-0 rounded-md bg-white/10" />
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="text-right text-white/85">{value}</dd>
    </div>
  );
}
