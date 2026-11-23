/**
 * The multiverse map behind the /multiverse tab.
 *
 * Hand-curated because no source expresses "which Earth does each Marvel
 * production live on, and how do they collide on the road to Avengers:
 * Doomsday". The AI briefings are grounded on these facts plus the
 * catalog; anything the model says beyond them is flavour, not canon.
 *
 * `designation` is shown verbatim. `designationOnScreen` is true only
 * when a film or series actually said the number out loud; the rest are
 * Marvel handbook / fandom labels and the UI marks them as such.
 *
 * Keep `facts` to things that happened on screen or were officially
 * announced. Anything after the model's knowledge (late-2026 releases)
 * should stay vague so the briefing doesn't invent plot.
 */

export type EarthStatus = "doomsday" | "active" | "folded" | "ended" | "outside";

export type Earth = {
  id: string;
  designation: string;
  designationOnScreen: boolean;
  name: string;
  /** One line a newcomer can hold onto. */
  tagline: string;
  status: EarthStatus;
  statusLabel: string;
  /** Character palette for the card. */
  theme: string;
  /** Catalog slugs, in the order to watch them for this Earth. */
  titles: string[];
  /** Character slugs from lib/characters.ts. */
  characters: string[];
  /** Announced Doomsday cast from this Earth, if any. */
  doomsdayCast?: string[];
  facts: string[];
};

export type Crossing = {
  year: number;
  title: string;
  slug: string;
  from: string;
  to: string;
  what: string;
};

export const DOOMSDAY_SLUG = "avengers-doomsday";

