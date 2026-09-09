"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TitleCard } from "@/components/title-card";
import { cn } from "@/lib/utils";
import type { TitleCard as TitleCardData } from "@/lib/queries";

type Props = {
  heading: string;
  subheading?: string;
  titles: TitleCardData[];
  /** Number the cards — used for timeline and recommended rails. */
  numbered?: boolean;
  /** Resume percentages keyed by title id. */
  progressById?: Record<string, number>;
  href?: string;
  /** Cards open the player — used by Continue watching. */
  toWatch?: boolean;
  /** Per-title player URLs, e.g. episode resume. */
  watchHrefById?: Record<string, string>;
  priority?: boolean;
};

export function TitleRail({
  heading,
  subheading,
  titles,
  numbered,
  progressById,
  href,
  toWatch,
  watchHrefById,
  priority,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    // 8px slack absorbs sub-pixel rounding at fractional zoom levels.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, titles.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Leave a sliver of the next card visible so the rail reads as continuing.
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (titles.length === 0) return null;

  return (
    <section className="group/rail relative py-6">
      <div className="mb-3 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white sm:text-xl">
            <span className="h-5 w-[3px] rounded-full bg-marvel" />
            {href ? (
              <Link href={href} className="transition-colors hover:text-marvel-400">
                {heading}
              </Link>
            ) : (
              heading
            )}
          </h2>
          {subheading && (
            <p className="mt-1 line-clamp-2 pl-[14px] text-sm text-white/45">{subheading}</p>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className="shrink-0 text-xs font-semibold text-white/50 transition-colors hover:text-white"
          >
            See all →
          </Link>
        )}
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="rail flex gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 lg:px-10"
        >
          {titles.map((t, i) => (
            <TitleCard
              key={t.id}
              title={t}
              index={numbered ? i : undefined}
              progress={progressById?.[t.id]}
              toWatch={toWatch}
              watchHref={watchHrefById?.[t.id]}
              priority={priority && i < 6}
            />
          ))}
        </div>

        <RailArrow dir="left" onClick={() => scrollBy(-1)} hidden={atStart} />
        <RailArrow dir="right" onClick={() => scrollBy(1)} hidden={atEnd} />
      </div>
    </section>
  );
}

function RailArrow({
  dir,
  onClick,
  hidden,
}: {
  dir: "left" | "right";
  onClick: () => void;
  hidden: boolean;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      className={cn(
        "absolute top-0 z-10 hidden h-[calc(100%-2.5rem)] w-14 items-center justify-center",
        "bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent",
        "opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100",
        "focus-visible:opacity-100 md:flex",
        dir === "left" ? "left-0" : "right-0 rotate-180",
        hidden && "pointer-events-none !opacity-0"
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-transform hover:scale-110 hover:bg-white/20">
        <Icon className="h-6 w-6" />
      </span>
    </button>
  );
}
