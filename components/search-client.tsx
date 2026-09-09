"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { TitleCard } from "@/components/title-card";
import { WatcherLoader } from "@/components/watcher-loader";
import { cn } from "@/lib/utils";
import { useLlmEnabled } from "@/lib/llm/use-status";
import type { TitleCard as TitleCardData } from "@/lib/queries";

const EXAMPLES = [
  "the one where Cap fights Tony",
  "movies with the purple guy",
  "everything with Wanda",
  "street-level heroes in New York",
  "the funniest space ones",
];

type Mode = "instant" | "ai";

export function SearchClient({
  initialQuery,
  initialResults,
  llmEnabled,
}: {
  initialQuery: string;
  initialResults: TitleCardData[];
  llmEnabled: boolean;
}) {
  const liveEnabled = useLlmEnabled(llmEnabled);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>("instant");
  const [results, setResults] = useState<TitleCardData[]>(initialResults);
  const [reasoning, setReasoning] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Abort the in-flight request when a newer keystroke supersedes it, so
  // slow responses can't overwrite fresher results.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runInstant = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (q.trim().length < 2) {
      setResults([]);
      setReasoning("");
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const json = await res.json();
      setResults(json.titles ?? []);
      setReasoning("");
    } catch {
      // Aborted or offline; leave the previous results in place.
    }
  }, []);

  // Debounced instant search.
  useEffect(() => {
    if (mode !== "instant") return;
    const id = setTimeout(() => void runInstant(query), 220);
    return () => clearTimeout(id);
  }, [query, mode, runInstant]);

  const runAi = async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/llm/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, limit: 18 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.titles ?? []);
      setReasoning(json.reasoning ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ai") void runAi(query);
    else void runInstant(query);
  };

  return (
    <>
      <header className="mx-auto max-w-3xl">
        <h1 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
          Search the multiverse
        </h1>

        <form onSubmit={onSubmit} className="mt-7">
          <div className="relative">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/35">
              {mode === "ai" ? <Sparkles className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "ai"
                  ? "Describe it however you remember it…"
                  : "Search titles and descriptions…"
              }
              className="w-full rounded-full border border-white/12 bg-white/[0.06] py-4 pl-14 pr-[4.25rem] text-base text-white placeholder:text-white/30 focus:border-marvel focus:outline-none focus:ring-0 sm:pr-32"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Search"
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-primary-grad text-sm font-bold text-white disabled:opacity-60 sm:w-auto sm:px-5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <ModeChip
              active={mode === "instant"}
              onClick={() => {
                setMode("instant");
                setReasoning("");
              }}
            >
              Instant
            </ModeChip>
            <ModeChip
              active={mode === "ai"}
              onClick={() => {
                if (!liveEnabled) return;
                setMode("ai");
                if (query.trim().length >= 2) void runAi(query);
              }}
              disabled={!liveEnabled}
              title={liveEnabled ? undefined : "Ask the Watcher is unavailable"}
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              Ask in plain English
            </ModeChip>
          </div>
        </form>

        {(mode === "ai" || !query) && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  if (liveEnabled) {
                    setMode("ai");
                    void runAi(ex);
                  } else {
                    void runInstant(ex);
                  }
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/55 transition-colors hover:border-marvel/50 hover:text-white"
              >
                &ldquo;{ex}&rdquo;
              </button>
            ))}
          </div>
        )}
      </header>

      {loading && (
        <div className="mx-auto mt-8 max-w-md">
          <WatcherLoader />
        </div>
      )}

      {error && (
        <p className="mx-auto mt-8 max-w-lg rounded-lg border border-amber-500/25 bg-amber-500/10 p-3.5 text-center text-sm text-amber-200">
          {error}
        </p>
      )}

      {reasoning && (
        <p className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/10 bg-ink-850 p-4 text-center text-[15px] leading-relaxed text-white/70">
          {reasoning}
        </p>
      )}

      <div className="mt-10">
        {results.length > 0 ? (
          <>
            <p className="mb-5 text-sm text-white/35">{results.length} results</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {results.map((t, i) => (
                <TitleCard key={t.id} title={t} className="w-full" priority={i < 12} />
              ))}
            </div>
          </>
        ) : (
          query.trim().length >= 2 &&
          !loading && (
            <p className="py-16 text-center text-white/40">
              Nothing found for &ldquo;{query}&rdquo;.
              {mode === "instant" && liveEnabled && (
                <>
                  {" "}
                  Try{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("ai");
                      void runAi(query);
                    }}
                    className="text-marvel-400 underline underline-offset-2"
                  >
                    asking in plain English
                  </button>
                  .
                </>
              )}
            </p>
          )
        )}
      </div>
    </>
  );
}

function ModeChip({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-marvel text-white"
          : "bg-white/[0.07] text-white/55 hover:bg-white/15 hover:text-white",
        disabled && "cursor-not-allowed opacity-40 hover:bg-white/[0.07]"
      )}
    >
      {children}
    </button>
  );
}
