"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Play } from "lucide-react";
import { WatcherLoader } from "@/components/watcher-loader";
import { consumeSse } from "@/lib/llm/consume-sse";
import { isSse, llmPost, readLlmJson } from "@/lib/llm/browser";
import { useLlmEnabled } from "@/lib/llm/use-status";
import { TitleWatcherActions } from "@/components/title-watcher-actions";

type Arc = {
  summary: string;
  beats: { slug: string; beat: string; name?: string }[];
};

export function CharacterArc({
  slug,
  name,
  llmEnabled = true,
  autoStart = false,
}: {
  slug: string;
  name: string;
  llmEnabled?: boolean;
  autoStart?: boolean;
}) {
  const liveEnabled = useLlmEnabled(llmEnabled);
  const [arc, setArc] = useState<Arc | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setStreaming(true);
    setError(null);
    setArc({ summary: "", beats: [] });
    try {
      let res = await llmPost("/api/llm/arc", { slug }, ac.signal);
      if (!isSse(res)) {
        const json = await readLlmJson<Arc>(res);
        setArc({ summary: json.summary ?? "", beats: json.beats ?? [] });
        return;
      }
      try {
        await consumeSse(res, (event) => {
          if (event.type === "delta" && event.field === "answer") {
            setArc((cur) => ({
              summary: (cur?.summary ?? "") + event.text,
              beats: cur?.beats ?? [],
            }));
          } else if (event.type === "beats") {
            setArc((cur) => ({ summary: cur?.summary ?? "", beats: event.beats }));
          } else if (event.type === "error") {
            setError(event.error);
          }
        });
      } catch (streamErr) {
        if ((streamErr as Error).name === "AbortError") throw streamErr;
        res = await llmPost("/api/llm/arc", { slug }, ac.signal, true);
        const json = await readLlmJson<Arc>(res);
        setArc({ summary: json.summary ?? "", beats: json.beats ?? [] });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      if (abortRef.current === ac) {
        setLoading(false);
        setStreaming(false);
      }
    }
  };

  useEffect(() => {
    if (autoStart && liveEnabled) void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, liveEnabled, slug]);

  if (!liveEnabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-850 p-4 text-sm text-white/50">
        Character arcs are unavailable right now. You can still browse every appearance below.
      </p>
    );
  }

  if (error && !arc?.summary) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-300">Couldn&rsquo;t generate the arc</p>
        <p className="mt-1 text-[13px] leading-relaxed text-amber-200/70">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!arc && !loading) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        aria-label={`Generate ${name}’s arc`}
        className="speedlines group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-850 p-4 text-left transition-colors hover:border-[var(--c-primary)]"
      >
        <span className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-grad text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">
              Trace {name}&rsquo;s arc
            </span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-white/50">
              Who they start as, who they become, and what each title does to them.
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors group-hover:bg-white group-hover:text-black">
          Generate
        </span>
      </button>
    );
  }

  if (loading && !arc?.summary) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-850 p-5">
        <WatcherLoader label={`Tracing ${name}’s arc…`} />
      </div>
    );
  }

  if (!arc) return null;

  return (
    <div className="space-y-5">
      {(arc.summary || streaming) && (
        <section className="panel panel-accent rounded-xl p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
            The arc
          </h2>
          <p className="text-pretty text-[15px] leading-relaxed text-white/80">
            {arc.summary}
            {streaming ? (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-[var(--c-primary)]" />
            ) : null}
          </p>
        </section>
      )}

      {arc.beats.length > 0 && (
        <ol className="relative space-y-3 pl-6">
          <span
            className="absolute left-[5px] top-2 bottom-2 w-px bg-white/12"
            aria-hidden
          />
          {arc.beats.map((b, i) => (
            <li key={b.slug} className="relative">
              <span
                className="absolute -left-6 top-[7px] h-[9px] w-[9px] rounded-full ring-4 ring-ink-950"
                style={{ backgroundColor: "var(--c-primary)" }}
              />
              <div className="rounded-lg p-2 transition-colors hover:bg-white/[0.05]">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/title/${b.slug}`}
                    className="text-[11px] font-bold uppercase tracking-wider text-white/35 hover:text-white"
                  >
                    Beat {i + 1}
                    {b.name ? ` · ${b.name}` : ""}
                  </Link>
                  <Link
                    href={`/watch/${b.slug}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Play
                  </Link>
                </div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-white/75">{b.beat}</p>
                <TitleWatcherActions
                  slug={b.slug}
                  name={b.name ?? b.slug}
                  variant="compact"
                  className="mt-2"
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-[11px] text-white/25">
        Written by an open-weights model from the local appearance graph. Treat
        continuity details as a starting point, not gospel.
      </p>
    </div>
  );
}
