import fs from "node:fs";
import { DB_BASE64 } from "./generated/db-blob";

/**
 * Prisma reads DATABASE_URL at client init. On Vercel the bundle's
 * filesystem is read-only, so this stages a writable copy into /tmp
 * before Prisma connects, decoded straight from an embedded base64
 * snapshot that's guaranteed to be in the JS bundle (it's a real
 * import, not a traced filesystem asset — see
 * scripts/generate-db-blob.mjs, which keeps it fresh on every build).
 *
 * We intentionally don't try to locate/copy a "bundled" prisma/dev.db
 * file directly: outputFileTracingIncludes proved unreliable at
 * actually landing it in the deployed function, and separately,
 * Prisma resolves a relative `file:` DATABASE_URL against
 * prisma/schema.prisma's directory while a naive guess here would
 * rebase it onto process.cwd() instead — those two disagree unless
 * DATABASE_URL is exactly "file:./dev.db" everywhere. Both problems
 * caused real production outages, so the embedded blob is the sole
 * source of truth on serverless; there's nothing left to mismatch.
 */
export function prepareSqliteUrl() {
  const raw = process.env.DATABASE_URL?.trim() || "file:./dev.db";
  process.env.DATABASE_URL = withSqliteParams(raw);

  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) return;

  const dest = "/tmp/marvelverse.db";

  try {
    if (fs.existsSync(dest)) {
      // Already staged by an earlier request on this warm instance.
      process.env.DATABASE_URL = withSqliteParams(`file:${dest}`);
      return;
    }

    if (!DB_BASE64) {
      console.error(
        "[sqlite] no embedded db snapshot available — lib/generated/db-blob.ts is empty (did scripts/generate-db-blob.mjs run?)"
      );
      return;
    }

    fs.writeFileSync(dest, Buffer.from(DB_BASE64, "base64"));
    process.env.DATABASE_URL = withSqliteParams(`file:${dest}`);
  } catch (err) {
    console.error("[sqlite] failed to stage db into /tmp:", err);
  }
}

/** Prisma's SQLite driver is not a pool — one connection per client. */
function withSqliteParams(url: string): string {
  if (url.includes("connection_limit=")) return url;
  return url.includes("?") ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
}
