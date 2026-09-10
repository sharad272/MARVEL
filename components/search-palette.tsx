"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Play, X } from "lucide-react";
import { posterUrl, youtubeThumb } from "@/lib/tmdb/images";
import { officialTrailer } from "@/lib/videos";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import type { TitleCard } from "@/lib/queries";

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TitleCard[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { titles: [] }))
        .then((json) => {
          setResults(json.titles ?? []);
          setActive(0);
        })
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const go = (slug: string, watch = false) => {
    close();
    router.push(watch ? `/watch/${slug}` : `/title/${slug}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:border-white/20 hover:text-white sm:flex sm:w-auto sm:items-center sm:gap-2 sm:px-3.5"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search the multiverse</span>
        <kbd className="ml-1 hidden rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45 xl:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/80 pt-[env(safe-area-inset-top)] sm:items-start sm:bg-black/70 sm:px-4 sm:pt-[12vh]"
          onClick={close}
        >
          <div
            className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-ink-900 shadow-2xl sm:h-auto sm:max-h-[min(80dvh,720px)] sm:rounded-2xl sm:border sm:border-white/12"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[active]) go(results[active].slug);
                else if (query.trim()) {
                  close();
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }
              }}
              className="flex items-center gap-2 border-b border-white/10 px-4"
            >
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  }
                }}
                placeholder="Title, character, or a half-remembered plot…"
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="grid h-11 w-11 place-items-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            <ul className="min-h-0 flex-1 overflow-y-auto py-2 sm:max-h-[50vh] sm:flex-none">
              {results.map((t, i) => {
                const poster = posterUrl(t.posterPath, "w185");
                const yt = officialTrailer(t.slug);
                return (
                  <li key={t.id}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 ${
                        i === active ? "bg-white/[0.07]" : ""
                      }`}
                      onMouseEnter={() => setActive(i)}
                    >
                      <button
                        type="button"
                        onClick={() => go(t.slug)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-ink-800">
                          {poster || yt ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={poster ?? youtubeThumb(yt!.key, "hq")}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-white">
                            {t.name}
                          </span>
                          <span className="block text-[11px] text-white/40">
                            {t.mediaType === "SERIES" ? "Series" : "Film"}
                            {t.phase ? ` · Phase ${t.phase}` : ""}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => go(t.slug, true)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-black"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Play
                      </button>
                    </div>
                    <div className="px-3 pb-2">
                      <TitleWatcherActions slug={t.slug} name={t.name} variant="links" />
                    </div>
                  </li>
                );
              })}
              {query.trim().length >= 2 && results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-white/40">
                  No instant matches. Ask the Watcher in plain English.
                </li>
              )}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Link
                href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}
                onClick={close}
                className="text-xs font-semibold text-white/50 hover:text-white"
              >
                Open full search
              </Link>
              <Link
                href={query.trim() ? `/ask?q=${encodeURIComponent(query.trim())}` : "/ask"}
                onClick={close}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-grad px-3 py-1.5 text-xs font-bold text-white"
              >
                <Sparkles className="h-3 w-3" />
                Ask the Watcher
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
