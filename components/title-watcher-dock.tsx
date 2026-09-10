"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import { cn } from "@/lib/utils";

/**
 * Ask + Generate stay on screen on phones. Portaled to `document.body` so
 * `overflow-x: hidden` on body (and `main`'s stacking context) can't pin
 * the bar to the document foot — which is why Civil War looked like it
 * had no Ask/Generate until you scrolled to the footer.
 */
export function TitleWatcherDock({
  slug,
  name,
  aboveTabBar = true,
}: {
  slug: string;
  name: string;
  /** Watch pages hide the tab nav, so the dock sits on the safe area. */
  aboveTabBar?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const bottom = aboveTabBar
    ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
    : "bottom-[env(safe-area-inset-bottom)]";

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 z-[45] border-t border-white/10 bg-ink-950/95 p-2 backdrop-blur-xl md:hidden",
        bottom
      )}
      data-title-dock=""
    >
      <TitleWatcherActions slug={slug} name={name} variant="dock" />
    </div>,
    document.body
  );
}
