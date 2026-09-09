/**
 * Character registry and theme engine.
 *
 * Every character carries a palette lifted from their suit. Those palettes
 * drive accents, glows and gradients across the app, so browsing Thor's
 * films looks like Asgard and browsing Loki looks like the TVA. Titles map
 * to a lead character via `titleTheme()`, which is what makes the whole UI
 * feel character-based rather than one flat red skin.
 */

export type CharacterTheme = {
  slug: string;
  name: string;
  realName?: string;
  /** Primary suit colour — drives buttons, active states, focus rings. */
  primary: string;
  /** Secondary suit colour — drives gradient tails and hover states. */
  secondary: string;
  /** High-contrast pop colour for small details on dark backgrounds. */
  accent: string;
  /** Short tagline shown on character rails and hero overlays. */
  tagline: string;
};

export const CHARACTERS: CharacterTheme[] = [
  {
    slug: "iron-man",
    name: "Iron Man",
    realName: "Tony Stark",
    primary: "#e62429",
    secondary: "#f0a500",
    accent: "#ffd54a",
    tagline: "Genius, billionaire, playboy, philanthropist.",
  },
  {
    slug: "captain-america",
    name: "Captain America",
    realName: "Steve Rogers",
    primary: "#1b4f9c",
    secondary: "#c8102e",
    accent: "#e8eef8",
    tagline: "I can do this all day.",
  },
  {
    slug: "thor",
    name: "Thor",
    realName: "Thor Odinson",
    primary: "#2f6fb5",
    secondary: "#b8c4d4",
    accent: "#8fd6ff",
    tagline: "He's the God of Thunder. Wherever he goes, storms follow.",
  },
  {
    slug: "hulk",
    name: "Hulk",
    realName: "Bruce Banner",
    primary: "#3f8f36",
    secondary: "#6b3fa0",
    accent: "#8ee87f",
    tagline: "That's my secret, Cap. I'm always angry.",
  },
  {
    slug: "black-widow",
    name: "Black Widow",
    realName: "Natasha Romanoff",
    primary: "#8b0e11",
    secondary: "#2a2d36",
    accent: "#ff5f63",
    tagline: "I've got red in my ledger.",
  },
  {
    slug: "hawkeye",
    name: "Hawkeye",
    realName: "Clint Barton",
    primary: "#6b4f9c",
    secondary: "#4a3b2a",
    accent: "#c0a3ff",
    tagline: "The city is flying and we're fighting an army of robots.",
  },
  {
    slug: "black-panther",
    name: "Black Panther",
    realName: "T'Challa",
    primary: "#4b2e83",
    secondary: "#141419",
    accent: "#a682ff",
    tagline: "Wakanda forever.",
  },
  {
    slug: "doctor-strange",
    name: "Doctor Strange",
    realName: "Stephen Strange",
    primary: "#c4451f",
    secondary: "#2a6b5f",
    accent: "#ff9d5c",
    tagline: "We never lose our demons. We only learn to live above them.",
  },
  {
    slug: "spider-man",
    name: "Spider-Man",
    realName: "Peter Parker",
    primary: "#d5202b",
    secondary: "#1b4f9c",
    accent: "#5ea6ff",
    tagline: "With great power comes great responsibility.",
  },
  {
    slug: "scarlet-witch",
    name: "Scarlet Witch",
    realName: "Wanda Maximoff",
    primary: "#9c1b2e",
    secondary: "#d4145a",
    accent: "#ff6b8a",
    tagline: "You took everything from me.",
  },
  {
    slug: "vision",
    name: "Vision",
    primary: "#b8412a",
    secondary: "#2e7d4f",
    accent: "#ffc94a",
    tagline: "But a thing isn't beautiful because it lasts.",
  },
  {
    slug: "loki",
    name: "Loki",
    realName: "Loki Laufeyson",
    primary: "#2e7d4f",
    secondary: "#d4a017",
    accent: "#6fe0a0",
    tagline: "I am burdened with glorious purpose.",
  },
  {
    slug: "captain-marvel",
    name: "Captain Marvel",
    realName: "Carol Danvers",
    primary: "#c4174f",
    secondary: "#1b4f9c",
    accent: "#f0a500",
    tagline: "Higher, further, faster.",
  },
  {
    slug: "ant-man",
    name: "Ant-Man",
    realName: "Scott Lang",
    primary: "#c8102e",
    secondary: "#2f6fb5",
    accent: "#7fd0ff",
    tagline: "I do some dumb things and the people I love the most pay the price.",
  },
  {
    slug: "wasp",
    name: "The Wasp",
    realName: "Hope van Dyne",
    primary: "#a8123f",
    secondary: "#d4a017",
    accent: "#ff7aa8",
    tagline: "It's about damn time.",
  },
  {
    slug: "star-lord",
    name: "Star-Lord",
    realName: "Peter Quill",
    primary: "#a8501f",
    secondary: "#6b3fa0",
    accent: "#ffb066",
    tagline: "We're the Guardians of the Galaxy.",
  },
  {
    slug: "gamora",
    name: "Gamora",
    primary: "#2e7d4f",
    secondary: "#6b3fa0",
    accent: "#7ee8b0",
    tagline: "The deadliest woman in the whole galaxy.",
  },
  {
    slug: "groot",
    name: "Groot",
    primary: "#5c4423",
    secondary: "#3f8f36",
    accent: "#c9a86a",
    tagline: "I am Groot.",
  },
  {
    slug: "rocket",
    name: "Rocket",
    primary: "#8a5a2b",
    secondary: "#c8102e",
    accent: "#ffb066",
    tagline: "Ain't no thing like me, except me.",
  },
  {
    slug: "shang-chi",
    name: "Shang-Chi",
    primary: "#c4451f",
    secondary: "#8b0e11",
    accent: "#ffc46b",
    tagline: "We are products of all who came before us.",
  },
  {
    slug: "eternals",
    name: "The Eternals",
    primary: "#c9962b",
    secondary: "#2a6b5f",
    accent: "#ffe08a",
    tagline: "We've watched, and guided. We've never interfered.",
  },
  {
    slug: "moon-knight",
    name: "Moon Knight",
    realName: "Marc Spector",
    primary: "#c8cbd4",
    secondary: "#d4a017",
    accent: "#ffffff",
    tagline: "I'm not a hero. I'm a fist.",
  },
  {
    slug: "ms-marvel",
    name: "Ms. Marvel",
    realName: "Kamala Khan",
    primary: "#c4174f",
    secondary: "#1b4f9c",
    accent: "#ff8fb0",
    tagline: "Good is not a thing you are. It's a thing you do.",
  },
  {
    slug: "she-hulk",
    name: "She-Hulk",
    realName: "Jennifer Walters",
    primary: "#3f8f36",
    secondary: "#c4174f",
    accent: "#a0f090",
    tagline: "I'm a lawyer who happens to be a Hulk.",
  },
  {
    slug: "falcon",
    name: "Falcon",
    realName: "Sam Wilson",
    primary: "#b8c4d4",
    secondary: "#c8102e",
    accent: "#e8eef8",
    tagline: "On your left.",
  },
  {
    slug: "winter-soldier",
    name: "Winter Soldier",
    realName: "Bucky Barnes",
    primary: "#4a5568",
    secondary: "#8b0e11",
    accent: "#9fb0c8",
    tagline: "But I knew him.",
  },
  {
    slug: "nick-fury",
    name: "Nick Fury",
    primary: "#2a2d36",
    secondary: "#2f6fb5",
    accent: "#7fb4ff",
    tagline: "I still believe in heroes.",
  },
  {
    slug: "thanos",
    name: "Thanos",
    primary: "#6b3fa0",
    secondary: "#c9962b",
    accent: "#b98cff",
    tagline: "I am inevitable.",
  },
  {
    slug: "daredevil",
    name: "Daredevil",
    realName: "Matt Murdock",
    primary: "#8b0e11",
    secondary: "#1a1a1f",
    accent: "#ff4b50",
    tagline: "The devil of Hell's Kitchen.",
  },
  {
    slug: "jessica-jones",
    name: "Jessica Jones",
    primary: "#3f4a6b",
    secondary: "#6b3fa0",
    accent: "#8fa0d4",
    tagline: "You want to do something good? Go be a hero somewhere else.",
  },
  {
    slug: "luke-cage",
    name: "Luke Cage",
    primary: "#c9962b",
    secondary: "#2a2d36",
    accent: "#ffd76b",
    tagline: "Sweet Christmas.",
  },
  {
    slug: "iron-fist",
    name: "Iron Fist",
    realName: "Danny Rand",
    primary: "#2e7d4f",
    secondary: "#c9962b",
    accent: "#7ee8b0",
    tagline: "I am the Immortal Iron Fist.",
  },
  {
    slug: "punisher",
    name: "The Punisher",
    realName: "Frank Castle",
    primary: "#2a2d36",
    secondary: "#8b0e11",
    accent: "#c8cbd4",
    tagline: "One batch, two batch. Penny and dime.",
  },
  {
    slug: "wolverine",
    name: "Wolverine",
    realName: "Logan",
    primary: "#c9962b",
    secondary: "#1b4f9c",
    accent: "#ffd76b",
    tagline: "I'm the best there is at what I do.",
  },
  {
    slug: "deadpool",
    name: "Deadpool",
    realName: "Wade Wilson",
    primary: "#8b0e11",
    secondary: "#1a1a1f",
    accent: "#ff4b50",
    tagline: "Maximum effort.",
  },
  {
    slug: "professor-x",
    name: "Professor X",
    realName: "Charles Xavier",
    primary: "#1b4f9c",
    secondary: "#c9962b",
    accent: "#7fb4ff",
    tagline: "Mutation. It is the key to our evolution.",
  },
  {
    slug: "magneto",
    name: "Magneto",
    realName: "Erik Lehnsherr",
    primary: "#6b1f7a",
    secondary: "#c8102e",
    accent: "#d48cff",
    tagline: "Peace was never an option.",
  },
  {
    slug: "venom",
    name: "Venom",
    realName: "Eddie Brock",
    primary: "#1a1a1f",
    secondary: "#4a5568",
    accent: "#c8cbd4",
    tagline: "We are Venom.",
  },
  {
    slug: "blade",
    name: "Blade",
    primary: "#8b0e11",
    secondary: "#1a1a1f",
    accent: "#ff4b50",
    tagline: "Some motherf—— always trying to iceskate uphill.",
  },
  {
    slug: "fantastic-four",
    name: "Fantastic Four",
    primary: "#2f6fb5",
    secondary: "#c9962b",
    accent: "#8fd6ff",
    tagline: "It's clobberin' time.",
  },
  {
    slug: "avengers",
    name: "The Avengers",
    primary: "#e62429",
    secondary: "#1b4f9c",
    accent: "#f0a500",
    tagline: "There was an idea to bring together a group of remarkable people.",
  },
  {
    slug: "guardians",
    name: "Guardians of the Galaxy",
    primary: "#a8501f",
    secondary: "#6b3fa0",
    accent: "#ffb066",
    tagline: "We're all losers. People who have lost stuff.",
  },
  {
    slug: "x-men",
    name: "X-Men",
    primary: "#c9962b",
    secondary: "#1b4f9c",
    accent: "#ffd76b",
    tagline: "To me, you're all mutants.",
  },
];

