import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { LIBRARY_STATUS } from "@/lib/constants";

const schema = z.object({
  titleId: z.string().min(1),
  status: z.enum([
    LIBRARY_STATUS.WATCHLIST,
    LIBRARY_STATUS.WATCHING,
    LIBRARY_STATUS.WATCHED,
    LIBRARY_STATUS.DROPPED,
  ]).nullish(),
  favorite: z.boolean().optional(),
  rating: z.number().int().min(1).max(10).nullish(),
  note: z.string().max(2000).nullish(),
});

export async function POST(request: Request) {
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

  const { titleId, ...patch } = parsed.data;

  const title = await db.title.findUnique({ where: { id: titleId }, select: { id: true } });
  if (!title) return NextResponse.json({ error: "Unknown title" }, { status: 404 });

  const existing = await db.libraryEntry.findUnique({ where: { titleId } });

  // Clearing the status with nothing else set means "remove from library"
  // rather than "store a row with a null status".
  const clearing =
    patch.status === null &&
    patch.favorite === undefined &&
    patch.rating === undefined &&
    patch.note === undefined;

  if (clearing) {
    if (existing && !existing.favorite) {
      await db.libraryEntry.delete({ where: { titleId } });
      return NextResponse.json({ ok: true, entry: null });
    }
    if (existing) {
      // Keep the row alive to preserve the favourite flag.
      const entry = await db.libraryEntry.update({
        where: { titleId },
        data: { status: LIBRARY_STATUS.WATCHLIST },
      });
      return NextResponse.json({ ok: true, entry });
    }
    return NextResponse.json({ ok: true, entry: null });
  }

  const entry = await db.libraryEntry.upsert({
    where: { titleId },
    update: {
      ...(patch.status !== undefined && patch.status !== null ? { status: patch.status } : {}),
      ...(patch.favorite !== undefined ? { favorite: patch.favorite } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
    },
    create: {
      titleId,
      status: patch.status ?? LIBRARY_STATUS.WATCHLIST,
      favorite: patch.favorite ?? false,
      rating: patch.rating ?? null,
      note: patch.note ?? null,
    },
  });

  return NextResponse.json({ ok: true, entry });
}

export async function GET() {
  const entries = await db.libraryEntry.findMany({
    orderBy: { updatedAt: "desc" },
    include: { title: { select: { slug: true, name: true, posterPath: true } } },
  });
  return NextResponse.json({ entries });
}
