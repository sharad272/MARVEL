/**
 * In-memory sliding window, per serverless instance.
 *
 * This will not coordinate across Vercel regions — that's a Redis job —
 * but it still stops one client from burning Groq/HF quota or flooding
 * SQLite writes from a single warm lambda.
 */

import { NextResponse } from "next/server";

type Window = { hits: number[]; pruneAt: number };

const buckets = new Map<string, Window>();
const MAX_KEYS = 4000;

export const LIMITS = {
  llm: { limit: 15, windowMs: 10 * 60 * 1000 },
  search: { limit: 120, windowMs: 60 * 1000 },
  write: { limit: 120, windowMs: 60 * 1000 },
} as const;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "anon";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  const hits = (current?.hits ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((hits[0]! + windowMs - now) / 1000));
    buckets.set(key, { hits, pruneAt: now + windowMs });
    return { ok: false, retryAfterSec };
  }

  hits.push(now);
  buckets.set(key, { hits, pruneAt: now + windowMs });

  if (buckets.size > MAX_KEYS) {
    for (const [k, w] of buckets) {
      if (w.pruneAt < now) buckets.delete(k);
    }
    if (buckets.size > MAX_KEYS) {
      const overflow = buckets.size - MAX_KEYS;
      let dropped = 0;
      for (const k of buckets.keys()) {
        buckets.delete(k);
        if (++dropped >= overflow) break;
      }
    }
  }

  return { ok: true };
}

export function enforceRateLimit(
  request: Request,
  kind: keyof typeof LIMITS
): NextResponse | null {
  const { limit, windowMs } = LIMITS[kind];
  const result = rateLimit(`${kind}:${clientIp(request)}`, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    {
      error: `Too many requests. Try again in about ${result.retryAfterSec} seconds.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "Cache-Control": "no-store",
      },
    }
  );
}
