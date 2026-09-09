import { NextResponse } from "next/server";
import { searchTitles } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Instant substring search. No LLM, so it can run on every keystroke. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ titles: [] });

  const titles = await searchTitles(q, 30);
  return NextResponse.json({ titles });
}
