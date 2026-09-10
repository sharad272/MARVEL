import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { maybeRefreshCatalog } from "@/lib/catalog/refresh";
import { CATALOG_TAG } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.VERCEL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await maybeRefreshCatalog(true);
  if (!result.skipped) revalidateTag(CATALOG_TAG);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
