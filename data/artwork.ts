/**
 * Curated TMDB image paths so the catalog can render HD posters/backdrops
 * before `npm run sync`. image.tmdb.org does not need an API key once the
 * file path is known. Seed only fills empty artwork so a later sync wins.
 *
 * Paths in this file were HEAD-checked against the TMDB CDN.
 */

export type SeedArt = { poster?: string; backdrop?: string };

export const SEED_ART: Record<string, SeedArt> = {
  "captain-america-civil-war": {
    poster: "/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg",
  },
  "avengers-infinity-war": {
    poster: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
  },
  "captain-marvel": {
    poster: "/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg",
  },
  "avengers-endgame": {
    poster: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  },
  "black-widow": {
    poster: "/qAZ0pzat24kLdO3o8ejmbLxyOac.jpg",
  },
  "spider-man-no-way-home": {
    poster: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
  },
  "doctor-strange-in-the-multiverse-of-madness": {
    poster: "/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg",
  },
  "thor-love-and-thunder": {
    poster: "/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
  },
  "black-panther-wakanda-forever": {
    poster: "/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
    backdrop: "/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg",
  },
  "guardians-of-the-galaxy-vol-3": {
    poster: "/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg",
    backdrop: "/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
  },
  "deadpool-and-wolverine": {
    poster: "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    backdrop: "/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
  },
  "spider-man-into-the-spider-verse": {
    poster: "/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
  },
  "spider-man-across-the-spider-verse": {
    poster: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  },
  "deadpool-2": {
    poster: "/to0spRl1CMDvyUbOnbb4fTk3VAd.jpg",
  },
  venom: {
    poster: "/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg",
  },
};
