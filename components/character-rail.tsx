import Image from "next/image";
import Link from "next/link";
import { getCharacter, themeVars, withAlpha } from "@/lib/characters";
import { posterUrl } from "@/lib/tmdb/images";

type CharacterSummary = {
  slug: string;
  name: string;
  realName: string | null;
  bio: string | null;
  appearanceCount: number;
  art: { posterPath: string | null; slug: string } | null;
};

/**
 * Character rail. Each tile is skinned in that character's own suit
 * colours, which is what makes the row read as a lineup of heroes rather
 * than a uniform grid.
 */
export function CharacterRail({ characters }: { characters: CharacterSummary[] }) {
  if (characters.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mb-3 px-4 sm:px-6 lg:px-10">
        <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          <span className="h-5 w-[3px] rounded-full bg-marvel" />
          <Link href="/characters" className="transition-colors hover:text-marvel-400">
            Browse by character
          </Link>
        </h2>
        <p className="mt-1 pl-[14px] text-sm text-white/45">
          Every appearance, threaded in story order.
        </p>
      </div>

      <div className="rail flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {characters.map((c) => {
          const theme = getCharacter(c.slug);
          const poster = posterUrl(c.art?.posterPath, "w342");

          return (
            <Link
              key={c.slug}
              href={`/characters/${c.slug}`}
              style={themeVars(theme)}
              className="group relative w-[150px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/[0.08] transition-all hover:ring-[var(--c-primary)] hover:glow-primary sm:w-[168px]"
            >
              <div className="relative aspect-[3/4]">
                {poster ? (
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes="168px"
                    quality={75}
                    className="object-cover opacity-45 transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"
                  />
                ) : (
                  <div className="h-full bg-ink-800" />
                )}

                {/* Suit-coloured wash so the tile is unmistakably theirs. */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(165deg, ${withAlpha(
                      theme.primary,
                      0.72
                    )} 0%, ${withAlpha(theme.secondary, 0.82)} 100%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute inset-x-3 bottom-3">
                  <h3 className="title-stroke text-[15px] font-black uppercase leading-tight tracking-tight text-white drop-shadow">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                    {c.appearanceCount} {c.appearanceCount === 1 ? "title" : "titles"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
