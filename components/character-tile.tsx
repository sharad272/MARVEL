import Link from "next/link";
import { getCharacter, themeVars, withAlpha } from "@/lib/characters";
import { CoverArt } from "@/components/cover-art";
import { cn } from "@/lib/utils";
import type { CharacterWallpaper } from "@/lib/character-art";

type Props = {
  slug: string;
  name: string;
  realName?: string | null;
  appearanceCount: number;
  art: CharacterWallpaper;
  /** Wider rail tiles vs compact grid cells. */
  layout?: "grid" | "rail";
  priority?: boolean;
};

/**
 * Character card with a real still (poster → backdrop → trailer frame →
 * comic plate). The suit wash is only a foot gradient so the wallpaper
 * stays visible — the old full-tile overlay looked like a blank colour.
 */
export function CharacterTile({
  slug,
  name,
  realName,
  appearanceCount,
  art,
  layout = "grid",
  priority,
}: Props) {
  const theme = getCharacter(slug);
  const variant = art.posterPath ? "poster" : "backdrop";

  return (
    <Link
      href={`/characters/${slug}`}
      style={themeVars(theme)}
      className={cn(
        "group relative overflow-hidden rounded-xl ring-1 ring-white/[0.08] transition-all hover:ring-[var(--c-primary)] hover:glow-primary",
        layout === "rail" && "w-[42vw] max-w-[168px] shrink-0 sm:w-[168px]"
      )}
    >
      <div className="relative aspect-[3/4]">
        <CoverArt
          alt=""
          name={name}
          themeSlug={slug}
          posterPath={art.posterPath}
          backdropPath={art.backdropPath}
          youtubeKey={art.youtubeKey}
          variant={variant}
          posterSize="w500"
          backdropSize="w780"
          sizes={
            layout === "rail"
              ? "(max-width: 640px) 42vw, 168px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px"
          }
          priority={priority}
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/15" />
        <div
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background: `linear-gradient(to top, ${withAlpha(theme.primary, 0.42)}, transparent)`,
          }}
        />

        <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3">
          <h3 className="title-stroke line-clamp-2 text-balance text-[13px] font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow sm:text-base">
            {name}
          </h3>
          {realName && realName !== name && (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-white/70">{realName}</p>
          )}
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/65">
            {appearanceCount} {appearanceCount === 1 ? "title" : "titles"}
          </p>
        </div>
      </div>
    </Link>
  );
}
