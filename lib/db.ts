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
