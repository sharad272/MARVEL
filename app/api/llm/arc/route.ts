import { NextResponse } from "next/server";
import { namedCharacterArc, streamCharacterArc } from "@/lib/llm/features";
import { getTitlesBySlugs } from "@/lib/queries";
import { hasLlm, llmJsonError } from "@/lib/llm/groq";
import { toSseResponse } from "@/lib/llm/sse";
import { enforceRateLimit } from "@/lib/rate-limit";
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

async function* arcEvents(slug: string): AsyncGenerator<LlmStreamEvent> {
  let beats: { slug: string; beat: string }[] = [];
  for await (const ev of streamCharacterArc(slug)) {
    if (ev.type === "text") yield { type: "delta", field: "answer", text: ev.text };
    else beats = ev.beats;
  }
  const titles = await getTitlesBySlugs(beats.map((b) => b.slug));
  const nameBySlug = new Map(titles.map((t) => [t.slug, t.name]));
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
  yield { type: "done" };
}

async function respondJson(slug: string) {
  if (!hasLlm()) return json({ error: "No LLM API key configured." }, 503);
  try {
    return json(await namedCharacterArc(slug));
  } catch (e) {
    const { status, body } = llmJsonError(e);
    return json(body, status);
  }
}

function readSlug(request: Request) {
  return new URL(request.url).searchParams.get("slug")?.trim() ?? "";
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "llm");
  if (limited) return limited;
  const slug = readSlug(request);
  if (!slug) return json({ error: "slug is required" }, 400);
  const stream = request.headers.get("accept")?.includes("text/event-stream");
  if (stream) {
    if (!hasLlm()) return json({ error: "No LLM API key configured." }, 503);
    return toSseResponse(arcEvents(slug));
  }
  return respondJson(slug);
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "llm");
  if (limited) return limited;
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
    return toSseResponse(arcEvents(slug));
  }
  return respondJson(slug);
}
