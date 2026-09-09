/**
 * The LLM-backed features, all grounded on the local catalog.
 *
 * Every function that returns titles asks the model to pick *slugs from a
 * supplied list* and then intersects the answer with the database. A model
 * that hallucinates "Avengers: Secret Wars 2" simply produces an unknown
 * slug that gets dropped, so a bad generation degrades to fewer results
 * rather than fake ones.
 */

import { db } from "@/lib/db";
import {
  chat,
  chatJson,
  chatStream,
  extractJsonObject,
  type ChatMessage,
  type ChatOptions,
} from "@/lib/llm/groq";
import { getTitlesBySlugs } from "@/lib/queries";

type CatalogRow = {
  slug: string;
  name: string;
  franchise: string;
  phase: number | null;
  year: string;
  mediaType: string;
};

/**
 * Compact catalog index for prompt grounding. ~100 rows of "slug | Name
 * (year) | franchise" costs far fewer tokens than full overviews and is
 * all the model needs to map intent onto real titles.
 */
async function catalogIndex(): Promise<CatalogRow[]> {
  const titles = await db.title.findMany({
    orderBy: { releaseDate: "asc" },
    select: {
      slug: true,
      name: true,
      franchise: true,
      phase: true,
      releaseDate: true,
      mediaType: true,
    },
  });

  return titles.map((t) => ({
    slug: t.slug,
    name: t.name,
    franchise: t.franchise,
    phase: t.phase,
    year: t.releaseDate ? String(t.releaseDate.getUTCFullYear()) : "—",
    mediaType: t.mediaType,
  }));
}

function renderIndex(rows: CatalogRow[]): string {
  return rows
    .map(
      (r) =>
        `${r.slug} | ${r.name} (${r.year}) | ${r.franchise}${r.phase ? ` P${r.phase}` : ""} | ${
          r.mediaType === "SERIES" ? "series" : "film"
        }`
    )
    .join("\n");
}

const GROUNDING_RULES = `You are the search brain for a Marvel catalog app.
You will be given a CATALOG of titles, one per line, formatted:
  slug | Name (year) | franchise | type

Rules:
- You may ONLY return slugs that appear verbatim in the CATALOG.
- Never invent a slug or a title. If nothing fits, return an empty list.
- Order results best-match first.
- Marvel fans describe films obliquely ("the one where Cap fights Tony",
  "the airport fight", "the one with the purple guy"). Resolve that intent.`;

// ---------------------------------------------------------------------------
// Natural-language search
// ---------------------------------------------------------------------------

export type SearchResult = {
  slugs: string[];
  reasoning: string;
};

export async function nlSearch(query: string, limit = 12): Promise<SearchResult> {
  const rows = await catalogIndex();

  const result = await chatJson<{ slugs?: string[]; reasoning?: string }>(
    [
      { role: "system", content: GROUNDING_RULES },
      {
        role: "user",
        content: `CATALOG:
${renderIndex(rows)}

QUERY: ${query}

Return JSON: { "slugs": string[], "reasoning": string }
Cap "slugs" at ${limit} entries. Keep "reasoning" to one short sentence
explaining the match, written for a fan (no meta-commentary about JSON).`,
      },
    ],
    { temperature: 0.2, maxTokens: 700 }
  );

  const known = new Set(rows.map((r) => r.slug));
  return {
    slugs: (result.slugs ?? []).filter((s) => known.has(s)).slice(0, limit),
    reasoning: result.reasoning ?? "",
  };
}

// ---------------------------------------------------------------------------
// "What should I watch before X?"
// ---------------------------------------------------------------------------

export type PrereqResult = {
  essential: string[];
  helpful: string[];
  explanation: string;
};

export async function watchPrereqs(slug: string): Promise<PrereqResult> {
  const rows = await catalogIndex();
  const target = rows.find((r) => r.slug === slug);
  if (!target) throw new Error(`Unknown title: ${slug}`);

  const result = await chatJson<{
    essential?: string[];
    helpful?: string[];
    explanation?: string;
  }>(
    [
      { role: "system", content: GROUNDING_RULES },
      {
        role: "user",
        content: `CATALOG:
${renderIndex(rows)}

TARGET: ${target.slug} — ${target.name} (${target.year})

Which titles must a viewer watch first for ${target.name} to land, and
which merely enrich it? "essential" = the plot or emotional payoff breaks
without it. "helpful" = adds context or callbacks. Exclude the target
itself. Order both lists in the best viewing order.

Return JSON: { "essential": string[], "helpful": string[], "explanation": string }
"explanation" = 2-3 sentences, spoiler-free, addressed to the viewer.`,
      },
    ],
    { temperature: 0.3, maxTokens: 1600 }
  );

  const known = new Set(rows.map((r) => r.slug));
  const clean = (list?: string[]) =>
    (list ?? []).filter((s) => known.has(s) && s !== slug);

  return {
    essential: clean(result.essential),
    helpful: clean(result.helpful),
    explanation: result.explanation ?? "",
  };
}

