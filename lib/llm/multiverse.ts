import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { chatJson } from "@/lib/llm/groq";
import {
  CROSSINGS,
  EARTHS,
  MULTIVERSE_VERSION,
  getEarth,
  type Earth,
} from "@/data/multiverse";

export type EarthBriefing = {
  id: string;
  headline: string;
  summary: string;
  keyMoments: string[];
  doomsday: string;
};

export const OVERVIEW_ID = "overview";

const SYSTEM = `You explain the Marvel multiverse to someone who has fallen
behind and wants to be ready for Avengers: Doomsday (December 2026).
Spoilers for released titles are expected — the reader asked to catch up.

Rules:
- Use ONLY the facts and titles you are given. Do not invent plot for
  unreleased or recently released titles; if something isn't covered, say
  it hasn't been revealed.
- Plain, friendly English. Explain jargon (variant, incursion, TVA) the
  first time you use it.
- Never claim a character appears in Doomsday unless they are in the
  supplied announced cast, and never predict Doomsday's plot, team-ups or
  who does what in it. Describe only the setup: what was left open and
  who has been announced.
- Return a single JSON object and nothing else.`;

async function titleLines(slugs: string[]): Promise<string> {
  const rows = await db.title.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, releaseDate: true, overview: true, chronoNote: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => {
      const year = r.releaseDate ? r.releaseDate.getUTCFullYear() : "TBA";
      const blurb = (r.overview ?? r.chronoNote ?? "").replace(/\s+/g, " ").slice(0, 220);
      return `- ${r.name} (${year})${blurb ? `: ${blurb}` : ""}`;
    })
    .join("\n");
}

function crossingLines(): string {
  return CROSSINGS.map((c) => `- ${c.year} ${c.title}: ${c.from} → ${c.to}. ${c.what}`).join("\n");
}

function clean(raw: Partial<EarthBriefing>, id: string): EarthBriefing {
  const str = (v: unknown) =>
    typeof v === "string" ? v.replace(/[\u200B-\u200D\uFEFF]/g, "").trim() : "";
  if (!str(raw.summary)) throw new Error("Model returned an empty briefing.");
  return {
    id,
    headline: str(raw.headline),
    summary: str(raw.summary),
    keyMoments: Array.isArray(raw.keyMoments)
      ? raw.keyMoments.map(str).filter(Boolean).slice(0, 5)
      : [],
    doomsday: str(raw.doomsday),
  };
}

async function generateEarth(earth: Earth): Promise<EarthBriefing> {
  const titles = await titleLines(earth.titles);
  const raw = await chatJson<Partial<EarthBriefing>>(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Universe: ${earth.designation} — ${earth.name}
${earth.designationOnScreen ? "(This number is stated on screen.)" : "(Not an on-screen designation; it's a handbook/fan label.)"}
Where it stands: ${earth.statusLabel}

Facts:
${earth.facts.map((f) => `- ${f}`).join("\n")}

Titles set here, in watch order:
${titles}

Announced Avengers: Doomsday cast from this universe: ${
          earth.doomsdayCast?.length ? earth.doomsdayCast.join("; ") : "none announced"
        }

How the universes have crossed so far:
${crossingLines()}

Return JSON:
{
  "headline": "one sentence: the state of this universe right now",
  "summary": "90-140 words: what happened in this universe, explained for a newcomer",
  "keyMoments": ["3-5 short bullet strings, each naming the title it happens in"],
  "doomsday": "40-70 words: how this universe connects to Avengers: Doomsday, or why it doesn't"
}`,
      },
    ],
    { temperature: 0.4, maxTokens: 1400 }
  );
  return clean(raw, earth.id);
}

async function generateOverview(): Promise<EarthBriefing> {
  const raw = await chatJson<Partial<EarthBriefing>>(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Universes:
${EARTHS.map(
  (e) =>
    `- ${e.designation} (${e.name}) — ${e.statusLabel}. ${e.facts[0]}${
      e.doomsdayCast?.length ? ` Doomsday cast: ${e.doomsdayCast.join("; ")}.` : ""
    }`
).join("\n")}

Crossings in release order:
${crossingLines()}

Return JSON:
{
  "headline": "one sentence: why the multiverse is colliding",
  "summary": "120-170 words: the big picture from Endgame to Doomsday — which universes exist and how they started bleeding into each other",
  "keyMoments": ["4-5 short bullet strings: the crossings a newcomer must know, each naming its title"],
  "doomsday": "50-80 words: who is converging on Doomsday and from where"
}`,
      },
    ],
    { temperature: 0.4, maxTokens: 1600 }
  );
  return clean(raw, OVERVIEW_ID);
}

const cachedBriefing = unstable_cache(
  async (id: string): Promise<EarthBriefing> => {
    if (id === OVERVIEW_ID) return generateOverview();
    const earth = getEarth(id);
    if (!earth) throw new Error(`Unknown earth: ${id}`);
    return generateEarth(earth);
  },
  ["multiverse-briefing", MULTIVERSE_VERSION],
  { revalidate: 60 * 60 * 24 * 7, tags: ["multiverse"] }
);

const inFlight = new Map<string, Promise<EarthBriefing>>();

/**
 * One generation per Earth per week, shared by every visitor. Concurrent
 * first requests on the same instance share one model call; failures
 * aren't cached, so the next request retries.
 */
export function earthBriefing(id: string): Promise<EarthBriefing> {
  const pending = inFlight.get(id);
  if (pending) return pending;
  const p = cachedBriefing(id).finally(() => inFlight.delete(id));
  inFlight.set(id, p);
  return p;
}

export function isBriefingId(id: string): boolean {
  return id === OVERVIEW_ID || Boolean(getEarth(id));
}
