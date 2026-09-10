import { CATALOG } from "../data/catalog.ts";
import { OFFICIAL_TRAILERS } from "../data/trailers.ts";

const entries = Object.entries(OFFICIAL_TRAILERS);
const missing = CATALOG.filter((t) => !OFFICIAL_TRAILERS[t.slug]);

console.log(`Checking ${entries.length} trailer keys against YouTube oembed…\n`);

const CONCURRENCY = 8;
const results = [];

async function check([slug, { key }]) {
  const url = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${key}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return { slug, key, ok: false, status: res.status, title: "" };
    const data = await res.json();
    return {
      slug,
      key,
      ok: true,
      status: res.status,
      title: `${data.author_name ?? "?"} — ${data.title ?? "?"}`,
    };
  } catch (e) {
    return { slug, key, ok: false, status: "ERR:" + e.message, title: "" };
  }
}

let idx = 0;
async function worker() {
  while (idx < entries.length) {
    const i = idx++;
    results.push(await check(entries[i]));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const bad = results.filter((r) => !r.ok).sort((a, b) => a.slug.localeCompare(b.slug));
const good = results.filter((r) => r.ok);

console.log(`OK: ${good.length}  BROKEN: ${bad.length}`);
if (bad.length) {
  console.log("\n--- BROKEN trailer keys ---");
  for (const r of bad) {
    console.log(`${r.slug}\t${r.key}\t${r.status}`);
  }
}

const expectedMissing = new Set(["avengers-secret-wars"]);
const unexpected = missing.filter((t) => !expectedMissing.has(t.slug));
console.log(`\nCatalog titles without a trailer key: ${missing.length}`);
for (const t of missing) {
  console.log(`  ${t.slug}\t${t.name}`);
}
if (unexpected.length) {
  console.error("\nUnexpected titles are missing a YouTube trailer key.");
  process.exit(1);
}
if (bad.length) process.exit(1);
