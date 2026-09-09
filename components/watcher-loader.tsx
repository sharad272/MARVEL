"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";

const PHRASES = [
  "Consulting the Watcher…",
  "Matching that to the catalog…",
  "Checking continuity…",
  "Pulling the through-line…",
];

export function WatcherLoader({ label }: { label?: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm text-white/55">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-grad text-white shadow">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label ?? PHRASES[i]}
      </span>
    </div>
  );
}
