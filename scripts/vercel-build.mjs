/**
 * Production build. Prisma CLI requires DATABASE_URL in the environment;
 * Vercel does not always inject vercel.json `env` before `npm run build`.
 */
import { spawnSync } from "node:child_process";

// Must match prisma/schema.prisma's resolution (relative to prisma/, not
// cwd) — see lib/sqlite.ts and scripts/generate-db-blob.mjs for why this
// exact value matters.
process.env.DATABASE_URL ||= "file:./dev.db";

const steps = [
  ["npx", "prisma", "generate"],
  ["npx", "prisma", "db", "push"],
  // Early pass: lib/sqlite.ts imports the generated blob module at the
  // top level, and refresh-catalog.ts pulls that in transitively (via
  // lib/db.ts) — on a fresh checkout the module doesn't exist yet
  // without this, so seed/refresh below would fail to even load.
  ["node", "scripts/generate-db-blob.mjs"],
  ["npx", "tsx", "scripts/seed.ts"],
  ["npx", "tsx", "scripts/refresh-catalog.ts"],
  // Final pass: re-embed now that seeding/refresh finished, so the
  // snapshot that actually ships matches the fully-populated db.
  ["node", "scripts/generate-db-blob.mjs"],
  ["npx", "next", "build"],
];

for (const [cmd, ...args] of steps) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  const code = result.status ?? 1;
  if (code !== 0) process.exit(code);
}
