import Link from "next/link";
import Image from "next/image";
import { getCharactersByPresence } from "@/lib/queries";
import { getCharacter, themeVars, withAlpha } from "@/lib/characters";
import { posterUrl } from "@/lib/tmdb/images";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Characters",
  description: "Every Marvel character in the catalog, with their full appearance history.",
};

export default async function CharactersPage() {
  const characters = await getCharactersByPresence();

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Characters
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-white/55">
          {characters.length} heroes, villains and teams, ranked by how much of
          the catalog they carry. Open any one to trace their arc across every
          appearance in story order.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {characters.map((c) => {
          const theme = getCharacter(c.slug);
          const poster = posterUrl(c.art?.posterPath, "w342");

          return (
            <Link
              key={c.slug}
              href={`/characters/${c.slug}`}
              style={themeVars(theme)}
              className="group relative overflow-hidden rounded-xl ring-1 ring-white/[0.08] transition-all hover:ring-[var(--c-primary)] hover:glow-primary"
            >
              <div className="relative aspect-[3/4]">
                {poster ? (
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    quality={75}
                    className="object-cover opacity-40 transition-all duration-500 group-hover:scale-105 group-hover:opacity-55"
                  />
                ) : (
                  <div className="h-full bg-ink-800" />
                )}

                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(160deg, ${withAlpha(
                      theme.primary,
                      0.75
                    )} 0%, ${withAlpha(theme.secondary, 0.85)} 100%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                <div className="absolute inset-x-3 bottom-3">
                  <h2 className="title-stroke text-balance text-base font-black uppercase leading-none tracking-tight text-white drop-shadow">
                    {c.name}
                  </h2>
                  {c.realName && c.realName !== c.name && (
                    <p className="mt-1 text-[11px] font-medium text-white/70">{c.realName}</p>
                  )}
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {c.appearanceCount} {c.appearanceCount === 1 ? "title" : "titles"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
