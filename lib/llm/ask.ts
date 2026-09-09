/**
 * Shared Ask-the-Watcher runner used by the API route and the /ask page.
 * Grounds every answer on the local catalog, then returns a payload the
 * client can render without a second round-trip.
 */

import { db } from "@/lib/db";
import {
  nlSearch,
  watchPrereqs,
  spoilerFreeRecap,
  characterArc,
  streamNlSearch,
  streamWatchPrereqs,
  streamSpoilerFreeRecap,
  streamCharacterArc,
} from "@/lib/llm/features";
import { resolveIntent } from "@/lib/llm/intent";
import { getTitlesBySlugs, type TitleCard } from "@/lib/queries";
import type { LlmStreamEvent } from "@/lib/llm/events";

export type AskBeat = { slug: string; beat: string; name?: string };

export type AskPayload = {
  kind: "search" | "prereqs" | "arc";
  answer: string;
  recap?: string;
  titles: TitleCard[];
  essential?: TitleCard[];
  helpful?: TitleCard[];
  beats?: AskBeat[];
  slug?: string;
  name?: string;
  followups?: string[];
};

const SUGGESTED_FALLBACK = [
  "The one where Cap fights Tony",
  "What do I need to watch before Endgame?",
];

export async function runAsk(query: string): Promise<AskPayload> {
  const catalog = await db.title.findMany({
    select: { slug: true, name: true },
    orderBy: { releaseDate: "asc" },
  });
  const intent = resolveIntent(query, catalog);

  if (intent.kind === "prereqs") {
    const [recap, prereqs] = await Promise.all([
      spoilerFreeRecap(intent.slug),
      watchPrereqs(intent.slug),
    ]);
    const [essential, helpful] = await Promise.all([
      getTitlesBySlugs(prereqs.essential),
      getTitlesBySlugs(prereqs.helpful),
    ]);
    return {
      kind: "prereqs",
      slug: intent.slug,
      name: intent.name,
      answer: prereqs.explanation,
      recap,
      essential,
      helpful,
      titles: [...essential, ...helpful],
      followups: [
        `Play the ${intent.name} trailer`,
        `Everything with the same characters as ${intent.name}`,
      ],
    };
  }

  if (intent.kind === "arc") {
    const arc = await characterArc(intent.slug);
    const beatTitles = await getTitlesBySlugs(arc.beats.map((b) => b.slug));
    const nameBySlug = new Map(beatTitles.map((t) => [t.slug, t.name]));
    return {
      kind: "arc",
      slug: intent.slug,
      name: intent.name,
      answer: arc.summary,
      beats: arc.beats.map((b) => ({
        slug: b.slug,
        beat: b.beat,
        name: nameBySlug.get(b.slug) ?? b.slug,
      })),
      titles: beatTitles,
      followups: [
        `What should I watch before the latest ${intent.name} title?`,
        `Everything with ${intent.name}`,
      ],
    };
  }

  const { slugs, reasoning } = await nlSearch(query, 12);
  const titles = await getTitlesBySlugs(slugs);
  return {
    kind: "search",
    answer: reasoning,
    titles,
    followups: titles[0]
      ? [`What do I need to watch before ${titles[0].name}?`, "Give me the funniest Marvel films"]
      : SUGGESTED_FALLBACK,
  };
}

export async function* runAskStream(query: string): AsyncGenerator<LlmStreamEvent> {
  const catalog = await db.title.findMany({
    select: { slug: true, name: true },
    orderBy: { releaseDate: "asc" },
  });
  const intent = resolveIntent(query, catalog);

  if (intent.kind === "prereqs") {
    yield { type: "kind", kind: "prereqs", slug: intent.slug, name: intent.name };

    for await (const chunk of streamSpoilerFreeRecap(intent.slug)) {
      yield { type: "delta", field: "recap", text: chunk };
    }

    let essential: string[] = [];
    let helpful: string[] = [];
    for await (const ev of streamWatchPrereqs(intent.slug)) {
      if (ev.type === "text") yield { type: "delta", field: "answer", text: ev.text };
      else {
        essential = ev.essential;
        helpful = ev.helpful;
      }
    }

    const [essentialTitles, helpfulTitles] = await Promise.all([
      getTitlesBySlugs(essential),
      getTitlesBySlugs(helpful),
    ]);
    if (essentialTitles.length) yield { type: "titles", role: "essential", titles: essentialTitles };
    if (helpfulTitles.length) yield { type: "titles", role: "helpful", titles: helpfulTitles };
    yield {
      type: "done",
      followups: [
        `Play the ${intent.name} trailer`,
        `Everything with the same characters as ${intent.name}`,
      ],
    };
    return;
  }

  if (intent.kind === "arc") {
    yield { type: "kind", kind: "arc", slug: intent.slug, name: intent.name };
    let beats: { slug: string; beat: string }[] = [];
    for await (const ev of streamCharacterArc(intent.slug)) {
      if (ev.type === "text") yield { type: "delta", field: "answer", text: ev.text };
      else beats = ev.beats;
    }
    const beatTitles = await getTitlesBySlugs(beats.map((b) => b.slug));
    const nameBySlug = new Map(beatTitles.map((t) => [t.slug, t.name]));
    if (beats.length) {
      yield {
        type: "beats",
        beats: beats.map((b) => ({
          slug: b.slug,
          beat: b.beat,
          name: nameBySlug.get(b.slug) ?? b.slug,
        })),
      };
    }
    yield {
      type: "done",
      followups: [
        `What should I watch before the latest ${intent.name} title?`,
        `Everything with ${intent.name}`,
      ],
    };
    return;
  }

  yield { type: "kind", kind: "search" };
  let slugs: string[] = [];
  for await (const ev of streamNlSearch(query, 12)) {
    if (ev.type === "text") yield { type: "delta", field: "answer", text: ev.text };
    else slugs = ev.slugs;
  }
  const titles = await getTitlesBySlugs(slugs);
  if (titles.length) yield { type: "titles", role: "results", titles };
  yield {
    type: "done",
    followups: titles[0]
      ? [`What do I need to watch before ${titles[0].name}?`, "Give me the funniest Marvel films"]
      : SUGGESTED_FALLBACK,
  };
}
