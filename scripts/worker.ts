/**
 * Background scheduler.
 *
 * Keeps the catalog fresh without anyone remembering to run scripts:
 *
 *   npm run worker
 *
 * Jobs are spawned as child processes rather than imported, so a crash in
 * one run can't take the scheduler down with it, and each job gets a clean
 * Prisma connection.
 */

import "./env";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { env } from "./env";

const ROOT = resolve(import.meta.dirname, "..");

type Job = {
  name: string;
  script: string;
  args?: string[];
  intervalMs: number;
  /** Run once at startup rather than waiting a full interval. */
  runAtBoot: boolean;
};

const HOUR = 60 * 60 * 1000;

const JOBS: Job[] = [
  {
    name: "availability",
    script: "scripts/poll-availability.ts",
    intervalMs: 1 * HOUR,
    runAtBoot: true,
  },
  {
    name: "catalog",
    script: "scripts/sync.ts",
    intervalMs: 24 * HOUR,
    runAtBoot: false,
  },
  {
    name: "refresh",
    script: "scripts/refresh-catalog.ts",
    args: ["--force"],
    intervalMs: 12 * HOUR,
    runAtBoot: true,
  },
  ...(env.mediaRoot
    ? [
        {
          name: "media-scan",
          script: "scripts/scan-media.ts",
          intervalMs: 6 * HOUR,
          runAtBoot: true,
        },
      ]
    : []),
];

/** Guards against overlap when a job runs longer than its interval. */
const running = new Set<string>();

function run(job: Job) {
  if (running.has(job.name)) {
    console.log(`[${stamp()}] ${job.name}: previous run still going, skipping`);
    return;
  }

  running.add(job.name);
  console.log(`[${stamp()}] ${job.name}: starting`);

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", job.script, ...(job.args ?? [])],
    { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" }
  );

  child.on("exit", (code) => {
    running.delete(job.name);
    console.log(`[${stamp()}] ${job.name}: finished (exit ${code})`);
  });

  child.on("error", (err) => {
    running.delete(job.name);
    console.error(`[${stamp()}] ${job.name}: failed to start — ${err.message}`);
  });
}

function stamp() {
  return new Date().toISOString().slice(11, 19);
}

function main() {
  if (!env.tmdbKey) {
    console.error(
      "No TMDB_API_KEY in .env.local. The worker exists to refresh TMDB data,\n" +
        "so there's nothing for it to do yet."
    );
    process.exit(1);
  }

  console.log("MarvelVerse worker\n");
  for (const job of JOBS) {
    const hours = job.intervalMs / HOUR;
    console.log(
      `  ${job.name.padEnd(14)} every ${hours}h${job.runAtBoot ? ", and now" : ""}`
    );
  }
  console.log("\nCtrl+C to stop.\n");

  for (const job of JOBS) {
    if (job.runAtBoot) run(job);
    setInterval(() => run(job), job.intervalMs);
  }
}

main();
