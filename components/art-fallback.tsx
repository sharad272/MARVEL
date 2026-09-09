import { getCharacter, withAlpha } from "@/lib/characters";
import { cn } from "@/lib/utils";

type Variant = "poster" | "backdrop" | "tile";

/**
 * Generated artwork for titles with no TMDB image.
 *
 * Rather than a grey placeholder, this composes a comic-style plate from
 * the title's character palette: suit-coloured gradient, halftone screen,
 * Kirby crackle and a stroked title treatment. The catalog is fully
 * browsable — and looks deliberate — before TMDB is ever configured.
 */
export function ArtFallback({
  name,
  themeSlug,
  variant = "poster",
  badge,
  className,
}: {
  name: string;
  themeSlug: string | null | undefined;
  variant?: Variant;
  /** Small overline, e.g. "Phase 4" or the franchise. */
  badge?: string | null;
  className?: string;
}) {
  const theme = getCharacter(themeSlug);

  // Long titles need to step down or they overflow the plate.
  const size =
    variant === "backdrop"
      ? name.length > 34
        ? "text-2xl sm:text-4xl"
        : "text-3xl sm:text-5xl"
      : variant === "tile"
        ? "text-base"
        : name.length > 26
          ? "text-sm"
          : name.length > 16
            ? "text-base"
            : "text-lg";

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(150deg, ${theme.primary} 0%, ${theme.secondary} 55%, #0b0d12 100%)`,
      }}
      aria-hidden
    >
      {/* Kirby crackle — two off-centre bursts in the accent colour. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 22% 18%, ${withAlpha(
            theme.accent,
            0.5
          )} 0%, transparent 45%), radial-gradient(circle at 82% 78%, ${withAlpha(
            "#000000",
            0.55
          )} 0%, transparent 55%)`,
        }}
      />

      {/* Halftone screen, the print-dot texture of a comic panel. */}
      <div
        className="absolute inset-0 opacity-[0.28] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
          backgroundSize: variant === "backdrop" ? "7px 7px" : "5px 5px",
        }}
      />

      {/* Speed lines sweeping from the lower left. */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `repeating-linear-gradient(-58deg, #000 0px, #000 1px, transparent 1px, transparent 11px)`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

      <div
        className={cn(
          "relative flex h-full flex-col justify-end p-3",
          variant === "backdrop" && "p-6 sm:p-10"
        )}
      >
        {badge && (
          <span className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/65">
            {badge}
          </span>
        )}
        <span
          className={cn(
            "title-stroke text-balance font-black uppercase leading-[0.92] tracking-tight text-white drop-shadow-lg",
            size
          )}
        >
          {name}
        </span>
      </div>
    </div>
  );
}
