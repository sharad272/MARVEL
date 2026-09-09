import { OFFICIAL_TRAILERS } from "../data/trailers.ts";

const entries = Object.entries(OFFICIAL_TRAILERS);
console.log(`Checking ${entries.length} trailer keys against i.ytimg.com/hqdefault…\n`);

const CONCURRENCY = 8;
const results = [];

async function check([slug, { key }]) {
  try {
    const res = await fetch(`https://i.ytimg.com/vi/${key}/hqdefault.jpg`, {
      method: "HEAD",
    });
    return { slug, key, ok: res.status === 200, status: res.status };
  } catch (e) {
    return { slug, key, ok: false, status: "ERR:" + e.message };
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

console.log(`OK: ${good.length}  BROKEN: ${bad.length}\n`);
console.log("--- BROKEN trailer keys (no real video at this ID) ---");
for (const r of bad) {
  console.log(`${r.slug}\t${r.key}\t${r.status}`);
}
