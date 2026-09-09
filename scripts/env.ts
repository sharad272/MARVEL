/**
 * Loads env for standalone scripts.
 *
 * `.env.local` is a Next.js convention that plain Node/tsx knows nothing
 * about, so the CLI scripts have to opt in explicitly. Import this first,
 * before anything that reads process.env.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Later calls don't override earlier ones, so .env.local wins.
config({ path: resolve(root, ".env.local"), quiet: true });
config({ path: resolve(root, ".env"), quiet: true });

export const env = {
  tmdbKey: process.env.TMDB_API_KEY?.trim() ?? "",
  groqKey: process.env.GROQ_API_KEY?.trim() ?? "",
  hfToken: process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim() || "",
  region: process.env.WATCH_REGION?.trim() || "US",
  mediaRoot: process.env.LOCAL_MEDIA_ROOT?.trim() ?? "",
};
