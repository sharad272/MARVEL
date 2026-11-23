import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { chatJson } from "@/lib/llm/groq";
import {
  STAT_KEYS,
  codexRank,
  getCodexEntry,
  powerNeighbours,
  powerScore,
  powerTier,
  RANKED_COUNT,
  type CodexEntry,
} from "@/lib/codex";

const VERSION = "codex-v3";

export type CodexProfile = {
  key: string;
  name: string;
  found: boolean;
  summary: string;
  timeline: { era: string; event: string }[];
  power: { tier: string; explanation: string };
  versus: { name: string; verdict: string }[];
  screen: string;
};

export type CodexVersus = {
  a: string;
  b: string;
  winner: string;
  verdict: string;
  edges: { name: string; edge: string }[];
};

const SYSTEM = `You are the Watcher's Codex: a Marvel encyclopedia for fans.
Write in plain, vivid English for someone who may only know the movies.

Rules:
- Ground every claim in the supplied data. Beyond it, use only the most
  famous, widely known facts — the kind any fan wiki leads with. Prefer
  fewer, safer facts over detail.
- Do not name minor storylines, issue numbers, side characters or years
  unless they are iconic (e.g. "The Dark Phoenix Saga", "Civil War",
  "Secret Wars", "The Infinity Gauntlet"). If unsure of a specific, leave
  it out or describe it generally ("in the 1960s comics").
- Film/TV facts must come from the supplied catalog titles.
- Power stats are fan ratings (0-100) of the comics version. Treat them as
  a rough guide, not canon, and say so when it matters.
- Clearly separate comics history from film/TV versions.
- Return a single JSON object and nothing else.`;

function statLine(e: CodexEntry): string {
  const s = STAT_KEYS.map((k) => `${k} ${e.stats[k] ?? "?"}`).join(", ");
  const score = powerScore(e);
  const rank = codexRank(e.key);
  return `${s}. Average ${score ?? "unrated"}${
    rank ? ` (rank #${rank} of ${RANKED_COUNT} rated Marvel characters, tier ${powerTier(score)})` : ""
  }`;
}

function bioLines(e: CodexEntry): string {
  return [
    `Name: ${e.name}${e.fullName && e.fullName !== e.name ? ` (${e.fullName})` : ""}`,
    e.aliases.length ? `Aliases: ${e.aliases.join(", ")}` : null,
    e.alignment ? `Alignment: ${e.alignment}` : null,
    e.firstAppearance ? `First appearance: ${e.firstAppearance}` : null,
    e.race ? `Species: ${e.race}` : null,
    e.occupation ? `Occupation: ${e.occupation}` : null,
    e.groups ? `Affiliations: ${e.groups}` : null,
    `Power stats: ${statLine(e)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function screenLines(characterSlug: string | null): Promise<string> {
  if (!characterSlug) return "Not linked to titles in this catalog.";
  const rows = await db.appearance.findMany({
    where: { character: { slug: characterSlug } },
    select: { title: { select: { name: true, releaseDate: true, franchise: true } } },
  });
  if (!rows.length) return "Not linked to titles in this catalog.";
  return rows
    .map((r) => r.title)
    .sort((a, b) => (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0))
    .map((t) => `- ${t.name} (${t.releaseDate?.getUTCFullYear() ?? "TBA"}, ${t.franchise})`)
    .join("\n");
}

const PROFILE_SHAPE = `{
  "summary": "120-170 words: who they are and their story — origin, defining arcs, where they stand now",
  "timeline": [{"era": "short label, e.g. 'Origin' or '1975 · Giant-Size X-Men' or '2019 · Avengers: Endgame'", "event": "one sentence"}],
  "power": {"tier": "Street-level | Elite | Planetary | Cosmic | Multiversal", "explanation": "60-90 words: what their powers are and how they stack up overall"},
  "versus": [{"name": "rival name", "verdict": "one sentence: who has the edge and why"}],
  "screen": "40-80 words: their live-action/animated versions and which titles to watch"
}
Timeline: 5-8 entries, chronological, mixing key comics eras and screen appearances.
Years: screen entries use the catalog year. For comics entries, only the
supplied first appearance may carry a year or issue number; label every
other comics entry by name alone (e.g. "Comics · The Dark Phoenix Saga").`;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/[\u200B-\u200D\uFEFF]/g, "").trim() : "";
}

function cleanProfile(raw: Record<string, unknown>, key: string, name: string): CodexProfile {
  const summary = str(raw.summary);
  const found = raw.found !== false;
  if (found && !summary) throw new Error("Model returned an empty profile.");
  const power = (raw.power ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    key,
    name: str(raw.name) || name,
    found,
    summary,
    timeline: arr(raw.timeline)
      .map((t) => ({ era: str(t.era), event: str(t.event) }))
      .filter((t) => t.event)
      .slice(0, 8),
    power: { tier: str(power.tier), explanation: str(power.explanation) },
    versus: arr(raw.versus)
      .map((v) => ({ name: str(v.name), verdict: str(v.verdict) }))
      .filter((v) => v.name && v.verdict)
      .slice(0, 6),
    screen: str(raw.screen),
  };
}

