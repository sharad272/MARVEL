import { NextResponse } from "next/server";
import { hasLlm, llmJsonError } from "@/lib/llm/groq";
import { earthBriefing, isBriefingId } from "@/lib/llm/multiverse";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "search");
  if (limited) return limited;

  const id = new URL(request.url).searchParams.get("earth")?.trim() ?? "";
  if (!isBriefingId(id)) {
    return NextResponse.json({ error: "Unknown earth" }, { status: 400, headers: NO_STORE });
  }
  if (!hasLlm()) {
    return NextResponse.json(
      { error: "No LLM API key configured." },
      { status: 503, headers: NO_STORE }
    );
  }

  try {
    const briefing = await earthBriefing(id);
    return NextResponse.json(briefing, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    const { status, body } = llmJsonError(e);
    return NextResponse.json(body, { status, headers: NO_STORE });
  }
}
