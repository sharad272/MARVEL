import { NextResponse } from "next/server";
import { z } from "zod";
import { access, stat } from "node:fs/promises";
import { getMediaRoot, setMediaRoot } from "@/lib/media/root";

export const dynamic = "force-dynamic";

export async function GET() {
  const mediaRoot = await getMediaRoot();
  return NextResponse.json({
    mediaRoot,
    fromEnv: Boolean(process.env.LOCAL_MEDIA_ROOT?.trim()),
  });
}

const schema = z.object({
  mediaRoot: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  if (process.env.LOCAL_MEDIA_ROOT?.trim()) {
    return NextResponse.json(
      { error: "LOCAL_MEDIA_ROOT is set in .env.local and cannot be overridden here." },
      { status: 409 }
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
    return NextResponse.json({ error: "A folder path is required" }, { status: 400 });
  }

  const info = await stat(parsed.data.mediaRoot).catch(() => null);
  if (!info?.isDirectory()) {
    return NextResponse.json(
      { error: "That path is not a readable folder on this machine." },
      { status: 400 }
    );
  }

  // Confirm we can actually list it — a permission error looks like an
  // empty library later and is worse than failing now.
  await access(parsed.data.mediaRoot);

  const mediaRoot = await setMediaRoot(parsed.data.mediaRoot);
  return NextResponse.json({ ok: true, mediaRoot });
}
