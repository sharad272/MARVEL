import Link from "next/link";
import { CodexSearch } from "@/components/codex/codex-search";
import { codexList, powerScore, topRanked } from "@/lib/codex";
import { filmStill } from "@/lib/film-still";
import { getLeadFilmStills } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Strongest Character",
  description:
    "Marvel characters ranked by power, with their story and how they compare. Movie posters when a film is built around them.",
};

export default async function CodexPage() {
  const stills = await getLeadFilmStills();
  const items = codexList().map((item) => ({
    ...item,
    image: filmStill(item.characterSlug, stills, item.image),
  }));
  const top = topRanked(10).map((entry) => ({
    ...entry,
    image: filmStill(entry.characterSlug, stills, entry.image),
  }));

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16 lg:px-10">
      <header className="mb-8 max-w-2xl sm:mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Strongest Character
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-white/55 sm:text-base">
          {items.length} Marvel heroes and villains, ranked by power. Open anyone for their
          story, their timeline, and who they would beat. Not listed? Type the name and ask
          the Watcher.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
          Power rankings · top 10
        </h2>
        <ol className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {top.map((e, i) => (
            <li key={e.key} className="w-[150px] shrink-0">
              <Link
                href={`/codex/${e.key}`}
                className="group block overflow-hidden rounded-xl ring-1 ring-white/[0.08] hover:ring-[var(--c-primary)]"
              >
                <div className="relative aspect-[3/4] bg-ink-800">
                  <img src={e.image} alt="" className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <span className="absolute left-2 top-2 text-2xl font-black text-white drop-shadow">
                    {i + 1}
                  </span>
                  <div className="absolute inset-x-2 bottom-2">
                    <p className="text-[13px] font-black uppercase leading-tight text-white">{e.name}</p>
                    <p className="text-[11px] font-bold text-white/60">Power {powerScore(e)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <CodexSearch items={items} />

      <p className="mt-10 max-w-2xl text-[11px] leading-relaxed text-white/30">
        A character with their own film uses that movie&rsquo;s poster. Everyone else keeps the comic
        image. Power stats are fan ratings of the comics versions from the open{" "}
        <a
          href="https://github.com/akabab/superhero-api"
          className="underline underline-offset-2 hover:text-white/60"
        >
          superhero-api
        </a>{" "}
        dataset, so on-screen versions can differ.
      </p>
    </div>
  );
}
