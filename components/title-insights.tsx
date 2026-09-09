"use client";

import { useState } from "react";
import { Sparkles, ScrollText, ListChecks } from "lucide-react";
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
}: {
  slug: string;
  name: string;
  llmEnabled?: boolean;
}) {
  const liveEnabled = useLlmEnabled(llmEnabled);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!liveEnabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-850 p-4 text-sm text-white/50">
        Recaps and watch-order are unavailable right now. Instant search and trailers still work.
      </p>
    );
  }

  if (!data && !loading && !error) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        aria-label={`Generate a briefing for ${name}`}
        className="speedlines group flex w-full cursor-pointer flex-col items-stretch gap-3 rounded-xl border border-white/10 bg-ink-850 p-4 text-left transition-colors hover:border-[var(--c-primary)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <span className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-grad text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">
              Get me ready for {name}
            </span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-white/50">
              A spoiler-free recap of the story so far, plus what to watch first.
            </span>
          </span>
        </span>
        <span className="shrink-0 self-start rounded-full bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white transition-colors group-hover:bg-white group-hover:text-black sm:self-auto sm:py-1.5">
          Generate
        </span>
      </button>
    );
  }

  if (error && !data?.recap && !data?.explanation) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-300">Couldn&rsquo;t generate that</p>
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

  if (loading && !data?.recap && !data?.explanation) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-850 p-5">
        <WatcherLoader label={`Reading the timeline for ${name}…`} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
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
