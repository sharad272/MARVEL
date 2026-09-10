"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, CornerDownLeft, User, Play } from "lucide-react";
import { ResultStrip } from "@/components/result-strip";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import { WatcherLoader } from "@/components/watcher-loader";
import type { TitleCard } from "@/lib/queries";
import { consumeSse } from "@/lib/llm/consume-sse";
import { isSse, llmPost, preferJsonLlm, readLlmJson } from "@/lib/llm/browser";
import { useLlmEnabled } from "@/lib/llm/use-status";

type Beat = { slug: string; beat: string; name?: string };

type Turn = {
  question: string;
  kind?: "search" | "prereqs" | "arc";
  answer: string;
  recap?: string;
  titles: TitleCard[];
  essential?: TitleCard[];
  helpful?: TitleCard[];
  beats?: Beat[];
  slug?: string;
  name?: string;
  followups?: string[];
  error?: string;
  streaming?: boolean;
};

const SUGGESTIONS = [
  "What do I need to watch before Endgame?",
  "The one where Cap fights Tony",
  "Trace Wanda's arc",
  "Give me the funniest Marvel films",
  "Where does Loki fit in the timeline?",
  "Everything with Spider-Man, in order",
];

export function AskClient({
  enabled,
  initialQuery = "",
  hosted = false,
}: {
  enabled: boolean;
  initialQuery?: string;
  hosted?: boolean;
}) {
  const liveEnabled = useLlmEnabled(enabled);
  const starter = initialQuery.trim();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(() => Boolean(enabled && starter));
  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const seq = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  const ask = async (question: string, signal?: AbortSignal) => {
    const q = question.trim();
    if (!q || inFlight.current) return;
    const id = ++seq.current;
    inFlight.current = true;
    setInput("");
    setLoading(true);
    setTurns((t) => {
      const last = t[t.length - 1];
      if (last && last.question === q && !last.answer && !last.error) {
        const next = [...t];
        next[next.length - 1] = { ...last, streaming: true, error: undefined };
        return next;
      }
      return [...t, { question: q, answer: "", titles: [], streaming: true }];
    });

    const applyJson = (json: Turn) => {
      setTurns((t) => {
        const next = [...t];
        const last = next.length - 1;
        if (last < 0) return next;
        next[last] = {
          ...next[last],
          kind: json.kind,
          answer: json.answer ?? "",
          recap: json.recap,
          titles: json.titles ?? [],
          essential: json.essential,
          helpful: json.helpful,
          beats: json.beats,
          slug: json.slug,
          name: json.name,
          followups: json.followups,
          streaming: false,
          error: undefined,
        };
        return next;
      });
    };

    try {
      let res = await llmPost("/api/llm/ask", { query: q }, signal);

      if (!isSse(res)) {
        applyJson(await readLlmJson<Turn>(res));
        return;
      }

      try {
        await consumeSse(res, (event) => {
        setTurns((t) => {
          const next = [...t];
          const last = next.length - 1;
          if (last < 0) return next;
          const cur = next[last];
          if (event.type === "kind") {
            next[last] = { ...cur, kind: event.kind, slug: event.slug, name: event.name };
          } else if (event.type === "delta") {
            if (event.field === "answer") {
              next[last] = { ...cur, answer: cur.answer + event.text };
            } else {
              next[last] = { ...cur, recap: (cur.recap ?? "") + event.text };
            }
          } else if (event.type === "titles") {
            if (event.role === "essential") next[last] = { ...cur, essential: event.titles, titles: event.titles };
            else if (event.role === "helpful") next[last] = { ...cur, helpful: event.titles };
            else next[last] = { ...cur, titles: event.titles };
          } else if (event.type === "beats") {
            next[last] = { ...cur, beats: event.beats };
          } else if (event.type === "done") {
            next[last] = { ...cur, followups: event.followups, streaming: false };
          } else if (event.type === "error") {
            next[last] = { ...cur, error: event.error, streaming: false };
          }
          return next;
        });
        });
      } catch (streamErr) {
        if ((streamErr as Error).name === "AbortError") throw streamErr;
        res = await llmPost("/api/llm/ask", { query: q }, signal, true);
        applyJson(await readLlmJson<Turn>(res));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setTurns((t) => {
        const next = [...t];
        if (next.length === 0) return next;
        next[next.length - 1] = {
          ...next[next.length - 1],
          error: (e as Error).message,
          streaming: false,
        };
        return next;
      });
    } finally {
      if (seq.current === id) {
        inFlight.current = false;
        setLoading(false);
        setTurns((t) => {
          const next = [...t];
          const i = next.length - 1;
          if (i >= 0 && next[i].streaming) next[i] = { ...next[i], streaming: false };
          return next;
        });
      }
    }
  };

  useEffect(() => {
    if (!liveEnabled || !starter) return;
    const ac = new AbortController();
    void ask(starter, ac.signal);
    return () => {
      ac.abort();
      inFlight.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starter, liveEnabled]);

  if (!liveEnabled) {
    const onPhone = preferJsonLlm();
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
        <p className="font-semibold text-amber-300">Ask the Watcher is offline</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-200/75">
          {onPhone || hosted ? (
            <>
              Instant search still works.{" "}
              <Link href="/search" className="font-semibold text-amber-100 underline underline-offset-2">
                Search titles
              </Link>{" "}
              while this is unavailable.
            </>
          ) : (
            <>
              Set <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">HF_TOKEN</code> in{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">.env.local</code> and
              restart the dev server. Instant search still works without it.
            </>
          )}
        </p>
      </div>
    );
  }

  const last = turns[turns.length - 1];

  return (
    <div>
      {turns.length === 0 && !loading && (
        <div className="mb-8 grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/ask?q=${encodeURIComponent(s)}`}
              onClick={(e) => {
                e.preventDefault();
                void ask(s);
              }}
              className="rounded-xl border border-white/10 bg-ink-850 p-3.5 text-left text-[13px] leading-relaxed text-white/65 transition-colors hover:border-marvel/50 hover:bg-white/[0.04] hover:text-white"
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {turns.map((turn, i) => (
          <div key={`${turn.question}-${i}`} className="space-y-4">
            <div className="flex justify-end">
              <p className="flex max-w-[85%] items-start gap-2.5 rounded-2xl rounded-br-sm bg-white/10 px-4 py-3 text-[15px] text-white">
                {turn.question}
                <User className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
              </p>
            </div>

            {loading && i === turns.length - 1 && !turn.answer && !turn.recap && !turn.error ? (
              <WatcherLoader />
            ) : (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-grad text-white shadow">
                  <Sparkles className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  {turn.error ? (
                    <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-200">
                      {turn.error}
                    </p>
                  ) : (
                    <AskAnswer turn={turn} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {last && !loading && last.followups && last.followups.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {last.followups.map((f) =>
            f.startsWith("Play the ") && last.slug ? (
              <Link
                key={f}
                href={`/watch/${last.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:scale-[1.02]"
              >
                <Play className="h-3 w-3 fill-current" />
                {f}
              </Link>
            ) : (
              <Link
                key={f}
                href={`/ask?q=${encodeURIComponent(f)}`}
                onClick={(e) => {
                  e.preventDefault();
                  void ask(f);
                }}
                className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/20 hover:text-white"
              >
                {f}
              </Link>
            )
          )}
        </div>
      )}

      <div ref={endRef} />

      <form
        action="/ask"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 mt-8 md:bottom-4"
      >
        <div className="relative">
          <input
            name="q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about Marvel…"
            disabled={loading}
            className="w-full rounded-full border border-white/12 bg-ink-900/95 py-4 pl-5 pr-14 text-base text-white shadow-2xl backdrop-blur-xl placeholder:text-white/30 focus:border-marvel focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-primary-grad text-white transition-transform hover:scale-105 disabled:opacity-40"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function AskAnswer({ turn }: { turn: Turn }) {
  return (
    <>
      {turn.answer && (
        <p className="text-pretty text-[15px] leading-relaxed text-white/80">
          {turn.answer}
          {turn.streaming && (!turn.recap || Boolean(turn.answer)) ? <Caret /> : null}
        </p>
      )}

      {turn.recap && (
        <div className="panel panel-accent mt-4 rounded-xl p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Previously, spoiler-free
          </p>
          <p className="text-pretty text-sm leading-relaxed text-white/75">
            {turn.recap}
            {turn.streaming && !turn.answer ? <Caret /> : null}
          </p>
        </div>
      )}

      {turn.kind === "prereqs" && turn.essential && turn.essential.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/35">Essential</p>
          <ResultStrip titles={turn.essential} />
        </div>
      )}
      {turn.kind === "prereqs" && turn.helpful && turn.helpful.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/35">
            Adds context
          </p>
          <ResultStrip titles={turn.helpful} />
        </div>
      )}

      {turn.kind === "arc" && turn.beats && turn.beats.length > 0 && (
        <ol className="relative mt-4 space-y-2 pl-5">
          <span className="absolute left-[5px] top-2 bottom-2 w-px bg-white/12" aria-hidden />
          {turn.beats.map((b, i) => (
            <li key={b.slug} className="relative">
              <span className="absolute -left-5 top-2 h-2 w-2 rounded-full bg-marvel" />
              <div className="rounded-lg p-2 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/title/${b.slug}`}
                    className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white"
                  >
                    {i + 1}. {b.name ?? b.slug}
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

      {turn.kind === "search" && turn.titles.length > 0 && <ResultStrip titles={turn.titles} />}

      {turn.kind === "search" && turn.titles.length === 0 && turn.answer && !turn.streaming && (
        <p className="mt-2 text-sm text-white/40">Nothing in the catalog matched that.</p>
      )}
    </>
  );
}

function Caret() {
  return (
    <span
      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-[var(--c-primary)]"
      aria-hidden
    />
  );
}