export const EARTHS: Earth[] = [
  {
    id: "earth-616",
    designation: "Earth-616",
    designationOnScreen: true,
    name: "The Sacred Timeline",
    tagline: "The main MCU — where Avengers: Doomsday takes place.",
    status: "doomsday",
    statusLabel: "Ground zero for Doomsday",
    theme: "avengers",
    titles: [
      "avengers-endgame",
      "loki",
      "spider-man-no-way-home",
      "doctor-strange-in-the-multiverse-of-madness",
      "ant-man-and-the-wasp-quantumania",
      "the-marvels",
      "captain-america-brave-new-world",
      "thunderbolts",
      "daredevil-born-again",
      "spider-man-brand-new-day",
      "visionquest",
      "avengers-doomsday",
    ],
    characters: [
      "captain-america",
      "falcon",
      "thor",
      "loki",
      "doctor-strange",
      "spider-man",
      "ant-man",
      "winter-soldier",
      "black-panther",
      "shang-chi",
      "daredevil",
    ],
    doomsdayCast: [
      "Robert Downey Jr. (Doctor Doom)",
      "Chris Hemsworth (Thor)",
      "Anthony Mackie (Captain America / Sam Wilson)",
      "Sebastian Stan (Bucky Barnes)",
      "Florence Pugh (Yelena Belova)",
      "Paul Rudd (Ant-Man)",
      "Letitia Wright (Shuri)",
      "Simu Liu (Shang-Chi)",
      "Tom Hiddleston (Loki)",
    ],
    facts: [
      "After Endgame, Tony Stark and Natasha Romanoff are dead and Steve Rogers retired; the original Avengers no longer exist as a team.",
      "Sam Wilson took the shield and became Captain America (The Falcon and the Winter Soldier, Brave New World).",
      "Loki (season 2) ends with Loki holding the branching timelines together as a living tree — the multiverse now exists because he keeps it alive.",
      "No Way Home cracked the multiverse open; to fix it, the whole world forgot Peter Parker.",
      "Multiverse of Madness ends with a warning that 'incursions' — universes colliding and destroying each other — have begun.",
      "Thunderbolts* turns Yelena, Bucky and team into the 'New Avengers'; its end-credits scene shows a Fantastic Four ship arriving from another universe.",
      "The Kang storyline from Quantumania was dropped. Marvel announced Robert Downey Jr. as Doctor Doom, the villain of Doomsday.",
      "Daredevil: Born Again brings Matt Murdock and Wilson Fisk from the Netflix shows into this main universe.",
    ],
  },
  {
    id: "earth-828",
    designation: "Earth-828",
    designationOnScreen: true,
    name: "The Fantastic Four's Earth",
    tagline: "A retro-futurist world where the Fantastic Four are the only heroes.",
    status: "doomsday",
    statusLabel: "Crossing into 616",
    theme: "fantastic-four",
    titles: ["the-fantastic-four-first-steps", "thunderbolts"],
    characters: ["fantastic-four"],
    doomsdayCast: [
      "Pedro Pascal (Reed Richards)",
      "Vanessa Kirby (Sue Storm)",
      "Joseph Quinn (Johnny Storm)",
      "Ebon Moss-Bachrach (Ben Grimm)",
    ],
    facts: [
      "First Steps establishes the Fantastic Four on their own Earth, numbered 828, with a 1960s-style future aesthetic.",
      "They face Galactus and the Silver Surfer to save their planet, and Sue and Reed's son Franklin is born.",
      "A credits scene in First Steps points straight at Doctor Doom.",
      "Thunderbolts* ends with the Fantastic Four's ship entering Earth-616 — the first sign that their world and the MCU are about to meet.",
    ],
  },
  {
    id: "earth-10005",
    designation: "Earth-10005",
    designationOnScreen: true,
    name: "The Fox X-Men & Deadpool Universe",
    tagline: "Twenty years of X-Men films — and Deadpool's home.",
    status: "doomsday",
    statusLabel: "X-Men return in Doomsday",
    theme: "x-men",
    titles: [
      "x-men",
      "x2",
      "x-men-the-last-stand",
      "x-men-origins-wolverine",
      "x-men-first-class",
      "the-wolverine",
      "x-men-days-of-future-past",
      "deadpool",
      "x-men-apocalypse",
      "logan",
      "deadpool-2",
      "dark-phoenix",
      "the-new-mutants",
      "deadpool-and-wolverine",
    ],
    characters: ["x-men", "professor-x", "magneto", "wolverine", "deadpool"],
    doomsdayCast: [
      "Patrick Stewart (Professor X)",
      "Ian McKellen (Magneto)",
      "James Marsden (Cyclops)",
      "Alan Cumming (Nightcrawler)",
      "Rebecca Romijn (Mystique)",
      "Kelsey Grammer (Beast)",
      "Channing Tatum (Gambit)",
    ],
    facts: [
      "Days of Future Past rewrote this universe's history, so the X-Men films don't form one clean timeline — treat the original trilogy and the First Class era as two versions of the same world.",
      "Logan dies at the end of Logan. Deadpool & Wolverine reveals that losing its 'anchor being' was dooming this universe to slowly fade away.",
      "Deadpool & Wolverine explicitly names this universe Earth-10005. Wade recruits a different Logan variant and saves it from being erased by the TVA.",
      "The Marvels ends with Monica Rambeau waking up in an X-Men world alongside Kelsey Grammer's Beast.",
      "Marvel announced Patrick Stewart, Ian McKellen, James Marsden, Alan Cumming, Rebecca Romijn and Channing Tatum for Avengers: Doomsday.",
    ],
  },
  {
    id: "earth-838",
    designation: "Earth-838",
    designationOnScreen: true,
    name: "The Illuminati's Earth",
    tagline: "The universe Doctor Strange visits in Multiverse of Madness.",
    status: "ended",
    statusLabel: "Its heroes were wiped out",
    theme: "doctor-strange",
    titles: ["doctor-strange-in-the-multiverse-of-madness"],
    characters: ["doctor-strange", "professor-x", "scarlet-witch"],
    facts: [
      "Strange travels here and meets the Illuminati: a Professor X played by Patrick Stewart, a Reed Richards, Captain Carter, Black Bolt and Maria Rambeau as Captain Marvel.",
      "Wanda Maximoff kills almost all of them while hunting for her children.",
      "This Professor X is a variant — not the same Charles Xavier as the Fox X-Men films. Same actor, different Earth.",
    ],
  },
  {
    id: "earth-96283",
    designation: "Earth-96283",
    designationOnScreen: false,
    name: "Tobey Maguire's Spider-Man",
    tagline: "Sam Raimi's trilogy — the first modern Spider-Man.",
    status: "active",
    statusLabel: "Visited 616, went home",
    theme: "spider-man",
    titles: ["spider-man-2002", "spider-man-2", "spider-man-3", "spider-man-no-way-home"],
    characters: ["spider-man"],
    facts: [
      "Peter Parker's trilogy against Green Goblin, Doctor Octopus, Sandman and Venom.",
      "In No Way Home, this Peter is pulled into Earth-616, helps cure his old villains, and returns home.",
    ],
  },
  {
    id: "earth-120703",
    designation: "Earth-120703",
    designationOnScreen: false,
    name: "Andrew Garfield's Spider-Man",
    tagline: "The Amazing Spider-Man films.",
    status: "active",
    statusLabel: "Visited 616, went home",
    theme: "spider-man",
    titles: ["the-amazing-spider-man", "the-amazing-spider-man-2", "spider-man-no-way-home"],
    characters: ["spider-man"],
    facts: [
      "This Peter lost Gwen Stacy at the end of The Amazing Spider-Man 2.",
      "In No Way Home he crosses into Earth-616, saves MJ the way he couldn't save Gwen, and returns home.",
    ],
  },
  {
    id: "sony-spider-verse",
    designation: "Sony's Spider-Man Universe",
    designationOnScreen: false,
    name: "Venom's Universe",
    tagline: "Venom, Morbius, Madame Web and Kraven — Spider-Man adjacent, Spider-Man absent.",
    status: "ended",
    statusLabel: "Venom's story concluded",
    theme: "venom",
    titles: [
      "venom",
      "venom-let-there-be-carnage",
      "morbius",
      "madame-web",
      "venom-the-last-dance",
      "kraven-the-hunter",
    ],
    characters: ["venom"],
    facts: [
      "Eddie Brock and the Venom symbiote's trilogy plays out here.",
      "Let There Be Carnage's credits scene pulls Eddie into Earth-616 during No Way Home; he's sent back but leaves a piece of the symbiote behind.",
      "Morbius shows the Vulture from the MCU getting pulled into this universe after No Way Home.",
      "Venom: The Last Dance closes Eddie and Venom's story.",
    ],
  },
  {
    id: "defenders",
    designation: "The Defenders (Netflix)",
    designationOnScreen: false,
    name: "Hell's Kitchen",
    tagline: "Netflix's street-level shows — now folded into the main MCU.",
    status: "folded",
    statusLabel: "Absorbed into 616",
    theme: "daredevil",
    titles: [
      "daredevil",
      "jessica-jones",
      "luke-cage",
      "iron-fist",
      "the-defenders",
      "the-punisher",
      "daredevil-born-again",
      "the-punisher-one-last-kill",
    ],
    characters: ["daredevil", "jessica-jones", "luke-cage", "iron-fist", "punisher"],
    facts: [
      "Daredevil, Jessica Jones, Luke Cage and Iron Fist team up in The Defenders; the Punisher gets his own series.",
      "Marvel now places these shows on the official MCU timeline.",
      "Daredevil: Born Again continues Matt Murdock and Wilson Fisk's story in Earth-616, with the same actors.",
    ],
  },
  {
    id: "outside",
    designation: "Outside the Multiverse",
    designationOnScreen: false,
    name: "The TVA, the Void & the Watcher",
    tagline: "The places that sit above every Earth.",
    status: "outside",
    statusLabel: "Where variants end up",
    theme: "loki",
    titles: ["loki", "what-if", "deadpool-and-wolverine"],
    characters: ["loki", "deadpool", "blade"],
    facts: [
      "The Time Variance Authority (TVA) used to prune any branch that strayed from the Sacred Timeline.",
      "Loki season 2 ends with Loki letting every branch grow, turning the timeline into a multiverse he personally holds together.",
      "The Void is where pruned things go. In Deadpool & Wolverine it holds forgotten heroes from older films: Blade (Wesley Snipes), Elektra (Jennifer Garner), Gambit (Channing Tatum), X-23 (Dafne Keen) and Johnny Storm (Chris Evans).",
      "What If…? follows the Watcher, who observes every universe, including Captain Carter's.",
    ],
  },
  {
    id: "legacy",
    designation: "Legacy Earths",
    designationOnScreen: false,
    name: "Pre-MCU Marvel films",
    tagline: "Blade, the 2000s Fantastic Four, Daredevil, Elektra, Ghost Rider and more.",
    status: "ended",
    statusLabel: "Survivors live on in the Void",
    theme: "blade",
    titles: [
      "blade",
      "blade-ii",
      "blade-trinity",
      "daredevil-2003",
      "elektra",
      "hulk-2003",
      "the-punisher-2004",
      "fantastic-four-2005",
      "fantastic-four-rise-of-the-silver-surfer",
      "ghost-rider",
      "fantastic-four-2015",
    ],
    characters: ["blade", "fantastic-four"],
    facts: [
      "Each of these films was its own self-contained universe.",
      "Deadpool & Wolverine brings back Blade, Elektra and Johnny Storm from these films as residents of the Void.",
    ],
  },
  {
    id: "animated",
    designation: "Animated Earths",
    designationOnScreen: false,
    name: "Spider-Verse, X-Men '97 & What If…?",
    tagline: "Separate animated universes — great on their own, outside the Doomsday story.",
    status: "active",
    statusLabel: "Separate continuity",
    theme: "spider-man",
    titles: [
      "spider-man-into-the-spider-verse",
      "spider-man-across-the-spider-verse",
      "x-men-97",
      "what-if",
      "marvel-zombies",
      "your-friendly-neighborhood-spider-man",
    ],
    characters: ["spider-man", "x-men"],
    facts: [
      "Miles Morales lives on Earth-1610 and Gwen Stacy on Earth-65 in the Spider-Verse films.",
      "X-Men '97 continues the 1990s animated series.",
      "What If…? and Marvel Zombies explore alternate MCU universes.",
    ],
  },
];

