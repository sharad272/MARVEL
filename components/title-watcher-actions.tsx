import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function titleAskHref(name: string) {
  return `/ask?q=${encodeURIComponent(`What do I need to watch before ${name}?`)}`;
}

export function titleGenerateHref(slug: string) {
  return `/title/${slug}?insights=1#insights`;
}

type Variant = "bar" | "compact" | "dock";

/**
 * Ask + Generate for a title. Same pair everywhere: title pages, cards,
 * rails, timeline, watch. Compact is for poster grids; dock is the
 * always-visible phone bar above the tab nav.
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
  const compact = variant === "compact";
  const dock = variant === "dock";
  const askClass = compact
    ? "inline-flex min-h-9 items-center justify-center gap-1 rounded-full bg-white/10 px-2 text-[11px] font-bold text-white hover:bg-white/20"
    : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20";
  const genClass = compact
    ? "inline-flex min-h-9 items-center justify-center rounded-full bg-white px-2 text-[11px] font-bold text-black hover:bg-white/90"
    : "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-3 text-sm font-bold text-black hover:bg-white/90";

  return (
    <div className={cn("grid grid-cols-2 gap-1.5 sm:gap-2", dock && "gap-2", className)}>
      <Link href={titleAskHref(name)} className={askClass} aria-label={`Ask about ${name}`}>
        <Sparkles className={compact ? "h-3 w-3" : "h-4 w-4"} />
        Ask
      </Link>
      <Link href={titleGenerateHref(slug)} className={genClass} aria-label={`Generate a briefing for ${name}`}>
        Generate
      </Link>
    </div>
  );
}
