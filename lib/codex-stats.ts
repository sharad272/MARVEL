/** Kept apart from lib/codex so client components don't bundle the roster JSON. */
export const STAT_KEYS = [
  "intelligence",
  "strength",
  "speed",
  "durability",
  "power",
  "combat",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