export const CROSSINGS: Crossing[] = [
  {
    year: 2021,
    title: "Loki",
    slug: "loki",
    from: "Outside the Multiverse",
    to: "Earth-616",
    what: "The TVA's Sacred Timeline breaks open and branches into a multiverse.",
  },
  {
    year: 2021,
    title: "Spider-Man: No Way Home",
    slug: "spider-man-no-way-home",
    from: "Earth-96283 · Earth-120703",
    to: "Earth-616",
    what: "Tobey's and Andrew's Peters and their villains are pulled into the MCU.",
  },
  {
    year: 2022,
    title: "Doctor Strange in the Multiverse of Madness",
    slug: "doctor-strange-in-the-multiverse-of-madness",
    from: "Earth-616",
    to: "Earth-838",
    what: "Strange meets the Illuminati and learns about incursions.",
  },
  {
    year: 2023,
    title: "The Marvels",
    slug: "the-marvels",
    from: "Earth-616",
    to: "An X-Men world",
    what: "Monica Rambeau wakes up beside Kelsey Grammer's Beast.",
  },
  {
    year: 2024,
    title: "Deadpool & Wolverine",
    slug: "deadpool-and-wolverine",
    from: "Earth-10005",
    to: "The TVA & the Void",
    what: "Deadpool saves the Fox X-Men universe and meets forgotten heroes in the Void.",
  },
  {
    year: 2025,
    title: "Thunderbolts*",
    slug: "thunderbolts",
    from: "Earth-828",
    to: "Earth-616",
    what: "The Fantastic Four's ship arrives in the MCU.",
  },
  {
    year: 2026,
    title: "Avengers: Doomsday",
    slug: "avengers-doomsday",
    from: "616 · 828 · 10005",
    to: "Collision",
    what: "Avengers, Fantastic Four and X-Men face Doctor Doom.",
  },
];

export function getEarth(id: string): Earth | null {
  return EARTHS.find((e) => e.id === id) ?? null;
}

/** Bumped whenever facts change, so cached AI briefings regenerate. */
export const MULTIVERSE_VERSION = "2026-11-23b";