// ---------------------------------------------------------------------------
// Spoiler-free recap
// ---------------------------------------------------------------------------

/**
 * Recaps the story *leading up to* a title without spoiling the title
 * itself. The model is given only the titles that precede it in the
 * timeline, which structurally limits what it can spoil.
 */
export async function spoilerFreeRecap(slug: string): Promise<string> {
  const title = await db.title.findUnique({
    where: { slug },
    select: { name: true, chronoOrder: true, franchise: true, overview: true },
  });
  if (!title) throw new Error(`Unknown title: ${slug}`);

  const priorTitles = await db.title.findMany({
    where: {
      franchise: title.franchise,
      chronoOrder: title.chronoOrder ? { lt: title.chronoOrder } : undefined,
    },
    orderBy: { chronoOrder: "asc" },
    select: { name: true, chronoNote: true },
    take: 40,
  });

  return chat(
    [
      {
        role: "system",
        content: `You write spoiler-free "previously on" recaps for a Marvel
catalog app. Absolute rule: never reveal any plot point from the title the
viewer is about to watch — not its twists, not its ending, not who dies,
not the post-credits scene. Recap only what came BEFORE. Write with energy,
in second person, as flowing prose. No bullet points, no headings.`,
      },
      {
        role: "user",
        content: `The viewer is about to watch: ${title.name}

Titles that precede it in the in-universe timeline:
${priorTitles.map((t) => `- ${t.name}${t.chronoNote ? ` (${t.chronoNote})` : ""}`).join("\n")}

Write a 150-200 word recap of where the story stands going in. Cover the
threads that matter for this specific title and skip the rest.`,
      },
    ],
    { temperature: 0.6, maxTokens: 1200 }
  );
}

// ---------------------------------------------------------------------------
// Character arc
// ---------------------------------------------------------------------------

export type ArcResult = {
  summary: string;
  beats: { slug: string; beat: string }[];
};

export async function characterArc(characterSlug: string): Promise<ArcResult> {
  const character = await db.character.findUnique({
    where: { slug: characterSlug },
    select: {
      name: true,
      realName: true,
      appearances: {
        select: {
          role: true,
          title: {
            select: { slug: true, name: true, releaseDate: true, chronoOrder: true },
          },
        },
      },
    },
  });
  if (!character) throw new Error(`Unknown character: ${characterSlug}`);

  // Order by in-universe time where known, release date otherwise.
  const appearances = character.appearances
    .map((a) => a.title)
    .sort((a, b) => {
      if (a.chronoOrder != null && b.chronoOrder != null) return a.chronoOrder - b.chronoOrder;
      if (a.chronoOrder != null) return -1;
      if (b.chronoOrder != null) return 1;
      return (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0);
    });

  if (appearances.length === 0) {
    return { summary: `No catalogued appearances for ${character.name} yet.`, beats: [] };
  }

  const result = await chatJson<{
    summary?: string;
    beats?: { slug?: string; beat?: string }[];
  }>(
    [
      {
        role: "system",
        content: `You are a Marvel continuity expert. You trace a single
character's arc across the titles they appear in. You may only reference
the slugs provided. Be concrete about the emotional throughline, not just
plot events.`,
      },
      {
        role: "user",
        content: `CHARACTER: ${character.name}${
          character.realName ? ` (${character.realName})` : ""
        }

APPEARANCES, in in-universe order:
${appearances.map((t) => `${t.slug} | ${t.name}`).join("\n")}

Return JSON:
{
  "summary": string,
  "beats": [{ "slug": string, "beat": string }]
}

"summary" = 3-4 sentences on the whole arc: who they start as, who they
become. "beats" = one entry per appearance above, in the same order, each
with a single sentence on what that title does to this character. Use the
exact slugs given.`,
      },
    ],
    { temperature: 0.5, maxTokens: Math.min(8192, 1800 + appearances.length * 220) }
  );

  const known = new Set(appearances.map((t) => t.slug));
  return {
    summary: result.summary ?? "",
    beats: (result.beats ?? [])
      .filter((b): b is { slug: string; beat: string } =>
        Boolean(b.slug && b.beat && known.has(b.slug))
      )
      .map((b) => ({ slug: b.slug, beat: b.beat })),
  };
}

