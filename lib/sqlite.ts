import fs from "node:fs";
import path from "node:path";

/**
 * Prisma reads DATABASE_URL at client init. On Vercel the bundle is
 * read-only, so we copy the seeded SQLite file into /tmp first.
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
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      process.env.DATABASE_URL = `file:${dest}`;
    }
  } catch {
    // Keep the original URL; reads may still work from the bundle.
  }
}
