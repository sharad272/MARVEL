"use client";

import { useMemo, useRef, useState } from "react";
import { Swords } from "lucide-react";
import { StatBars } from "@/components/codex/stat-bars";
import { WatcherLoader } from "@/components/watcher-loader";
import { LlmNotice } from "@/components/llm-notice";
import { readLlmJson } from "@/lib/llm/browser";
import type { StatKey } from "@/lib/codex-stats";
import type { CodexVersus } from "@/lib/llm/codex";

export type VersusOption = {
  key: string;
  name: string;
  image: string;
  stats: Record<StatKey, number | null>;
};

export function VersusPicker({
  self,
  options,
  llmEnabled,
}: {
  self: VersusOption;
  options: VersusOption[];
  llmEnabled: boolean;
}) {
  const [q, setQ] = useState("");
  const [rival, setRival] = useState<VersusOption | null>(null);
  const [result, setResult] = useState<CodexVersus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return options.filter((o) => o.key !== self.key && o.name.toLowerCase().includes(n)).slice(0, 8);
  }, [q, options, self.key]);

  const fight = async (other: VersusOption) => {
    setRival(other);
    setQ("");
    setResult(null);
    setError(null);
    if (!llmEnabled) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/llm/codex?a=${encodeURIComponent(self.key)}&b=${encodeURIComponent(other.key)}`,
        { signal: ac.signal }
      );
      setResult(await readLlmJson<CodexVersus>(res));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-ink-850 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
        <Swords className="h-4 w-4" />
        Who would win?
      </h2>
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Pick someone to face ${self.name}…`}
          aria-label="Pick an opponent"
          className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--c-primary)] focus:outline-none"
        />
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-2xl">
            {matches.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => void fight(m)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                >
                  <img src={m.image} alt="" className="h-9 w-7 rounded object-cover object-top" />
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rival && (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-bold text-white">
            {self.name} <span className="text-white/40">vs</span> {rival.name}
          </p>
          <StatBars stats={self.stats} compare={rival.stats} />
          {loading && <WatcherLoader label="Simulating the fight…" />}
          {error && <LlmNotice error={error} onRetry={() => void fight(rival)} />}
          {result && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-[15px] font-black text-white">
                {result.winner && result.winner !== "Too close to call"
                  ? `Edge: ${result.winner}`
                  : "Too close to call"}
              </p>
              <p className="text-[14px] leading-relaxed text-white/75">{result.verdict}</p>
              {result.edges.map((e) => (
                <p key={e.name} className="text-[13px] text-white/60">
                  <span className="font-bold text-white/85">{e.name}:</span> {e.edge}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