export type NamedArcResult = {
  summary: string;
  beats: { slug: string; beat: string; name: string }[];
};

export async function namedCharacterArc(characterSlug: string): Promise<NamedArcResult> {
  const arc = await characterArc(characterSlug);
  const titles = await getTitlesBySlugs(arc.beats.map((b) => b.slug));
  const nameBySlug = new Map(titles.map((t) => [t.slug, t.name]));
  return {
    summary: arc.summary,
    beats: arc.beats.map((b) => ({
      slug: b.slug,
      beat: b.beat,
      name: nameBySlug.get(b.slug) ?? b.slug,
    })),
  };
}

const JSON_GATE = "<<<JSON>>>";
const STREAM_TAIL = `When the prose is finished, output a line containing exactly ${JSON_GATE}
then a JSON object and nothing else. Never mention that marker in the prose.`;

async function* proseThenJson<T>(
  messages: ChatMessage[],
  options: Omit<ChatOptions, "json"> = {}
): AsyncGenerator<{ type: "text"; text: string } | { type: "json"; value: T }> {
  let hold = "";
  let mode: "text" | "json" = "text";
  let full = "";

  for await (const chunk of chatStream(messages, options)) {
    full += chunk;
    if (mode === "json") {
      hold += chunk;
      continue;
    }
    hold += chunk;
    const idx = hold.indexOf(JSON_GATE);
    if (idx >= 0) {
      const before = hold.slice(0, idx);
      if (before) yield { type: "text", text: before };
      hold = hold.slice(idx + JSON_GATE.length);
      mode = "json";
    } else {
      const keep = JSON_GATE.length - 1;
      if (hold.length > keep) {
        yield { type: "text", text: hold.slice(0, -keep) };
        hold = hold.slice(-keep);
      }
    }
  }

  if (mode === "text") {
    if (hold) yield { type: "text", text: hold };
    const extracted = extractJsonObject(full);
    if (extracted) {
      try {
        yield { type: "json", value: JSON.parse(extracted) as T };
      } catch {
        /* prose-only response */
      }
    }
    return;
  }

  const extracted = extractJsonObject(hold) ?? hold.trim();
  try {
    yield { type: "json", value: JSON.parse(extracted) as T };
  } catch {
    const fallback = extractJsonObject(full);
    if (fallback) yield { type: "json", value: JSON.parse(fallback) as T };
  }
}

export async function* streamNlSearch(
  query: string,
  limit = 12
): AsyncGenerator<{ type: "text"; text: string } | { type: "result"; slugs: string[]; reasoning: string }> {
  const rows = await catalogIndex();
  let reasoning = "";
  let slugs: string[] = [];

  for await (const ev of proseThenJson<{ slugs?: string[] }>(
    [
      { role: "system", content: GROUNDING_RULES },
      {
        role: "user",
        content: `CATALOG:
${renderIndex(rows)}

QUERY: ${query}

Write one short sentence for a fan explaining the match (no JSON, no slug list).
${STREAM_TAIL}
JSON shape: { "slugs": string[] }
Cap "slugs" at ${limit}. Only slugs from the CATALOG.`,
      },
    ],
    { temperature: 0.2, maxTokens: 900 }
  )) {
    if (ev.type === "text") {
      reasoning += ev.text;
      yield { type: "text", text: ev.text };
    } else {
      const known = new Set(rows.map((r) => r.slug));
      slugs = (ev.value.slugs ?? []).filter((s) => known.has(s)).slice(0, limit);
    }
  }

  yield { type: "result", slugs, reasoning: reasoning.trim() };
}

export async function* streamWatchPrereqs(
  slug: string
): AsyncGenerator<
  { type: "text"; text: string } | { type: "result"; essential: string[]; helpful: string[]; explanation: string }
> {
  const rows = await catalogIndex();
  const target = rows.find((r) => r.slug === slug);
  if (!target) throw new Error(`Unknown title: ${slug}`);

  let explanation = "";
  let essential: string[] = [];
  let helpful: string[] = [];
  const known = new Set(rows.map((r) => r.slug));
  const clean = (list?: string[]) => (list ?? []).filter((s) => known.has(s) && s !== slug);

  for await (const ev of proseThenJson<{ essential?: string[]; helpful?: string[] }>(
    [
      { role: "system", content: GROUNDING_RULES },
      {
        role: "user",
        content: `CATALOG:
${renderIndex(rows)}

TARGET: ${target.slug} — ${target.name} (${target.year})

Write 2-3 spoiler-free sentences telling the viewer what to watch first.
${STREAM_TAIL}
JSON shape: { "essential": string[], "helpful": string[] }
"essential" = the payoff breaks without it. "helpful" = extra context.
Exclude the target. Only slugs from the CATALOG.`,
      },
    ],
    { temperature: 0.3, maxTokens: 1600 }
  )) {
    if (ev.type === "text") {
      explanation += ev.text;
      yield { type: "text", text: ev.text };
    } else {
      essential = clean(ev.value.essential);
      helpful = clean(ev.value.helpful);
    }
  }

  yield { type: "result", essential, helpful, explanation: explanation.trim() };
}

