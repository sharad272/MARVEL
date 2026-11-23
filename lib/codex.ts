/**
 * The Codex: every Marvel character in the open superhero dataset
 * (data/generated/codex.json, built by scripts/build-character-assets.ts)
 * plus registry characters the dataset lacks.
 *
 * Power stats are fan-maintained 0-100 ratings of the comics versions.
 * They're a rough guide, which is how the UI and the AI prompts present
 * them.
 */
import raw from "@/data/generated/codex.json";
import { STAT_KEYS, type StatKey } from "@/lib/codex-stats";

export { STAT_KEYS, type StatKey };

export type CodexEntry = {
  key: string;
  heroId: number;
  name: string;
  fullName?: string;
  aliases: string[];
  alignment?: string;
  firstAppearance?: string;
  placeOfBirth?: string;
  race?: string;
  gender?: string;
  occupation?: string;
  groups?: string;
  stats: Record<StatKey, number | null>;
  image: string;
  imageLarge: string;
  characterSlug: string | null;
};

export type CodexListItem = {
  key: string;
  name: string;
  fullName?: string;
  image: string;
  score: number | null;
  rank: number | null;
  alignment?: string;
  onScreen: boolean;
  characterSlug: string | null;
};

const ENTRIES = raw as CodexEntry[];
const BY_KEY = new Map(ENTRIES.map((e) => [e.key, e]));

/** Average of the six stats, or null when the dataset left any blank. */
export function powerScore(e: CodexEntry): number | null {
  const vals = STAT_KEYS.map((k) => e.stats[k]);
  if (vals.some((v) => v == null)) return null;
  return Math.round((vals as number[]).reduce((a, b) => a + b, 0) / vals.length);
}

const RANKED = ENTRIES.filter((e) => powerScore(e) != null).sort(
  (a, b) => powerScore(b)! - powerScore(a)! || a.name.localeCompare(b.name)
);
const RANK = new Map(RANKED.map((e, i) => [e.key, i + 1]));

export const RANKED_COUNT = RANKED.length;

export function getCodexEntry(key: string): CodexEntry | null {
  return BY_KEY.get(key) ?? null;
}

export function codexRank(key: string): number | null {
  return RANK.get(key) ?? null;
}

export function codexEntryForCharacter(slug: string): CodexEntry | null {
  return ENTRIES.find((e) => e.characterSlug === slug) ?? null;
}

/** Characters just above and below in the power ranking. */
export function powerNeighbours(key: string, each = 3): { stronger: CodexEntry[]; weaker: CodexEntry[] } {
  const i = RANKED.findIndex((e) => e.key === key);
  if (i === -1) return { stronger: [], weaker: [] };
  return {
    stronger: RANKED.slice(Math.max(0, i - each), i).reverse(),
    weaker: RANKED.slice(i + 1, i + 1 + each),
  };
}

export function topRanked(n: number): CodexEntry[] {
  return RANKED.slice(0, n);
}

export function codexList(): CodexListItem[] {
  return ENTRIES.map((e) => ({
    key: e.key,
    name: e.name,
    fullName: e.fullName,
    image: e.image,
    score: powerScore(e),
    rank: codexRank(e.key),
    alignment: e.alignment,
    onScreen: Boolean(e.characterSlug),
    characterSlug: e.characterSlug,
  }));
}

/** Power tier labels for the 0-100 average. */
export function powerTier(score: number | null): string {
  if (score == null) return "Unrated";
  if (score >= 90) return "Cosmic";
  if (score >= 75) return "Planetary";
  if (score >= 60) return "Elite";
  if (score >= 45) return "Street-plus";
  return "Street-level";
}
