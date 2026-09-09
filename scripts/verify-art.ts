/**
 * HEAD-check curated TMDB paths. Drops 404s from stdout so artwork.ts
 * stays honest. Run: npx tsx scripts/verify-art.ts
 */

import { SEED_ART } from "../data/artwork";

const IMG = "https://image.tmdb.org/t/p/w185";

async function exists(path: string) {
  const res = await fetch(`${IMG}${path}`, { method: "HEAD" });
  return res.ok;
}

async function main() {
  let ok = 0;
  let bad = 0;
  for (const [slug, art] of Object.entries(SEED_ART)) {
    for (const kind of ["poster", "backdrop"] as const) {
      const path = art[kind];
      if (!path) continue;
      const live = await exists(path);
      if (live) {
        ok++;
      } else {
        bad++;
        console.log(`missing ${kind} ${slug} ${path}`);
      }
    }
  }
  console.log(`ok=${ok} missing=${bad}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