export async function* streamSpoilerFreeRecap(slug: string): AsyncGenerator<string> {
  const title = await db.title.findUnique({
    where: { slug },
    select: { name: true, chronoOrder: true, franchise: true },
  });
  if (!title) throw new Error(`Unknown title: ${slug}`);

  const priorTitles = await db.title.findMany({
    where: {
      franchise: title.franchise,
      chronoOrder: title.chronoOrder ? { lt: title.chronoOrder } : undefined,
    },
    orderBy: { chronoOrder: "asc" },
    select: { name: true, chronoNote: true },
    take: 40,
  });

  yield* chatStream(
    [
      {
        role: "system",
        content: `You write spoiler-free "previously on" recaps for a Marvel
catalog app. Absolute rule: never reveal any plot point from the title the
viewer is about to watch — not its twists, not its ending, not who dies,
not the post-credits scene. Recap only what came BEFORE. Write with energy,
in second person, as flowing prose. No bullet points, no headings.`,
      },
      {
        role: "user",
        content: `The viewer is about to watch: ${title.name}

Titles that precede it in the in-universe timeline:
${priorTitles.map((t) => `- ${t.name}${t.chronoNote ? ` (${t.chronoNote})` : ""}`).join("\n")}

Write a 150-200 word recap of where the story stands going in. Cover the
threads that matter for this specific title and skip the rest.`,
      },
    ],
    { temperature: 0.6, maxTokens: 1200 }
  );
}

export async function* streamCharacterArc(characterSlug: string): AsyncGenerator<
  | { type: "text"; text: string }
  | { type: "result"; summary: string; beats: { slug: string; beat: string }[] }
> {
  const character = await db.character.findUnique({
    where: { slug: characterSlug },
    select: {
      name: true,
      realName: true,
      appearances: {
        select: {
          title: {
            select: { slug: true, name: true, releaseDate: true, chronoOrder: true },
          },
        },
      },
    },
  });
  if (!character) throw new Error(`Unknown character: ${characterSlug}`);

  const appearances = character.appearances
    .map((a) => a.title)
    .sort((a, b) => {
      if (a.chronoOrder != null && b.chronoOrder != null) return a.chronoOrder - b.chronoOrder;
      if (a.chronoOrder != null) return -1;
      if (b.chronoOrder != null) return 1;
      return (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0);
    });

  if (appearances.length === 0) {
    const summary = `No catalogued appearances for ${character.name} yet.`;
    yield { type: "text", text: summary };
    yield { type: "result", summary, beats: [] };
    return;
  }

  let summary = "";
  let beats: { slug: string; beat: string }[] = [];
  const known = new Set(appearances.map((t) => t.slug));

  for await (const ev of proseThenJson<{ beats?: { slug?: string; beat?: string }[] }>(
    [
      {
        role: "system",
        content: `You are a Marvel continuity expert. You trace a single
character's arc across the titles they appear in. You may only reference
the slugs provided. Be concrete about the emotional throughline, not just
plot events.`,
      },
      {
        role: "user",
        content: `CHARACTER: ${character.name}${
          character.realName ? ` (${character.realName})` : ""
        }

APPEARANCES, in in-universe order:
${appearances.map((t) => `${t.slug} | ${t.name}`).join("\n")}

Write 3-4 sentences on the whole arc: who they start as, who they become.
${STREAM_TAIL}
JSON shape: { "beats": [{ "slug": string, "beat": string }] }
One beat per appearance above, same order, exact slugs, one sentence each.`,
      },
    ],
    { temperature: 0.5, maxTokens: Math.min(8192, 1800 + appearances.length * 220) }
  )) {
    if (ev.type === "text") {
      summary += ev.text;
      yield { type: "text", text: ev.text };
    } else {
      beats = (ev.value.beats ?? [])
        .filter((b): b is { slug: string; beat: string } =>
          Boolean(b.slug && b.beat && known.has(b.slug))
        )
        .map((b) => ({ slug: b.slug, beat: b.beat }));
    }
  }

  yield { type: "result", summary: summary.trim(), beats };
}
