import { NextResponse } from "next/server";
import { searchTitles } from "@/lib/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Instant substring search. No LLM, so it can run on every keystroke. */
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "search");
  if (limited) return limited;

  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json(
      { titles: [] },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  }

  const titles = await searchTitles(q, 30);
  return NextResponse.json(
    { titles },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
