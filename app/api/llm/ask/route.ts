import { NextResponse } from "next/server";
import { z } from "zod";
import { runAsk, runAskStream } from "@/lib/llm/ask";
import { hasLlm, llmJsonError } from "@/lib/llm/groq";
import { toSseResponse } from "@/lib/llm/sse";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 90;

const schema = z.object({
  query: z.string().min(2).max(400),
  stream: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json(
    { enabled: hasLlm() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "llm");
  if (limited) return limited;

  if (!hasLlm()) {
    return NextResponse.json(
      { error: "No LLM API key configured. Instant search still works." },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ask something at least 2 characters long." }, { status: 400 });
  }

  const query = parsed.data.query.trim();
  const wantsStream =
    parsed.data.stream !== false &&
    (parsed.data.stream === true ||
      (request.headers.get("accept") ?? "").includes("text/event-stream"));

  try {
    if (wantsStream) {
      return toSseResponse(runAskStream(query));
    }
    const result = await runAsk(query);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    const { status, body } = llmJsonError(e);
    return NextResponse.json(body, { status });
  }
}
