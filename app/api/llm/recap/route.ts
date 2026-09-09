import { NextResponse } from "next/server";
import {
  spoilerFreeRecap,
  watchPrereqs,
  streamSpoilerFreeRecap,
  streamWatchPrereqs,
} from "@/lib/llm/features";
import { getTitlesBySlugs } from "@/lib/queries";
import { hasLlm, LlmUnavailableError } from "@/lib/llm/groq";
import { toSseResponse } from "@/lib/llm/sse";
import type { LlmStreamEvent } from "@/lib/llm/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 90;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

async function* recapEvents(slug: string): AsyncGenerator<LlmStreamEvent> {
  for await (const chunk of streamSpoilerFreeRecap(slug)) {
    yield { type: "delta", field: "recap", text: chunk };
  }

  let essential: string[] = [];
  let helpful: string[] = [];
  for await (const ev of streamWatchPrereqs(slug)) {
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
  yield { type: "done" };
}

async function respondJson(slug: string) {
  if (!hasLlm()) return json({ error: "No LLM API key configured." }, 503);
  try {
    const [recap, prereqs] = await Promise.all([spoilerFreeRecap(slug), watchPrereqs(slug)]);
    const [essential, helpful] = await Promise.all([
      getTitlesBySlugs(prereqs.essential),
      getTitlesBySlugs(prereqs.helpful),
    ]);
    return json({ recap, explanation: prereqs.explanation, essential, helpful });
  } catch (e) {
    if (e instanceof LlmUnavailableError) return json({ error: e.message }, 503);
    return json({ error: (e as Error).message }, 500);
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) return json({ error: "slug is required" }, 400);
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    if (!hasLlm()) return json({ error: "No LLM API key configured." }, 503);
    return toSseResponse(recapEvents(slug));
  }
  return respondJson(slug);
}

export async function POST(request: Request) {
  let slug = "";
  let stream = true;
  try {
    const body = (await request.json()) as { slug?: unknown; stream?: unknown };
    slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (body.stream === false) stream = false;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!slug) return json({ error: "slug is required" }, 400);
  if (stream) {
    if (!hasLlm()) return json({ error: "No LLM API key configured." }, 503);
    return toSseResponse(recapEvents(slug));
  }
  return respondJson(slug);
}
