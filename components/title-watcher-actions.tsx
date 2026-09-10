import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function titleAskHref(name: string) {
  return `/ask?q=${encodeURIComponent(`What do I need to watch before ${name}?`)}`;
}

export function titleGenerateHref(slug: string) {
  return `/title/${slug}?insights=1#insights`;
}

type Variant = "bar" | "links";

/**
 * One Ask + Generate pair per title surface.
 * `bar` is the secondary hero cluster (ghost pills next to Play).
 * `links` is the quiet row under cards, rails, and beats.
 */
export function TitleWatcherActions({
  slug,
  name,
  variant = "bar",
  className,
}: {
  slug: string;
  name: string;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "links") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
        <Link
          href={titleAskHref(name)}
          className="inline-flex min-h-8 items-center gap-1 text-[12px] font-semibold text-white/55 hover:text-white"
          aria-label={`Ask about ${name}`}
        >
          <Sparkles className="h-3 w-3" />
          Ask
        </Link>
        <span className="text-white/20" aria-hidden>
          ·
        </span>
        <Link
          href={titleGenerateHref(slug)}
          className="inline-flex min-h-8 items-center text-[12px] font-semibold text-white/55 hover:text-white"
          aria-label={`Generate a briefing for ${name}`}
        >
          Generate
        </Link>
      </div>
    );
  }

  const pill =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/20";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Link href={titleAskHref(name)} className={pill} aria-label={`Ask about ${name}`}>
        <Sparkles className="h-4 w-4" />
        Ask
      </Link>
      <Link
        href={titleGenerateHref(slug)}
        className={pill}
        aria-label={`Generate a briefing for ${name}`}
      >
        Generate
      </Link>
    </div>
  );
}
