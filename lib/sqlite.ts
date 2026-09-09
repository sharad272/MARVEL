import fs from "node:fs";
import path from "node:path";
import { DB_BASE64 } from "./generated/db-blob";

/**
 * Prisma reads DATABASE_URL at client init. On Vercel the bundle's
 * filesystem is read-only, so this stages a writable copy into /tmp
 * before Prisma connects — first by copying the bundled file, in case
 * outputFileTracingIncludes picked it up, otherwise from an embedded
 * base64 snapshot that's guaranteed to be in the JS bundle (it's a real
 * import, not a traced filesystem asset — see
 * scripts/generate-db-blob.mjs, which keeps it fresh).
 */
export function prepareSqliteUrl() {
  const raw = process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
  process.env.DATABASE_URL = raw;

  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) return;

  const rel = raw.replace(/^file:(\/\/)?/, "");
  const src = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  const dest = "/tmp/marvelverse.db";

  try {
    if (fs.existsSync(dest)) {
      // Already staged by an earlier request on this warm instance.
      process.env.DATABASE_URL = `file:${dest}`;
      return;
    }

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      process.env.DATABASE_URL = `file:${dest}`;
      return;
    }

    if (!DB_BASE64) {
      console.error(
        `[sqlite] bundled db not found at "${src}" (cwd="${process.cwd()}") and no embedded snapshot is available`
      );
      return;
    }

    fs.writeFileSync(dest, Buffer.from(DB_BASE64, "base64"));
    process.env.DATABASE_URL = `file:${dest}`;
    console.warn(`[sqlite] staged db from embedded snapshot (bundled file missing at "${src}")`);
  } catch (err) {
    console.error("[sqlite] failed to stage db into /tmp:", err);
  }
}
