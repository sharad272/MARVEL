"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ScrollText, ListChecks } from "lucide-react";
import { LlmNotice } from "@/components/llm-notice";
import { ResultStrip } from "@/components/result-strip";
import { WatcherLoader } from "@/components/watcher-loader";
import { consumeSse } from "@/lib/llm/consume-sse";
import { isSse, llmPost, readLlmJson } from "@/lib/llm/browser";
import { useLlmEnabled } from "@/lib/llm/use-status";
import type { TitleCard } from "@/lib/queries";

type Insights = {
  recap: string;
  explanation: string;
  essential: TitleCard[];
  helpful: TitleCard[];
};

export function TitleInsights({
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
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const load = async () => {
    setLoading(true);
    setStreaming(true);
    setError(null);
    setData({ recap: "", explanation: "", essential: [], helpful: [] });
    try {
      let res = await llmPost("/api/llm/recap", { slug });
      if (!isSse(res)) {
        const json = await readLlmJson<Insights>(res);
        setData({
          recap: json.recap ?? "",
          explanation: json.explanation ?? "",
          essential: json.essential ?? [],
          helpful: json.helpful ?? [],
        });
        return;
      }
      try {
        await consumeSse(res, (event) => {
          if (event.type === "delta") {
            setData((cur) => ({
              recap: (cur?.recap ?? "") + (event.field === "recap" ? event.text : ""),
              explanation: (cur?.explanation ?? "") + (event.field === "answer" ? event.text : ""),
              essential: cur?.essential ?? [],
              helpful: cur?.helpful ?? [],
            }));
          } else if (event.type === "titles") {
            setData((cur) => ({
              recap: cur?.recap ?? "",
              explanation: cur?.explanation ?? "",
              essential: event.role === "essential" ? event.titles : cur?.essential ?? [],
              helpful: event.role === "helpful" ? event.titles : cur?.helpful ?? [],
            }));
          } else if (event.type === "error") {
            setError(event.error);
          }
        });
      } catch (streamErr) {
        if ((streamErr as Error).name === "AbortError") throw streamErr;
        res = await llmPost("/api/llm/recap", { slug }, undefined, true);
        const json = await readLlmJson<Insights>(res);
        setData({
          recap: json.recap ?? "",
          explanation: json.explanation ?? "",
          essential: json.essential ?? [],
          helpful: json.helpful ?? [],
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (!autoStart || !liveEnabled || started.current) return;
    started.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, liveEnabled, slug]);

  if (!liveEnabled) {
    return (
      <div id="insights" className="scroll-mt-[5.5rem] rounded-xl border border-white/10 bg-ink-850 p-4 sm:scroll-mt-28">
        <p className="text-sm text-white/50">
          Recaps are unavailable right now. Use Ask in the header to ask in plain English.
        </p>
      </div>
    );
  }

  if (!data && !loading && !error) {
    return (
      <button
        type="button"
        id="insights"
        onClick={() => void load()}
        aria-label={`Generate a briefing for ${name}`}
        className="speedlines scroll-mt-[5.5rem] flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-850 p-4 text-left transition-colors hover:border-[var(--c-primary)] sm:scroll-mt-28"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-grad text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">Get me ready for {name}</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-white/50">
              Spoiler-free recap and what to watch first.
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-white/45">Generate</span>
      </button>
    );
  }

  if (error && !data?.recap && !data?.explanation) {
    return (
      <div id="insights" className="scroll-mt-[5.5rem] sm:scroll-mt-28">
        <LlmNotice error={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (loading && !data?.recap && !data?.explanation) {
    return (
      <div id="insights" className="scroll-mt-[5.5rem] rounded-xl border border-white/10 bg-ink-850 p-5 sm:scroll-mt-28">
        <WatcherLoader label={`Reading the timeline for ${name}…`} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div id="insights" className="scroll-mt-[5.5rem] space-y-5 sm:scroll-mt-28">
      {(data.recap || streaming) && (
        <section className="panel panel-accent rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
            <ScrollText className="h-3.5 w-3.5" />
            Previously, spoiler-free
          </h2>
          <p className="text-pretty leading-relaxed text-white/80">
            {data.recap}
            {streaming && !data.explanation ? (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-[var(--c-primary)]" />
            ) : null}
          </p>
        </section>
      )}

      {(data.essential.length > 0 || data.helpful.length > 0 || data.explanation) && (
        <section className="panel rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
            <ListChecks className="h-3.5 w-3.5" />
            Watch these first
          </h2>

          {data.explanation && (
            <p className="mb-4 text-[13px] leading-relaxed text-white/55">
              {data.explanation}
              {streaming ? (
                <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-[var(--c-primary)]" />
              ) : null}
            </p>
          )}

          {data.essential.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/35">
                Essential
              </p>
              <ResultStrip titles={data.essential} />
            </div>
          )}
          {data.helpful.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/35">
                Adds context
              </p>
              <ResultStrip titles={data.helpful} />
            </div>
          )}
        </section>
      )}

      <p className="text-[11px] text-white/25">
        Generated by an open-weights model from the local catalog. It can still get
        continuity details wrong.
      </p>
    </div>
  );
}
