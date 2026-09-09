/**
 * Cheap intent routing for Ask the Watcher.
 *
 * A second model call just to classify "before Endgame" vs "Wanda's arc"
 * would add latency for no quality gain — string match against the local
 * catalog is enough, and unknown queries fall through to NL search.
 */

import { CHARACTERS } from "@/lib/characters";

export type TitleHint = { slug: string; name: string };
export type CharacterHint = { slug: string; name: string; realName?: string | null };

export type Intent =
  | { kind: "prereqs"; slug: string; name: string }
  | { kind: "arc"; slug: string; name: string }
  | { kind: "search" };

const PREREQ =
  /\b(before|prior to|watch first|need to watch|prereq|get me ready|ready for|going into|recap|previously)\b/i;
const ARC =
  /\b(arc|throughline|journey|who is|who does|character story|trace)\b/i;

const TITLE_NICKNAMES: Record<string, string> = {
  endgame: "avengers-endgame",
  "infinity war": "avengers-infinity-war",
  "civil war": "captain-america-civil-war",
  "winter soldier": "captain-america-the-winter-soldier",
  "no way home": "spider-man-no-way-home",
  "far from home": "spider-man-far-from-home",
  "brand new day": "spider-man-brand-new-day",
  homecoming: "spider-man-homecoming",
  ragnarok: "thor-ragnarok",
  ultron: "avengers-age-of-ultron",
  "the avengers": "the-avengers",
  "first avenger": "captain-america-the-first-avenger",
  "multiverse of madness": "doctor-strange-in-the-multiverse-of-madness",
  "brave new world": "captain-america-brave-new-world",
  thunderbolts: "thunderbolts",
  doomsday: "avengers-doomsday",
  "secret wars": "avengers-secret-wars",
  "first steps": "the-fantastic-four-first-steps",
  "wonder man": "wonder-man",
  "eyes of wakanda": "eyes-of-wakanda",
  "marvel zombies": "marvel-zombies",
  "friendly neighborhood": "your-friendly-neighborhood-spider-man",
  "one last kill": "the-punisher-one-last-kill",
  visionquest: "visionquest",
  "vision quest": "visionquest",
};

const CHAR_NICKNAMES: Record<string, string> = {
  wanda: "scarlet-witch",
  "scarlet witch": "scarlet-witch",
  tony: "iron-man",
  stark: "iron-man",
  steve: "captain-america",
  cap: "captain-america",
  peter: "spider-man",
  spidey: "spider-man",
  tchalla: "black-panther",
  "black panther": "black-panther",
  natasha: "black-widow",
  bucky: "winter-soldier",
  sam: "falcon",
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchTitle(query: string, titles: TitleHint[]): TitleHint | null {
  const q = norm(query);
  for (const [nick, slug] of Object.entries(TITLE_NICKNAMES)) {
    if (q.includes(nick)) {
      const hit = titles.find((t) => t.slug === slug);
      if (hit) return hit;
    }
  }

  let best: TitleHint | null = null;
  let bestLen = 0;
  for (const t of titles) {
    const n = norm(t.name);
    if (n.length >= 4 && q.includes(n) && n.length > bestLen) {
      best = t;
      bestLen = n.length;
    }
  }
  return best;
}

function matchCharacter(query: string): CharacterHint | null {
  const q = norm(query);
  for (const [nick, slug] of Object.entries(CHAR_NICKNAMES)) {
    if (new RegExp(`\\b${nick}\\b`).test(q)) {
      const hit = CHARACTERS.find((c) => c.slug === slug);
      if (hit) return hit;
    }
  }

  let best: CharacterHint | null = null;
  let bestLen = 0;
  for (const c of CHARACTERS) {
    for (const label of [c.name, c.realName].filter(Boolean) as string[]) {
      const n = norm(label);
      if (n.length >= 3 && q.includes(n) && n.length > bestLen) {
        best = c;
        bestLen = n.length;
      }
    }
  }
  return best;
}

export function resolveIntent(query: string, titles: TitleHint[]): Intent {
  const title = matchTitle(query, titles);
  const character = matchCharacter(query);

  if (PREREQ.test(query) && title) {
    return { kind: "prereqs", slug: title.slug, name: title.name };
  }
  if (ARC.test(query) && character) {
    return { kind: "arc", slug: character.slug, name: character.name };
  }
  // "Wanda's story" without the word arc still wants the through-line.
  if (character && /\b(story|appearances|in order)\b/i.test(query) && !title) {
    return { kind: "arc", slug: character.slug, name: character.name };
  }
  return { kind: "search" };
}
