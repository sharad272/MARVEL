import Link from "next/link";
import { CharacterTile } from "@/components/character-tile";
import type { CharacterSummary } from "@/lib/queries";

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
        {characters.map((c, i) => (
          <CharacterTile
            key={c.slug}
            slug={c.slug}
            name={c.name}
            realName={c.realName}
            appearanceCount={c.appearanceCount}
            art={c.art}
            layout="rail"
            priority={i < 4}
          />
        ))}
      </div>
    </section>
  );
}