/** House palette used when nothing more specific applies. */
export const DEFAULT_THEME: CharacterTheme = {
  slug: "marvel",
  name: "Marvel",
  primary: "#e62429",
  secondary: "#c81a1f",
  accent: "#ff4b50",
  tagline: "Every hero. Every story. One place.",
};

const BY_SLUG = new Map(CHARACTERS.map((c) => [c.slug, c]));

export function getCharacter(slug: string | null | undefined): CharacterTheme {
  if (!slug) return DEFAULT_THEME;
  return BY_SLUG.get(slug) ?? DEFAULT_THEME;
}

/**
 * CSS custom properties for a theme. Spread onto any element's `style` to
 * re-skin that subtree; components read the vars rather than hard-coded
 * colours, so a title page, a card and the player all inherit correctly.
 */
export function themeVars(theme: CharacterTheme): React.CSSProperties {
  return {
    ["--c-primary" as string]: theme.primary,
    ["--c-secondary" as string]: theme.secondary,
    ["--c-accent" as string]: theme.accent,
    ["--c-primary-soft" as string]: withAlpha(theme.primary, 0.16),
    ["--c-primary-glow" as string]: withAlpha(theme.primary, 0.45),
    ["--c-secondary-soft" as string]: withAlpha(theme.secondary, 0.16),
  };
}

/** #rrggbb -> rgba(r g b / a). Falls back to the input if not hex. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
