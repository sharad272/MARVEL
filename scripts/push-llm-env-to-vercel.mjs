/**
 * Pipes selected keys from .env.local into Vercel (production + preview).
 * Never prints secret values.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const KEYS = [
  "HF_TOKEN",
  "HF_BASE_URL",
  "LLM_MODEL",
  "GROQ_API_KEY",
  "GROQ_BASE_URL",
  "GROQ_MODEL",
  "WATCH_REGION",
];

function parseDotEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function addEnv(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "vercel",
        "env",
        "add",
        name,
        "production,preview",
        "--project",
        "marvelverse",
        "--force",
        "--yes",
        "--sensitive",
      ],
      { cwd: process.cwd(), shell: true, windowsHide: true }
    );
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} failed with exit ${code}`));
    });
    child.stdin.write(value);
    child.stdin.end();
  });
}

const envPath = new URL("../.env.local", import.meta.url);
if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = parseDotEnv(readFileSync(envPath, "utf8"));
const pending = KEYS.filter((k) => (env[k] || "").trim());
if (!pending.length) {
  console.error("No LLM keys found in .env.local");
  process.exit(1);
}

console.log(`Adding ${pending.length} variables to Vercel production+preview…`);
for (const name of pending) {
  process.stdout.write(`  ${name}… `);
  try {
    await addEnv(name, env[name].trim());
    console.log("ok");
  } catch (err) {
    console.log("failed");
    console.error(err.message);
    process.exit(1);
  }
}
console.log("Done. Redeploy so running deployments pick them up.");
