"use client";

import { useEffect, useRef, useState } from "react";
import { WatcherLoader } from "@/components/watcher-loader";
import { LlmNotice } from "@/components/llm-notice";
import { readLlmJson } from "@/lib/llm/browser";
import type { CodexProfile as Profile } from "@/lib/llm/codex";

/**
 * AI profile for one character. Starts on mount: profiles are cached
 * server-side and shared, so most visits are an instant cache hit.
 */
export function CodexProfile({
  query,
  name,
  llmEnabled,
  onResolved,
}: {
  /** `key=<codex key>` or `name=<free text>`. */
  query: string;
  name: string;
  llmEnabled: boolean;
  onResolved?: (p: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(llmEnabled);
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/llm/codex?${query}`, { signal: ac.signal });
      const p = await readLlmJson<Profile>(res);
      setProfile(p);
      onResolved?.(p);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  };

  useEffect(() => {
    if (llmEnabled) void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, llmEnabled]);

  if (!llmEnabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-850 p-4 text-sm text-white/50">
        AI profiles are unavailable right now. Stats and appearances are still below.
      </p>
    );
  }
  if (error) return <LlmNotice error={error} onRetry={() => void load()} />;
  if (loading || !profile) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-850 p-5">
        <WatcherLoader label={`Reading ${name}'s file…`} />
      </div>
    );
  }
  if (!profile.found) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-850 p-4 text-sm text-white/60">
        The Watcher couldn&rsquo;t find a Marvel character called &ldquo;{name}&rdquo;. Check the
        spelling or try their hero name.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel panel-accent rounded-xl p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Their story</h2>
        <p className="text-pretty text-[15px] leading-relaxed text-white/80">{profile.summary}</p>
      </section>

      {profile.timeline.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Timeline</h2>
          <ol className="relative space-y-3 pl-6">
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-white/12" aria-hidden />
            {profile.timeline.map((t, i) => (
              <li key={`${t.era}-${i}`} className="relative">
                <span
                  className="absolute -left-6 top-[7px] h-[9px] w-[9px] rounded-full ring-4 ring-ink-950"
                  style={{ backgroundColor: "var(--c-primary)" }}
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t.era}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-white/75">{t.event}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(profile.power.explanation || profile.versus.length > 0) && (
        <section className="rounded-xl border border-white/10 bg-ink-850 p-5">
          <h2 className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
            How powerful
            {profile.power.tier && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: "var(--c-primary)" }}
              >
                {profile.power.tier}
              </span>
            )}
          </h2>
          {profile.power.explanation && (
            <p className="text-[14px] leading-relaxed text-white/75">{profile.power.explanation}</p>
          )}
          {profile.versus.length > 0 && (
            <ul className="mt-4 space-y-2">
              {profile.versus.map((v) => (
                <li key={v.name} className="text-[14px] leading-relaxed text-white/70">
                  <span className="font-bold text-white">vs {v.name}:</span> {v.verdict}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {profile.screen && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">On screen</h2>
          <p className="text-[14px] leading-relaxed text-white/75">{profile.screen}</p>
        </section>
      )}

      <p className="text-[11px] text-white/25">
        Written by an open-weights model on Hugging Face from fan-rated stats and this catalog.
        Treat power comparisons as debate fuel, not canon.
      </p>
    </div>
  );
}
