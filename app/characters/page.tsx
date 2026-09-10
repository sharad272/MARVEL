import Link from "next/link";
import { CharacterTile } from "@/components/character-tile";
import { getCharactersByPresence } from "@/lib/queries";

export const revalidate = 3600;

export const metadata = {
  title: "Characters",
  description: "Every Marvel character in the catalog, with their full appearance history.",
};

export default async function CharactersPage() {
  const characters = await getCharactersByPresence();

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16 lg:px-10">
      <header className="mb-8 max-w-2xl sm:mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Characters
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-white/55 sm:text-base">
          {characters.length} heroes, villains and teams, ranked by how much of
          the catalog they carry. Open any one to trace their arc across every
          appearance in story order.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {characters.map((c, i) => (
          <CharacterTile
            key={c.slug}
            slug={c.slug}
            name={c.name}
            realName={c.realName}
            appearanceCount={c.appearanceCount}
            art={c.art}
            priority={i < 8}
          />
        ))}
      </div>
    </div>
  );
}
