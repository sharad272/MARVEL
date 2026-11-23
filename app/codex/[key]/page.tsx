import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CodexProfile } from "@/components/codex/codex-profile";
import { StatBars } from "@/components/codex/stat-bars";
import { VersusPicker, type VersusOption } from "@/components/codex/versus-picker";
import { TitleCard } from "@/components/title-card";
import {
  RANKED_COUNT,
  codexRank,
  getCodexEntry,
  powerNeighbours,
  powerScore,
  powerTier,
  type CodexEntry,
} from "@/lib/codex";
import raw from "@/data/generated/codex.json";
import { getCharacter, themeVars } from "@/lib/characters";
import { hasLlm } from "@/lib/llm/groq";
import { getCharacterWithAppearances } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Params) {
  const { key } = await params;
  const e = getCodexEntry(key);
  return { title: e ? `${e.name} · Codex` : "Codex" };
}

function toOption(e: CodexEntry): VersusOption {
  return { key: e.key, name: e.name, image: e.image, stats: e.stats };
}

function Neighbour({ e, dir }: { e: CodexEntry; dir: "up" | "down" }) {
  const Icon = dir === "up" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={`/codex/${e.key}`}
      className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/[0.06]"
    >
      <img src={e.image} alt="" className="h-12 w-9 shrink-0 rounded object-cover object-top" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{e.name}</span>
        <span className="text-[11px] text-white/45">
          #{codexRank(e.key)} · Power {powerScore(e)}
        </span>
      </span>
      <Icon className={dir === "up" ? "h-4 w-4 text-red-400" : "h-4 w-4 text-emerald-400"} />
    </Link>
  );
}

export default async function CodexEntryPage({ params }: Params) {
  const { key } = await params;
  const e = getCodexEntry(key);
  if (!e) notFound();

  const theme = getCharacter(e.characterSlug ?? "marvel");
  const score = powerScore(e);
  const rank = codexRank(e.key);
  const { stronger, weaker } = powerNeighbours(e.key, 3);
  const character = e.characterSlug ? await getCharacterWithAppearances(e.characterSlug) : null;
  const titles = (character?.appearances ?? [])
    .map((a) => a.title)
    .sort((a, b) => (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0));
  const options = (raw as CodexEntry[]).map(toOption);
  const llmEnabled = hasLlm();

  const facts = [
    ["Real name", e.fullName],
    ["Alignment", e.alignment && ({ good: "Hero", bad: "Villain", neutral: "Neutral" }[e.alignment] ?? e.alignment)],
    ["First appearance", e.firstAppearance],
    ["Species", e.race],
    ["Born", e.placeOfBirth],
    ["Occupation", e.occupation],
    ["Affiliations", e.groups],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <div
      style={themeVars(theme)}
      className="page-shell mx-auto max-w-[1400px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16 lg:px-10"
    >
      <Link href="/codex" className="text-[13px] font-semibold text-white/50 hover:text-white">
        ← Codex
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <aside className="space-y-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="mx-auto max-w-[240px] overflow-hidden rounded-2xl ring-1 ring-white/10 lg:max-w-none">
            <img src={e.imageLarge} alt={e.name} className="aspect-[3/4] w-full object-cover object-top" />
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-850 p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Power</p>
                <p className="text-4xl font-black tabular-nums text-white">{score ?? "—"}</p>
              </div>
              <div className="text-right">
                <p
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                  style={{ backgroundColor: "var(--c-primary)" }}
                >
                  {powerTier(score)}
                </p>
                {rank && (
                  <p className="mt-1.5 text-[12px] font-semibold text-white/55">
                    #{rank} of {RANKED_COUNT}
                  </p>
                )}
              </div>
            </div>
            {score != null ? (
              <StatBars stats={e.stats} />
            ) : (
              <p className="text-[13px] text-white/50">
                No fan stats for this character yet. The AI profile still covers their power level.
              </p>
            )}
          </div>

          {(stronger.length > 0 || weaker.length > 0) && (
            <div className="rounded-xl border border-white/10 bg-ink-850 p-3">
              <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-white/45">
                Nearest in power
              </p>
              {stronger.map((n) => (
                <Neighbour key={n.key} e={n} dir="up" />
              ))}
              {weaker.map((n) => (
                <Neighbour key={n.key} e={n} dir="down" />
              ))}
            </div>
          )}
        </aside>

        <header className="order-first min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
            <h1 className="title-stroke text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
              {e.name}
            </h1>
            {e.aliases.length > 0 && (
              <p className="mt-2 text-[14px] text-white/50">Also known as {e.aliases.join(", ")}</p>
            )}
            {facts.length > 0 && (
              <dl className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {facts.map(([k, v]) => (
                  <div key={k} className="text-[13px]">
                    <dt className="font-bold uppercase tracking-wider text-white/35">{k}</dt>
                    <dd className="text-white/75">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {e.characterSlug && (
              <Link
                href={`/characters/${e.characterSlug}`}
                className="mt-5 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold text-black hover:scale-[1.02]"
              >
                Trace their screen arc
              </Link>
            )}
          </header>

        <div className="min-w-0 space-y-8 lg:col-start-2 lg:row-start-2">
          <CodexProfile query={`key=${encodeURIComponent(e.key)}`} name={e.name} llmEnabled={llmEnabled} />

          {score != null && <VersusPicker self={toOption(e)} options={options} llmEnabled={llmEnabled} />}

          {titles.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
                Watch them · {titles.length} titles
              </h2>
              <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {titles.map((t) => (
                  <TitleCard key={t.id} title={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
