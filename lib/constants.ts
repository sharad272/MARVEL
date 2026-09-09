/**
 * Enum-like constants. SQLite can't hold real enums, so these are the
 * source of truth for every string-typed column in the Prisma schema.
 */

export const MEDIA_TYPE = {
  FILM: "FILM",
  SERIES: "SERIES",
} as const;
export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

export const FRANCHISE = {
  MCU: "MCU",
  DEFENDERS: "DEFENDERS",
  XMEN: "XMEN",
  SONY: "SONY",
  ANIMATED: "ANIMATED",
  OTHER: "OTHER",
} as const;
export type Franchise = (typeof FRANCHISE)[keyof typeof FRANCHISE];

export const FRANCHISE_META: Record<
  Franchise,
  { label: string; blurb: string; accent: string }
> = {
  MCU: {
    label: "Marvel Cinematic Universe",
    blurb: "The Infinity, Multiverse and Mutant sagas — Marvel Studios' main continuity.",
    accent: "#e62429",
  },
  DEFENDERS: {
    label: "The Defenders Saga",
    blurb: "Hell's Kitchen street level — Daredevil, Jessica Jones, Luke Cage, Iron Fist, Punisher.",
    accent: "#8b0e11",
  },
  XMEN: {
    label: "X-Men (20th Century Fox)",
    blurb: "Two decades of mutant cinema, from the 2000 original through Logan and Deadpool.",
    accent: "#f0a500",
  },
  SONY: {
    label: "Sony's Spider-Man Universe",
    blurb: "The Raimi and Webb trilogies, the Venom films and the Spider-Verse animations.",
    accent: "#1b4f9c",
  },
  ANIMATED: {
    label: "Animation",
    blurb: "What If…?, X-Men '97, Spider-Verse and the classic animated series.",
    accent: "#6b3fa0",
  },
  OTHER: {
    label: "Other Marvel",
    blurb: "Everything outside the main continuities — Blade, Punisher, Fantastic Four and more.",
    accent: "#4a5568",
  },
};

export const SAGA = {
  INFINITY: "Infinity Saga",
  MULTIVERSE: "Multiverse Saga",
  MUTANT: "Mutant Saga",
} as const;

/** MCU phase -> saga grouping, used by the phase browser. */
export const PHASE_SAGA: Record<number, string> = {
  1: SAGA.INFINITY,
  2: SAGA.INFINITY,
  3: SAGA.INFINITY,
  4: SAGA.MULTIVERSE,
  5: SAGA.MULTIVERSE,
  6: SAGA.MULTIVERSE,
  7: SAGA.MUTANT,
};

export const VIDEO_KIND = {
  TRAILER: "Trailer",
  TEASER: "Teaser",
  CLIP: "Clip",
  FEATURETTE: "Featurette",
  BEHIND_THE_SCENES: "Behind the Scenes",
} as const;
export type VideoKind = (typeof VIDEO_KIND)[keyof typeof VIDEO_KIND];

/** Ordering used when picking the single best video to feature. */
export const VIDEO_KIND_PRIORITY: VideoKind[] = [
  VIDEO_KIND.TRAILER,
  VIDEO_KIND.TEASER,
  VIDEO_KIND.CLIP,
  VIDEO_KIND.FEATURETTE,
  VIDEO_KIND.BEHIND_THE_SCENES,
];

export const AVAILABILITY_KIND = {
  FLATRATE: "FLATRATE",
  FREE: "FREE",
  ADS: "ADS",
  RENT: "RENT",
  BUY: "BUY",
} as const;
export type AvailabilityKind =
  (typeof AVAILABILITY_KIND)[keyof typeof AVAILABILITY_KIND];

export const AVAILABILITY_LABEL: Record<AvailabilityKind, string> = {
  FLATRATE: "Streaming",
  FREE: "Free",
  ADS: "Free with ads",
  RENT: "Rent",
  BUY: "Buy",
};

export const LIBRARY_STATUS = {
  WATCHLIST: "WATCHLIST",
  WATCHING: "WATCHING",
  WATCHED: "WATCHED",
  DROPPED: "DROPPED",
} as const;
export type LibraryStatus =
  (typeof LIBRARY_STATUS)[keyof typeof LIBRARY_STATUS];

export const LIBRARY_STATUS_LABEL: Record<LibraryStatus, string> = {
  WATCHLIST: "Watchlist",
  WATCHING: "Watching",
  WATCHED: "Watched",
  DROPPED: "Dropped",
};

export const VIEWING_ORDER = {
  RELEASE: "release",
  CHRONO: "chrono",
  PHASE: "phase",
  RECOMMENDED: "recommended",
} as const;
export type ViewingOrder = (typeof VIEWING_ORDER)[keyof typeof VIEWING_ORDER];

export const VIEWING_ORDER_META: Record<
  ViewingOrder,
  { label: string; blurb: string }
> = {
  release: {
    label: "Release order",
    blurb: "The way the world watched it. Every reveal lands when it was meant to.",
  },
  chrono: {
    label: "Timeline order",
    blurb: "In-universe chronology, from Captain America's war to the present day.",
  },
  phase: {
    label: "By phase",
    blurb: "Grouped into Marvel Studios' phases and sagas.",
  },
  recommended: {
    label: "First watch",
    blurb: "A curated path for newcomers — the essentials, in the best order to meet them.",
  },
};

/** Playback treats a title as finished past this fraction of its runtime. */
export const COMPLETION_THRESHOLD = 0.92;

/** Progress below this many seconds is discarded rather than resumed. */
export const MIN_RESUME_SECONDS = 15;
