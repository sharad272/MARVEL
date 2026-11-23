import Link from "next/link";
import { CodexSearch } from "@/components/codex/codex-search";
import { codexList, powerScore, topRanked } from "@/lib/codex";

export const metadata = {
  title: "Codex · Any Marvel character",
  description:
    "Look up any Marvel character: their story, timeline, power stats and how they rank against everyone else.",
};

export default function CodexPage() {
  const items = codexList();
  const top = topRanked(10);

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16 lg:px-10">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--c-primary)]">The Codex</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Ask about any character in the multiverse
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-white/55 sm:text-base">
          {items.length} Marvel heroes and villains, from the movies and far beyond. Open anyone
          for their story, a timeline of their biggest moments, how powerful they are, and who
          they&rsquo;d beat in a fight. Not listed? Type the name and ask the Watcher.
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
        Power stats are fan ratings of the comics versions from the open{" "}
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
