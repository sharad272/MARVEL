import Link from "next/link";
import { TitleCard } from "@/components/title-card";
import {
  getTitlesByChrono,
  getTitlesByPhase,
  getTitlesByRelease,
  getRecommendedOrder,
  getFranchiseCounts,
} from "@/lib/queries";
import {
  FRANCHISE,
  FRANCHISE_META,
  VIEWING_ORDER,
  VIEWING_ORDER_META,
  type Franchise,
  type ViewingOrder,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = { title: "Browse" };

type Search = {
  searchParams: Promise<{ franchise?: string; order?: string; type?: string }>;
};

export default async function BrowsePage({ searchParams }: Search) {
  const sp = await searchParams;

  const franchise =
    sp.franchise && sp.franchise in FRANCHISE ? (sp.franchise as Franchise) : undefined;
  const order = (
    Object.values(VIEWING_ORDER).includes(sp.order as ViewingOrder)
      ? sp.order
      : VIEWING_ORDER.RELEASE
  ) as ViewingOrder;
  const mediaFilter = sp.type === "FILM" || sp.type === "SERIES" ? sp.type : undefined;

  const counts = await getFranchiseCounts();
  const countByFranchise = Object.fromEntries(counts.map((c) => [c.franchise, c.count]));

  // Phase view is grouped rather than a flat grid, so it renders its own way.
  if (order === VIEWING_ORDER.PHASE) {
    const groups = await getTitlesByPhase();
    return (
      <Shell
        franchise={franchise}
        order={order}
        mediaFilter={mediaFilter}
        countByFranchise={countByFranchise}
        total={groups.reduce((n, g) => n + g.titles.length, 0)}
      >
        <div className="space-y-12">
          {groups.map((g) => {
            const titles = mediaFilter
              ? g.titles.filter((t) => t.mediaType === mediaFilter)
              : g.titles;
            if (titles.length === 0) return null;
            return (
              <section key={g.phase}>
                <div className="mb-4 flex items-baseline gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Phase {g.phase}
                  </h2>
                  {g.saga && (
                    <span className="text-xs font-bold uppercase tracking-widest text-marvel-400">
                      {g.saga}
                    </span>
                  )}
                  <span className="text-sm text-white/35">{titles.length} titles</span>
                </div>
                <Grid>
                  {titles.map((t) => (
                    <TitleCard key={t.id} title={t} className="w-full" />
                  ))}
                </Grid>
              </section>
            );
          })}
        </div>
      </Shell>
    );
  }

  const titles =
    order === VIEWING_ORDER.CHRONO
      ? await getTitlesByChrono(franchise)
      : order === VIEWING_ORDER.RECOMMENDED
        ? await getRecommendedOrder()
        : await getTitlesByRelease(franchise);

  const filtered = mediaFilter ? titles.filter((t) => t.mediaType === mediaFilter) : titles;

  return (
    <Shell
      franchise={franchise}
      order={order}
      mediaFilter={mediaFilter}
      countByFranchise={countByFranchise}
      total={filtered.length}
    >
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-white/40">
          Nothing matches those filters.
        </p>
      ) : (
        <Grid>
          {filtered.map((t, i) => (
            <TitleCard
              key={t.id}
              title={t}
              index={
                order === VIEWING_ORDER.CHRONO || order === VIEWING_ORDER.RECOMMENDED
                  ? i
                  : undefined
              }
              className="w-full"
              priority={i < 6}
            />
          ))}
        </Grid>
      )}
    </Shell>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {children}
    </div>
  );
}

function Shell({
  franchise,
  order,
  mediaFilter,
  countByFranchise,
  total,
  children,
}: {
  franchise?: Franchise;
  order: ViewingOrder;
  mediaFilter?: string;
  countByFranchise: Record<string, number>;
  total: number;
  children: React.ReactNode;
}) {
  const meta = franchise ? FRANCHISE_META[franchise] : null;

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { franchise, order, type: mediaFilter, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/browse?${qs}` : "/browse";
  };

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {meta?.label ?? "The whole catalog"}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-white/50">
          {meta?.blurb ?? VIEWING_ORDER_META[order].blurb}
        </p>
        <p className="mt-2 text-sm text-white/35">{total} titles</p>
      </header>

      <div className="mb-8 space-y-4">
        <FilterRow label="Continuity">
          <Chip href={buildHref({ franchise: undefined })} active={!franchise}>
            All
          </Chip>
          {(Object.keys(FRANCHISE) as Franchise[]).map((f) => (
            <Chip key={f} href={buildHref({ franchise: f })} active={franchise === f}>
              {FRANCHISE_META[f].label.replace(/ \(.*\)$/, "")}
              <span className="ml-1.5 text-white/35">{countByFranchise[f] ?? 0}</span>
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Order">
          {(Object.values(VIEWING_ORDER) as ViewingOrder[]).map((o) => (
            <Chip key={o} href={buildHref({ order: o })} active={order === o}>
              {VIEWING_ORDER_META[o].label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Type">
          <Chip href={buildHref({ type: undefined })} active={!mediaFilter}>
            All
          </Chip>
          <Chip href={buildHref({ type: "FILM" })} active={mediaFilter === "FILM"}>
            Films
          </Chip>
          <Chip href={buildHref({ type: "SERIES" })} active={mediaFilter === "SERIES"}>
            Series
          </Chip>
        </FilterRow>
      </div>

      {children}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-widest text-white/30 sm:w-20">
        {label}
      </span>
      <div className="rail flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {children}
      </div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:py-1.5",
        active
          ? "bg-marvel text-white"
          : "bg-white/[0.07] text-white/60 hover:bg-white/15 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}
