/**
 * Builds the committed character assets:
 *   public/characters/<slug>.webp   portrait for every registry character
 *   data/generated/codex.json       Marvel roster with power stats
 *
 * Run by hand when lib/characters.ts or data/codex-links.ts changes:
 *   npx tsx scripts/build-character-assets.ts
 *
 * Everything is downloaded once and served from our own CDN, so tiles
 * never depend on a third-party image host at request time.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS } from "../lib/characters";
import { HERO_IDS, WIKI_PORTRAITS } from "../data/codex-links";

const ROOT = path.resolve(__dirname, "..");
const API = "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api";
const UA = "MarvelVerse/1.0 (personal catalog; build script)";
const force = process.argv.includes("--force");

type Hero = {
  id: number;
  name: string;
  slug: string;
  powerstats: Record<string, number | null>;
  appearance: { gender: string; race: string | null };
  biography: {
    fullName: string;
    aliases: string[];
    placeOfBirth: string;
    firstAppearance: string;
    publisher: string | null;
    alignment: string;
  };
  work: { occupation: string; base: string };
  connections: { groupAffiliation: string; relatives: string };
  images: { md: string; lg: string };
};

const STATS = ["intelligence", "strength", "speed", "durability", "power", "combat"] as const;

function clip(s: string | null | undefined, n: number): string | undefined {
  const v = (s ?? "").trim();
  if (!v || v === "-" || v === "null") return undefined;
  return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function wikiImage(title: string): Promise<Buffer | null> {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { "user-agent": UA },
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { originalimage?: { source: string }; thumbnail?: { source: string } };
  for (const url of [j.originalimage?.source, j.thumbnail?.source]) {
    if (!url) continue;
    try {
      return await fetchBuffer(url);
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

async function writePortrait(slug: string, src: Buffer, position: string) {
  const out = path.join(ROOT, "public", "characters", `${slug}.webp`);
  await sharp(src)
    .resize(480, 640, { fit: "cover", position })
    .webp({ quality: 80 })
    .toFile(out);
}

async function main() {
  mkdirSync(path.join(ROOT, "public", "characters"), { recursive: true });
  mkdirSync(path.join(ROOT, "data", "generated"), { recursive: true });

  const all = (await (await fetch(`${API}/all.json`)).json()) as Hero[];
  const byId = new Map(all.map((h) => [h.id, h]));

  // Variant entries list another Marvel character as their "publisher".
  const marvelNames = new Set(
    all.filter((h) => h.biography.publisher === "Marvel Comics").map((h) => h.name)
  );
  const linkedIds = new Set(Object.values(HERO_IDS));
  const isMarvel = (h: Hero) =>
    h.biography.publisher === "Marvel Comics" ||
    marvelNames.has(h.biography.publisher ?? "") ||
    linkedIds.has(h.id);

  // --- Portraits -------------------------------------------------------
  let made = 0;
  for (const c of CHARACTERS) {
    const out = path.join(ROOT, "public", "characters", `${c.slug}.webp`);
    if (existsSync(out) && !force) continue;
    try {
      const id = HERO_IDS[c.slug];
      if (id) {
        const h = byId.get(id);
        if (!h) throw new Error(`hero ${id} not in dataset`);
        await writePortrait(c.slug, await fetchBuffer(h.images.lg), "top");
        console.log(`  ✓ ${c.slug.padEnd(18)} ← #${id} ${h.name} (${h.biography.fullName})`);
      } else if (WIKI_PORTRAITS[c.slug]) {
        // upload.wikimedia.org rate-limits bursts with 429s.
        await new Promise((r) => setTimeout(r, 3000));
        const img = await wikiImage(WIKI_PORTRAITS[c.slug]);
        if (!img) throw new Error(`no wiki image for ${WIKI_PORTRAITS[c.slug]}`);
        await writePortrait(c.slug, img, "attention");
        console.log(`  ✓ ${c.slug.padEnd(18)} ← wiki ${WIKI_PORTRAITS[c.slug]}`);
      } else {
        console.warn(`  ! ${c.slug}: no portrait source`);
        continue;
      }
      made++;
    } catch (e) {
      console.warn(`  ! ${c.slug}: ${(e as Error).message}`);
    }
  }
  console.log(`portraits: ${made} written`);
  const present = CHARACTERS.map((c) => c.slug).filter((s) =>
    existsSync(path.join(ROOT, "public", "characters", `${s}.webp`))
  );
  writeFileSync(
    path.join(ROOT, "data", "generated", "portraits.json"),
    JSON.stringify(present)
  );

  // --- Codex roster ----------------------------------------------------
  const slugById = new Map(Object.entries(HERO_IDS).map(([slug, id]) => [id, slug]));
  const used = new Set<string>();
  const entries = all.filter(isMarvel).map((h) => {
    const characterSlug = slugById.get(h.id);
    let key = characterSlug ?? slugify(h.name);
    if (used.has(key)) key = `${key}-${h.id}`;
    used.add(key);
    const stats = Object.fromEntries(STATS.map((s) => [s, h.powerstats[s] ?? null]));
    return {
      key,
      heroId: h.id,
      name: h.name,
      fullName: clip(h.biography.fullName, 60),
      aliases: h.biography.aliases.filter((a) => a && a !== "-").slice(0, 4),
      alignment: clip(h.biography.alignment, 10),
      firstAppearance: clip(h.biography.firstAppearance, 80),
      placeOfBirth: clip(h.biography.placeOfBirth, 80),
      race: clip(h.appearance.race, 30),
      gender: clip(h.appearance.gender, 10),
      occupation: clip(h.work.occupation, 140),
      groups: clip(h.connections.groupAffiliation, 180),
      stats,
      image: characterSlug ? `/characters/${characterSlug}.webp` : h.images.md,
      imageLarge: characterSlug ? `/characters/${characterSlug}.webp` : h.images.lg,
      characterSlug: characterSlug ?? null,
    };
  });

  // Registry characters the dataset lacks still get a (stat-less) entry.
  for (const c of CHARACTERS) {
    if (HERO_IDS[c.slug] || !WIKI_PORTRAITS[c.slug]) continue;
    if (["fantastic-four", "avengers", "guardians", "x-men", "eternals"].includes(c.slug)) continue;
    entries.push({
      key: c.slug,
      heroId: 0,
      name: c.name,
      fullName: c.realName,
      aliases: [],
      alignment: undefined,
      firstAppearance: undefined,
      placeOfBirth: undefined,
      race: undefined,
      gender: undefined,
      occupation: undefined,
      groups: undefined,
      stats: Object.fromEntries(STATS.map((s) => [s, null])),
      image: `/characters/${c.slug}.webp`,
      imageLarge: `/characters/${c.slug}.webp`,
      characterSlug: c.slug,
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(
    path.join(ROOT, "data", "generated", "codex.json"),
    JSON.stringify(entries)
  );
  console.log(`codex: ${entries.length} Marvel characters`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
