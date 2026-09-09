import { PrismaClient } from "@prisma/client";
import { OFFICIAL_TRAILERS } from "../data/trailers.ts";

const db = new PrismaClient();

const titles = await db.title.findMany({
  select: {
    slug: true,
    name: true,
    mediaType: true,
    releaseDate: true,
    posterPath: true,
    backdropPath: true,
  },
  orderBy: { releaseDate: "desc" },
});

const total = titles.length;
const noPoster = titles.filter((t) => !t.posterPath);
const noBackdrop = titles.filter((t) => !t.backdropPath);
const noTrailerKey = titles.filter((t) => !OFFICIAL_TRAILERS[t.slug]);
const noArtAtAll = titles.filter(
  (t) => !t.posterPath && !OFFICIAL_TRAILERS[t.slug]
);

console.log(`total=${total}`);
console.log(`noPoster=${noPoster.length}`);
console.log(`noBackdrop=${noBackdrop.length}`);
console.log(`noTrailerKey=${noTrailerKey.length}`);
console.log(`noArtAtAll (blank fallback tile)=${noArtAtAll.length}`);

console.log("\n--- No posterPath (TMDB not synced) ---");
for (const t of noPoster) {
  console.log(
    `- [${t.mediaType}] ${t.name} (${t.slug}) release=${t.releaseDate?.toISOString().slice(0, 10)} trailerKey=${OFFICIAL_TRAILERS[t.slug] ? "yes" : "NO"}`
  );
}

console.log("\n--- No trailer key in data/trailers.ts ---");
for (const t of noTrailerKey) {
  console.log(
    `- [${t.mediaType}] ${t.name} (${t.slug}) release=${t.releaseDate?.toISOString().slice(0, 10)} posterPath=${t.posterPath ? "yes" : "NO"}`
  );
}

console.log("\n--- TRUE fallback (no poster AND no trailer key) ---");
for (const t of noArtAtAll) {
  console.log(`- [${t.mediaType}] ${t.name} (${t.slug})`);
}

await db.$disconnect();
