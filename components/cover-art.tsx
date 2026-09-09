"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArtFallback } from "@/components/art-fallback";
import { posterUrl, backdropUrl, youtubeThumb } from "@/lib/tmdb/images";

type Props = {
  alt: string;
  sizes: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  youtubeKey?: string | null;
  themeSlug?: string | null;
  name?: string;
  variant?: "poster" | "backdrop";
  priority?: boolean;
  className?: string;
};

type Step = "tmdb" | "max" | "hq" | "none";

/**
 * HD cover: TMDB original/w780 first, then YouTube maxres, then hq, then
 * the comic-plate fallback. onError walks that ladder so a missing maxres
 * still lands on a sharp frame.
 */
export function CoverArt({
  alt,
  sizes,
  posterPath,
  backdropPath,
  youtubeKey,
  themeSlug,
  name,
  variant = "poster",
  priority,
  className = "object-cover",
}: Props) {
  const tmdb =
    variant === "backdrop"
      ? backdropUrl(backdropPath, "w1280")
      : posterUrl(posterPath, "w342");
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
        className={className}
      />
    );
  }

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
      onError={() => {
        const s = stepRef.current;
        if (s === "tmdb" && youtubeKey) {
          stepRef.current = "max";
          setSrc(youtubeThumb(youtubeKey, "max"));
          return;
        }
        if ((s === "tmdb" || s === "max") && youtubeKey) {
          stepRef.current = "hq";
          setSrc(youtubeThumb(youtubeKey, "hq"));
          return;
        }
        stepRef.current = "none";
        setSrc(null);
      }}
    />
  );
}
