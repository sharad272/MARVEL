"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArtFallback } from "@/components/art-fallback";
import {
  posterUrl,
  backdropUrl,
  youtubeThumb,
  type PosterSize,
  type BackdropSize,
} from "@/lib/tmdb/images";

type Props = {
  alt: string;
  sizes: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  youtubeKey?: string | null;
  themeSlug?: string | null;
  name?: string;
  /** Small overline on the fallback plate only, e.g. "Phase 4". */
  badge?: string | null;
  variant?: "poster" | "backdrop";
  /** Override the TMDB size fetched — bigger poster boxes want w780. */
  posterSize?: PosterSize;
  backdropSize?: BackdropSize;
  priority?: boolean;
  className?: string;
};

type Step = "tmdb" | "max" | "hq" | "none";

// YouTube serves a tiny ~120x90 "no thumbnail available" placeholder
// with an HTTP 200 (not a 404) when a video lacks a maxres/hq asset, so
// a hard `onError` alone can't catch it — it looks like a successful
// load. Anything narrower than this is treated as a miss too, so the
// ladder below advances on a suspiciously small `onLoad` as well.
const MIN_REAL_WIDTH = 300;

function nextStep(
  step: Step,
  youtubeKey?: string | null
): { step: Step; src: string | null } {
  if (step === "tmdb" && youtubeKey) {
    return { step: "max", src: youtubeThumb(youtubeKey, "max") };
  }
  if ((step === "tmdb" || step === "max") && youtubeKey) {
    return { step: "hq", src: youtubeThumb(youtubeKey, "hq") };
  }
  return { step: "none", src: null };
}

/**
 * HD cover: TMDB original/w780 first, then YouTube maxres, then hq, then
 * the comic-plate fallback. Both onError (hard failures) and onLoad
 * (YouTube's soft-fail tiny placeholder) walk that same ladder, so a
 * missing maxres reliably lands on a sharp real frame instead of a
 * blank-looking runt image.
 */
export function CoverArt({
  alt,
  sizes,
  posterPath,
  backdropPath,
  youtubeKey,
  themeSlug,
  name,
  badge,
  variant = "poster",
  posterSize = "w342",
  backdropSize = "w1280",
  priority,
  className = "object-cover",
}: Props) {
  const tmdb =
    variant === "backdrop"
      ? backdropUrl(backdropPath, backdropSize)
      : posterUrl(posterPath, posterSize);
  const initial: { src: string | null; step: Step } = tmdb
    ? { src: tmdb, step: "tmdb" }
    : youtubeKey
      ? { src: youtubeThumb(youtubeKey, "max"), step: "max" }
      : { src: null, step: "none" };
  const [src, setSrc] = useState<string | null>(initial.src);
  const stepRef = useRef<Step>(initial.step);

  if (!src) {
    return (
      <ArtFallback
        name={name ?? alt}
        themeSlug={themeSlug}
        variant={variant}
        badge={badge}
        className={className}
      />
    );
  }

  const advance = () => {
    const { step, src: nextSrc } = nextStep(stepRef.current, youtubeKey);
    stepRef.current = step;
    setSrc(nextSrc);
  };

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={75}
      unoptimized={src.includes("i.ytimg.com")}
      className={className}
      onError={advance}
      onLoad={(e) => {
        const w = e.currentTarget.naturalWidth;
        if (stepRef.current !== "none" && w > 0 && w < MIN_REAL_WIDTH) {
          advance();
        }
      }}
    />
  );
}
