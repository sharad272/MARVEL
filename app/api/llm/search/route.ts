import { NextResponse } from "next/server";
import { z } from "zod";
import { nlSearch } from "@/lib/llm/features";
import { getTitlesBySlugs } from "@/lib/queries";
import { hasLlm, llmJsonError } from "@/lib/llm/groq";

export const dynamic = "force-dynamic";
/** Reasoning models are not instant; give them room past the default. */
export const maxDuration = 60;

const schema = z.object({
  query: z.string().min(2).max(400),
  limit: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  if (!hasLlm()) {
    return NextResponse.json(
      { error: "No LLM API key configured. Plain text search still works." },
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
    return NextResponse.json({ error: "A query of at least 2 characters is required" }, { status: 400 });
  }

  try {
    const { slugs, reasoning } = await nlSearch(parsed.data.query, parsed.data.limit ?? 12);
    const titles = await getTitlesBySlugs(slugs);
    return NextResponse.json({ titles, reasoning });
  } catch (e) {
    const { status, body } = llmJsonError(e);
    return NextResponse.json(body, { status });
  }
}
