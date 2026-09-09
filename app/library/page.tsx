import Link from "next/link";
import { Heart, Bookmark, Check, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { TitleCard } from "@/components/title-card";
import { titleCardSelect, continueWatching } from "@/lib/queries";
import { LIBRARY_STATUS, LIBRARY_STATUS_LABEL, type LibraryStatus } from "@/lib/constants";
import { formatTimecode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Library" };

export default async function LibraryPage() {
  const [entries, resume] = await Promise.all([
    db.libraryEntry.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        favorite: true,
        rating: true,
        title: { select: titleCardSelect },
      },
    }),
    continueWatching(24),
  ]);

  const byStatus = (status: LibraryStatus) =>
    entries.filter((e) => e.status === status).map((e) => e.title);

  const favorites = entries.filter((e) => e.favorite).map((e) => e.title);
  const watchlist = byStatus(LIBRARY_STATUS.WATCHLIST);
  const watching = byStatus(LIBRARY_STATUS.WATCHING);
  const watched = byStatus(LIBRARY_STATUS.WATCHED);

  const empty =
    entries.length === 0 && resume.length === 0;

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          My Library
        </h1>
        <p className="mt-2 text-white/50">
          Everything you&rsquo;ve saved, rated and watched. Stored locally in
          your own database.
        </p>
      </header>

      {empty ? (
        <div className="crackle rounded-2xl border border-white/10 p-12 text-center">
          <Bookmark className="mx-auto mb-4 h-10 w-10 text-white/25" />
          <p className="text-lg font-bold text-white">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-pretty leading-relaxed text-white/50">
            Add titles to your watchlist, mark what you&rsquo;ve seen, and start
            a trailer — this page fills itself in as you go.
          </p>
          <Link
            href="/browse"
            className="mt-7 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-14">
          {resume.length > 0 && (
            <section>
              <SectionHeading icon={<PlayCircle className="h-4 w-4" />}>
                Continue watching
              </SectionHeading>
              <Grid>
                {resume.map((r) => (
                  <TitleCard
                    key={`${r.title.id}-${r.episode?.id ?? "film"}`}
                    title={r.title}
                    progress={
                      r.durationSec ? (r.positionSec / r.durationSec) * 100 : undefined
                    }
                    className="w-full"
                    toWatch
                    watchHref={
                      r.episode
                        ? `/watch/${r.title.slug}?s=${r.episode.season}&e=${r.episode.episode}`
                        : `/watch/${r.title.slug}`
                    }
                  />
                ))}
              </Grid>
              <p className="mt-3 text-xs text-white/30">
                {resume
                  .slice(0, 3)
                  .map(
                    (r) =>
                      `${r.title.name} — ${formatTimecode(r.positionSec)}${
                        r.durationSec ? ` of ${formatTimecode(r.durationSec)}` : ""
                      }`
                  )
                  .join(" · ")}
              </p>
            </section>
          )}

          {favorites.length > 0 && (
            <section>
              <SectionHeading icon={<Heart className="h-4 w-4 fill-current" />}>
                Favourites
              </SectionHeading>
              <Grid>
                {favorites.map((t) => (
                  <TitleCard key={t.id} title={t} className="w-full" />
                ))}
              </Grid>
            </section>
          )}

          {watchlist.length > 0 && (
            <section>
              <SectionHeading icon={<Bookmark className="h-4 w-4" />}>
                {LIBRARY_STATUS_LABEL.WATCHLIST}
              </SectionHeading>
              <Grid>
                {watchlist.map((t) => (
                  <TitleCard key={t.id} title={t} className="w-full" />
                ))}
              </Grid>
            </section>
          )}

          {watching.length > 0 && (
            <section>
              <SectionHeading icon={<PlayCircle className="h-4 w-4" />}>
                {LIBRARY_STATUS_LABEL.WATCHING}
              </SectionHeading>
              <Grid>
                {watching.map((t) => (
                  <TitleCard key={t.id} title={t} className="w-full" toWatch />
                ))}
              </Grid>
            </section>
          )}

          {watched.length > 0 && (
            <section>
              <SectionHeading icon={<Check className="h-4 w-4" />}>
                {LIBRARY_STATUS_LABEL.WATCHED}
                <span className="ml-2 text-sm font-normal text-white/35">
                  {watched.length}
                </span>
              </SectionHeading>
              <Grid>
                {watched.map((t) => (
                  <TitleCard key={t.id} title={t} className="w-full" />
                ))}
              </Grid>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-marvel/20 text-marvel-400">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {children}
    </div>
  );
}
