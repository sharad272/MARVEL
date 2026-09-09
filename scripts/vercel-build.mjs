/**
 * Production build. Prisma CLI requires DATABASE_URL in the environment;
 * Vercel does not always inject vercel.json `env` before `npm run build`.
 */
import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||= "file:./prisma/dev.db";

const steps = [
  ["npx", "prisma", "generate"],
  ["npx", "prisma", "db", "push"],
  ["npx", "tsx", "scripts/seed.ts"],
  ["npx", "tsx", "scripts/refresh-catalog.ts"],
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
