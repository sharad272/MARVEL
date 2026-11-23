"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { WatcherLoader } from "@/components/watcher-loader";
import { LlmNotice } from "@/components/llm-notice";
import { readLlmJson } from "@/lib/llm/browser";
import { useLlmEnabled } from "@/lib/llm/use-status";
import type { EarthBriefing as Briefing } from "@/lib/llm/multiverse";

export function EarthBriefing({
  earthId,
  label,
  blurb,
  llmEnabled = true,
  autoStart = false,
}: {
  earthId: string;
  label: string;
  blurb: string;
  llmEnabled?: boolean;
  autoStart?: boolean;
}) {
  const liveEnabled = useLlmEnabled(llmEnabled);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/llm/multiverse?earth=${encodeURIComponent(earthId)}`, {
        signal: ac.signal,
      });
      setBriefing(await readLlmJson<Briefing>(res));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  };

  useEffect(() => {
    if (autoStart && liveEnabled) void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, liveEnabled, earthId]);

  if (!liveEnabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-850 p-4 text-sm text-white/50">
        AI briefings are unavailable right now. The facts and titles below still tell the story.
      </p>
    );
  }

  if (error) return <LlmNotice error={error} onRetry={() => void load()} />;

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-850 p-5">
        <WatcherLoader label="The Watcher is reading this universe…" />
      </div>
    );
  }

  if (!briefing) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        className="speedlines group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-850 p-4 text-left transition-colors hover:border-[var(--c-primary)]"
      >
        <span className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-grad text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">{label}</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-white/50">{blurb}</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors group-hover:bg-white group-hover:text-black">
          Explain
        </span>
      </button>
    );
  }

  return (
    <section className="panel panel-accent space-y-4 rounded-xl p-5">
      {briefing.headline && (
        <p className="text-[15px] font-bold leading-snug text-white">{briefing.headline}</p>
      )}
      <p className="text-pretty text-[15px] leading-relaxed text-white/80">{briefing.summary}</p>
      {briefing.keyMoments.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Key moments
          </h4>
          <ul className="space-y-1.5 text-[14px] leading-relaxed text-white/75">
            {briefing.keyMoments.map((m) => (
              <li key={m} className="flex gap-2">
                <span
                  className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--c-primary)" }}
                />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {briefing.doomsday && (
        <div className="rounded-lg border border-white/10 bg-black/25 p-3.5">
          <h4 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Road to Doomsday
          </h4>
          <p className="text-[14px] leading-relaxed text-white/75">{briefing.doomsday}</p>
        </div>
      )}
      <p className="text-[11px] text-white/25">
        Written by an open-weights model on Hugging Face from curated facts and the catalog. Spoilers
        for released titles.
      </p>
    </section>
  );
}
