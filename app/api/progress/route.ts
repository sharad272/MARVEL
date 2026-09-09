import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { COMPLETION_THRESHOLD } from "@/lib/constants";

const schema = z.object({
  titleId: z.string().min(1),
  episodeId: z.string().nullish(),
  videoKey: z.string().nullish(),
  positionSec: z.number().min(0),
  durationSec: z.number().min(0).nullish(),
});

export async function POST(request: Request) {
  // The player sends this via sendBeacon on page teardown, which posts a
  // Blob — so parse defensively rather than trusting the content type.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { titleId, episodeId, videoKey, positionSec, durationSec } = parsed.data;

  const completed = Boolean(
    durationSec && positionSec / durationSec >= COMPLETION_THRESHOLD
  );

  // Prisma types a compound unique as non-nullable even when its columns
  // are nullable, so `upsert` can't express "the row where episodeId IS
  // NULL". Find-then-write instead. A film, its episodes and its trailer
  // therefore keep independent resume positions.
  try {
    const existing = await db.watchProgress.findFirst({
      where: {
        titleId,
        episodeId: episodeId ?? null,
        videoKey: videoKey ?? null,
      },
      select: { id: true },
    });

    if (existing) {
      await db.watchProgress.update({
        where: { id: existing.id },
        data: { positionSec, durationSec: durationSec ?? null, completed },
      });
    } else {
      await db.watchProgress.create({
        data: {
          titleId,
          episodeId: episodeId ?? null,
          videoKey: videoKey ?? null,
          positionSec,
          durationSec: durationSec ?? null,
          completed,
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }

  // Watched titles graduate out of the watchlist automatically.
  if (completed && !videoKey) {
    await db.libraryEntry
      .updateMany({
        where: { titleId, status: { in: ["WATCHLIST", "WATCHING"] } },
        data: { status: "WATCHED" },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, completed });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get("titleId");
  if (!titleId) {
    return NextResponse.json({ error: "titleId is required" }, { status: 400 });
  }

  await db.watchProgress.deleteMany({ where: { titleId } });
  return NextResponse.json({ ok: true });
}
