import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { EarthBriefing } from "@/components/earth-briefing";
import { TitleCard } from "@/components/title-card";
import { CROSSINGS, DOOMSDAY_SLUG, EARTHS, type EarthStatus } from "@/data/multiverse";
import { CHARACTERS, getCharacter, themeVars } from "@/lib/characters";
import { hasLlm } from "@/lib/llm/groq";
import { OVERVIEW_ID } from "@/lib/llm/multiverse";
import { getTitlesBySlugs } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Multiverse · Road to Doomsday",
  description:
    "Every Marvel universe — MCU, Fox X-Men, Spider-Man, Fantastic Four, Netflix and more — and how they collide in Avengers: Doomsday.",
};

const STATUS_STYLE: Record<EarthStatus, string> = {
  doomsday: "bg-red-500/15 text-red-300 ring-red-500/30",
  active: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  folded: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  ended: "bg-white/10 text-white/60 ring-white/15",
  outside: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

const KNOWN_CHARACTERS = new Set(CHARACTERS.map((c) => c.slug));

export default async function MultiversePage() {
  const llmEnabled = hasLlm();
  const allSlugs = [...new Set([...EARTHS.flatMap((e) => e.titles), DOOMSDAY_SLUG])];
  const titles = await getTitlesBySlugs(allSlugs);
  const bySlug = new Map(titles.map((t) => [t.slug, t]));

  const doomsday = bySlug.get(DOOMSDAY_SLUG);
  const daysLeft = doomsday?.releaseDate
    ? Math.ceil((doomsday.releaseDate.getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16 lg:px-10">
      <header className="mb-8 max-w-3xl sm:mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          Road to Doomsday
          {daysLeft !== null && daysLeft > 0 ? ` · ${daysLeft} days to go` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          The Multiverse, explained
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-white/55 sm:text-base">
          Marvel&rsquo;s films and shows live on different Earths. The MCU, the Fox X-Men
          films, three Spider-Men, the Fantastic Four and the Netflix shows each started in
          their own universe, and since 2021 they&rsquo;ve been crossing into each other.
          Here&rsquo;s every Earth, where it stands, and how it leads into{" "}
          <Link href={`/title/${DOOMSDAY_SLUG}`} className="font-semibold text-white underline-offset-4 hover:underline">
            Avengers: Doomsday
          </Link>
          .
        </p>
      </header>

      <section className="mb-10 max-w-3xl" style={themeVars(getCharacter("avengers"))}>
        <EarthBriefing
          earthId={OVERVIEW_ID}
          label="Catch me up on the whole multiverse"
          blurb="A two-minute AI briefing from Endgame to Doomsday, covering every universe."
          llmEnabled={llmEnabled}
        />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
          How the universes collided
        </h2>
        <ol className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {CROSSINGS.map((c) => (
            <li
              key={c.slug}
              className={cn(
                "w-[78vw] max-w-[280px] shrink-0 rounded-xl border bg-ink-850 p-4",
                c.slug === DOOMSDAY_SLUG ? "border-red-500/40" : "border-white/10"
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/35">{c.year}</p>
              <Link href={`/title/${c.slug}`} className="mt-1 block text-sm font-bold text-white hover:underline">
                {c.title}
              </Link>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-white/70">
                <span>{c.from}</span>
                <ArrowRight className="h-3 w-3 text-white/40" />
                <span>{c.to}</span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/50">{c.what}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav aria-label="Jump to an Earth" className="mb-8 flex flex-wrap gap-2">
        {EARTHS.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            {e.designation}
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {EARTHS.map((earth) => {
          const earthTitles = earth.titles
            .map((s) => bySlug.get(s))
            .filter((t): t is NonNullable<typeof t> => Boolean(t));
          const characters = earth.characters.filter((c) => KNOWN_CHARACTERS.has(c));

          return (
            <section
              key={earth.id}
              id={earth.id}
              className="scroll-mt-24"
              style={themeVars(getCharacter(earth.theme))}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: "var(--c-primary)" }}
                >
                  {earth.designation}
                </span>
                {!earth.designationOnScreen && earth.designation.startsWith("Earth-") && (
                  <span className="text-[11px] text-white/35">handbook designation</span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                    STATUS_STYLE[earth.status]
                  )}
                >
                  {earth.statusLabel}
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{earth.name}</h2>
              <p className="mt-1.5 text-[15px] text-white/55">{earth.tagline}</p>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  <ul className="space-y-2 text-[14px] leading-relaxed text-white/70">
                    {earth.facts.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <span
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: "var(--c-primary)" }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {earth.doomsdayCast?.length ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4">
                      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-300">
                        <Users className="h-3.5 w-3.5" />
                        Announced for Doomsday
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {earth.doomsdayCast.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white/80"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {characters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                        Characters
                      </span>
                      {characters.map((slug) => (
                        <Link
                          key={slug}
                          href={`/characters/${slug}`}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[12px] font-semibold text-white/70 hover:border-[var(--c-primary)] hover:text-white"
                        >
                          {getCharacter(slug).name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <EarthBriefing
                  earthId={earth.id}
                  label={`Explain ${earth.designation}`}
                  blurb="An AI briefing on this universe’s condition going into Doomsday."
                  llmEnabled={llmEnabled}
                />
              </div>

              {earthTitles.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
                    Watch order for this Earth · {earthTitles.length} titles
                  </h3>
                  <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    {earthTitles.map((t, i) => (
                      <TitleCard key={t.slug} title={t} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
