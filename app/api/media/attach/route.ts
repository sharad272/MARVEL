import { NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import { stat } from "node:fs/promises";
import { db } from "@/lib/db";
import { getMediaRoot, isInsideRoot } from "@/lib/media/root";

export const dynamic = "force-dynamic";

const VIDEO_EXT = new Set([
  "mp4",
  "mkv",
  "avi",
  "mov",
  "m4v",
  "webm",
  "m2ts",
  "ts",
  "wmv",
  "flv",
  "mpg",
  "mpeg",
  "m3u8",
]);

const schema = z.object({
  titleId: z.string().min(1),
  path: z.string().min(1).max(1000),
  episodeId: z.string().nullish(),
});

/**
 * Manually link a file the user owns to a catalog title. matchScore is
 * left null so a later folder scan will not overwrite the link.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "titleId and path are required" }, { status: 400 });
  }

  const root = await getMediaRoot();
  if (!root) {
    return NextResponse.json(
      { error: "Set a media folder in Settings first." },
      { status: 400 }
    );
  }

  const filePath = path.resolve(parsed.data.path.trim());
  if (!isInsideRoot(filePath, root)) {
    return NextResponse.json(
      { error: `File must live inside your media folder:\n${root}` },
      { status: 403 }
    );
  }

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    return NextResponse.json({ error: "That file is not on disk." }, { status: 400 });
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!VIDEO_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Unsupported container .${ext}. Use mp4, mkv, webm or similar.` },
      { status: 400 }
    );
  }

  const title = await db.title.findUnique({
    where: { id: parsed.data.titleId },
    select: { id: true },
  });
  if (!title) return NextResponse.json({ error: "Unknown title" }, { status: 404 });

  const fileName = path.basename(filePath);
  const media = await db.localMedia.upsert({
    where: { path: filePath },
    update: {
      titleId: title.id,
      episodeId: parsed.data.episodeId ?? null,
      fileName,
      sizeBytes: BigInt(info.size),
      container: ext,
      matchScore: null,
    },
    create: {
      path: filePath,
      titleId: title.id,
      episodeId: parsed.data.episodeId ?? null,
      fileName,
      sizeBytes: BigInt(info.size),
      container: ext,
      matchScore: null,
    },
  });

  return NextResponse.json({
    ok: true,
    id: media.id,
    fileName: media.fileName,
  });
}
