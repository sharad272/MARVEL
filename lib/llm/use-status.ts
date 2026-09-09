"use client";

import { useEffect, useState } from "react";

/** If the page was rendered with LLM off (stale build-time env), re-check at runtime. */
export function useLlmEnabled(initial: boolean): boolean {
  const [enabled, setEnabled] = useState(initial);

  useEffect(() => {
    if (initial) {
      setEnabled(true);
      return;
    }
    let cancelled = false;
    fetch("/api/llm/ask", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { enabled?: boolean }) => {
        if (!cancelled && j.enabled) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return enabled;
}
