import { NextResponse } from "next/server";
import { getCodexEntry } from "@/lib/codex";
import { hasLlm, llmJsonError } from "@/lib/llm/groq";
import { codexFreeform, codexProfile, codexVersus } from "@/lib/llm/codex";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const SHARED = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * GET ?key=<codex key>          profile for a known character
 * GET ?name=<free text>         profile for anyone else
 * GET ?a=<key>&b=<key>          who would win
 *
 * Profiles of known characters are a bounded set and cached, so they use
 * the generous search limit; free text and matchups are open-ended and
 * use the LLM limit.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get("key")?.trim() ?? "";
  const name = params.get("name")?.trim() ?? "";
  const a = params.get("a")?.trim() ?? "";
  const b = params.get("b")?.trim() ?? "";

  const limited = enforceRateLimit(request, key ? "search" : "llm");
  if (limited) return limited;
  if (!hasLlm()) return fail("No LLM API key configured.", 503);

  try {
    if (a && b) {
      if (a === b) return fail("Pick two different characters.", 400);
      if (!getCodexEntry(a) || !getCodexEntry(b)) return fail("Unknown character", 400);
      return NextResponse.json(await codexVersus(a, b), { headers: SHARED });
    }
    if (key) {
      if (!getCodexEntry(key)) return fail("Unknown character", 400);
      return NextResponse.json(await codexProfile(key), { headers: SHARED });
    }
    if (name) {
      if (name.length < 2 || name.length > 60) return fail("Name must be 2-60 characters.", 400);
      return NextResponse.json(await codexFreeform(name), { headers: SHARED });
    }
    return fail("key, name, or a+b is required", 400);
  } catch (e) {
    const { status, body } = llmJsonError(e);
    return NextResponse.json(body, { status, headers: NO_STORE });
  }
}
