import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCharacterWithAppearances } from "@/lib/queries";
import { getCharacter, themeVars, withAlpha } from "@/lib/characters";
import { ArtFallback } from "@/components/art-fallback";
import { backdropUrl } from "@/lib/tmdb/images";
import { TitleCard } from "@/components/title-card";
import { CharacterArc } from "@/components/character-arc";
import { hasLlm } from "@/lib/llm/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Params = { params: Promise<{ slug: string }> };
type PageProps = Params & { searchParams: Promise<{ arc?: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const character = await getCharacterWithAppearances(slug);
  return { title: character?.name ?? "Character" };
}

export default async function CharacterPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { arc: arcFlag } = await searchParams;
  const character = await getCharacterWithAppearances(slug);
  if (!character) notFound();

  const theme = getCharacter(slug);

  // In-universe order where known, release order otherwise — the same rule
  // the LLM arc uses, so the numbered beats line up with these cards.
  const titles = character.appearances
    .map((a) => a.title)
    .sort((a, b) => {
      if (a.chronoOrder != null && b.chronoOrder != null) return a.chronoOrder - b.chronoOrder;
      if (a.chronoOrder != null) return -1;
      if (b.chronoOrder != null) return 1;
      return (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0);
    });

  const leadTitle = character.appearances.find((a) => a.role === "LEAD")?.title;
  const backdrop = backdropUrl(leadTitle?.backdropPath);

  return (
    <div style={themeVars(theme)}>
      <div className="relative min-h-[50vh] overflow-hidden">
        {backdrop ? (
          <Image src={backdrop} alt="" fill priority sizes="100vw" quality={75} className="object-cover object-top" />
        ) : (
          <ArtFallback name="" themeSlug={slug} variant="backdrop" />
        )}

        {/* Heavier character wash than a title page: this is the hero's own
            room, not a film's. */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, ${withAlpha(theme.primary, 0.8)} 0%, ${withAlpha(
              theme.secondary,
              0.9
            )} 100%)`,
          }}
        />
        <div className="hero-scrim absolute inset-0" />

        <div className="relative mx-auto flex min-h-[50vh] max-w-[1500px] items-end px-4 pb-10 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-6 sm:pt-28 lg:px-10">
          <div className="max-w-3xl">
            <h1 className="title-stroke text-balance text-[2.25rem] font-black uppercase leading-[0.9] tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
              {character.name}
            </h1>
            {character.realName && character.realName !== character.name && (
              <p className="mt-3 text-lg font-semibold text-white/85">{character.realName}</p>
            )}
            {character.bio && (
              <p className="mt-4 max-w-xl text-pretty text-lg italic leading-relaxed text-white/75">
                &ldquo;{character.bio}&rdquo;
              </p>
            )}
            <p className="mt-5 text-sm font-bold uppercase tracking-widest text-white/60">
              {titles.length} {titles.length === 1 ? "appearance" : "appearances"}
            </p>
            <Link
              href={`/ask?q=${encodeURIComponent(`Trace ${character.name}'s arc`)}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:scale-[1.02]"
            >
              Ask about {character.name}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
        <CharacterArc
          slug={slug}
          name={character.name}
          llmEnabled={hasLlm()}
          autoStart={Boolean(arcFlag)}
        />

        <section className="mt-12">
          <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
            <span
              className="h-5 w-[3px] rounded-full"
              style={{ backgroundColor: "var(--c-primary)" }}
            />
            Every appearance, in story order
          </h2>

          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {titles.map((t, i) => (
              <TitleCard key={t.id} title={t} index={i} className="w-full" priority={i < 6} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