async function generateProfile(key: string): Promise<CodexProfile> {
  const e = getCodexEntry(key);
  if (!e) throw new Error(`Unknown character: ${key}`);
  const { stronger, weaker } = powerNeighbours(key, 2);
  const rivals = [...stronger, ...weaker];
  const raw = await chatJson<Record<string, unknown>>(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${bioLines(e)}

Appearances in this app's catalog:
${await screenLines(e.characterSlug)}

Nearest characters in the power ranking (compare against these in "versus"):
${
  rivals.length
    ? rivals.map((r) => `- ${r.name}: ${statLine(r)}`).join("\n")
    : "- none (unrated); compare against 2-3 well-known Marvel peers instead"
}

Return JSON:
${PROFILE_SHAPE}`,
      },
    ],
    { temperature: 0.3, maxTokens: 2200 }
  );
  return cleanProfile(raw, key, e.name);
}

async function generateFreeform(name: string): Promise<CodexProfile> {
  const raw = await chatJson<Record<string, unknown>>(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `The reader asked about: "${name}"

This character isn't in the app's stats database, so rely on well-documented
Marvel history only. If it is not a Marvel character (or you're unsure it
exists), return {"found": false, "name": "${name}", "summary": ""} and nothing else.
Otherwise include "found": true and "name" (their best-known name).

Return JSON:
${PROFILE_SHAPE}`,
      },
    ],
    { temperature: 0.3, maxTokens: 2200 }
  );
  const key = `name:${name.toLowerCase()}`;
  return cleanProfile(raw, key, name);
}

async function generateVersus(aKey: string, bKey: string): Promise<CodexVersus> {
  const a = getCodexEntry(aKey);
  const b = getCodexEntry(bKey);
  if (!a || !b) throw new Error("Unknown character");
  const raw = await chatJson<Record<string, unknown>>(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Who would win in a fair one-on-one fight, both at their typical comics power level?

A) ${bioLines(a)}

B) ${bioLines(b)}

Return JSON:
{
  "winner": "exact name of A or B, or 'Too close to call'",
  "verdict": "70-110 words: how the fight plays out and why",
  "edges": [{"name": "A's name", "edge": "their biggest advantage"}, {"name": "B's name", "edge": "their biggest advantage"}]
}`,
      },
    ],
    { temperature: 0.5, maxTokens: 1200 }
  );
  const verdict = str(raw.verdict);
  if (!verdict) throw new Error("Model returned an empty verdict.");
  const edges = (Array.isArray(raw.edges) ? (raw.edges as Record<string, unknown>[]) : [])
    .map((x) => ({ name: str(x.name), edge: str(x.edge) }))
    .filter((x) => x.name && x.edge)
    .slice(0, 2);
  return { a: a.name, b: b.name, winner: str(raw.winner), verdict, edges };
}

/** The model occasionally returns an empty object; one retry clears it. */
function retryOnce<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  return async (...args: A): Promise<T> => {
    try {
      return await fn(...args);
    } catch {
      return fn(...args);
    }
  };
}

const WEEK = 60 * 60 * 24 * 7;
const cachedProfile = unstable_cache(retryOnce(generateProfile), [VERSION, "profile"], {
  revalidate: WEEK,
  tags: ["codex"],
});
const cachedFreeform = unstable_cache(retryOnce(generateFreeform), [VERSION, "freeform"], {
  revalidate: WEEK,
  tags: ["codex"],
});
const cachedVersus = unstable_cache(retryOnce(generateVersus), [VERSION, "versus"], {
  revalidate: WEEK,
  tags: ["codex"],
});

const inFlight = new Map<string, Promise<unknown>>();

function dedupe<T>(id: string, run: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(id) as Promise<T> | undefined;
  if (pending) return pending;
  const p = run().finally(() => inFlight.delete(id));
  inFlight.set(id, p);
  return p;
}

export function codexProfile(key: string): Promise<CodexProfile> {
  return dedupe(`p:${key}`, () => cachedProfile(key));
}

export function codexFreeform(name: string): Promise<CodexProfile> {
  const n = name.replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase();
  return dedupe(`f:${n}`, () => cachedFreeform(n));
}

/** Order-independent so A-vs-B and B-vs-A share one generation. */
export function codexVersus(aKey: string, bKey: string): Promise<CodexVersus> {
  const [x, y] = [aKey, bKey].sort();
  return dedupe(`v:${x}|${y}`, () => cachedVersus(x, y));
}
