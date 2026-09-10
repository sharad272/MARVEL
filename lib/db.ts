import { PrismaClient } from "@prisma/client";
import { prepareSqliteUrl } from "@/lib/sqlite";

prepareSqliteUrl();

// Next.js dev server hot-reloads modules, which would otherwise open a new
// pool on every edit until SQLite runs out of connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** WAL + a busy timeout so concurrent serverless reads queue instead of failing. */
void db
  .$queryRawUnsafe("PRAGMA journal_mode=WAL")
  .then(() => db.$queryRawUnsafe("PRAGMA busy_timeout=5000"))
  .then(() => db.$queryRawUnsafe("PRAGMA synchronous=NORMAL"))
  .then(() => db.$queryRawUnsafe("PRAGMA cache_size=-8000"))
  .then(() => db.$queryRawUnsafe("PRAGMA temp_store=MEMORY"))
  .then(() => db.$queryRawUnsafe("PRAGMA foreign_keys=ON"))
  .catch(() => {
    // First tick on a cold instance can race the /tmp copy; the next
    // query still works, just without WAL until the instance is warm.
  });
