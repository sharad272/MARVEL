"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import type { CodexListItem } from "@/lib/codex";
import { cn } from "@/lib/utils";

type Filter = "all" | "screen" | "good" | "bad";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "screen", label: "On screen" },
  { id: "good", label: "Heroes" },
  { id: "bad", label: "Villains" },
];

function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, "");
}

export function CodexSearch({ items }: { items: CodexListItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"power" | "name">("power");

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    let list = items.filter((i) => {
      if (filter === "screen" && !i.onScreen) return false;
      if (filter === "good" && i.alignment !== "good") return false;
      if (filter === "bad" && i.alignment !== "bad") return false;
      if (!needle) return true;
      return norm(i.name).includes(needle) || norm(i.fullName ?? "").includes(needle);
    });
    list = [...list].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name)
    );
    return list;
  }, [items, q, filter, sort]);

  const askFreeform = () => {
    const name = q.trim();
    if (name.length >= 2) router.push(`/codex/ask?name=${encodeURIComponent(name)}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (shown.length === 1) router.push(`/codex/${shown[0].key}`);
          else if (!shown.length) askFreeform();
        }}
        className="relative max-w-2xl"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any Marvel character — Galactus, Rogue, Miles Morales…"
          aria-label="Search characters"
          className="h-14 w-full rounded-2xl border border-white/15 bg-ink-850 pl-12 pr-4 text-base text-white placeholder:text-white/35 focus:border-[var(--c-primary)] focus:outline-none"
        />
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
              filter === f.id ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
        <button
          type="button"
          onClick={() => setSort(sort === "power" ? "name" : "power")}
          className="min-h-9 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold text-white/70 hover:bg-white/15"
        >
          Sort: {sort === "power" ? "Most powerful" : "A–Z"}
        </button>
        <span className="text-[12px] text-white/35">{shown.length} characters</span>
      </div>

      {q.trim().length >= 2 && (
        <button
          type="button"
          onClick={askFreeform}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white/80 hover:bg-white/10"
        >
          <Sparkles className="h-4 w-4" />
          {shown.length ? "Not who you meant? " : ""}Ask the Watcher about &ldquo;{q.trim()}&rdquo;
        </button>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {shown.map((c) => (
          <li key={c.key}>
            <Link
              href={`/codex/${c.key}`}
              className="group block overflow-hidden rounded-xl bg-ink-850 ring-1 ring-white/[0.08] transition-all hover:ring-[var(--c-primary)]"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-ink-800">
                {/* Plain img: 286 remote thumbs would burn the image optimizer quota. */}
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                {c.rank && sort === "power" && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white">
                    #{c.rank}
                  </span>
                )}
                <div className="absolute inset-x-2 bottom-2">
                  <p className="line-clamp-2 text-[12px] font-black uppercase leading-tight text-white">
                    {c.name}
                  </p>
                  {c.score != null && (
                    <p className="mt-0.5 text-[10px] font-bold tabular-nums text-white/60">
                      Power {c.score}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
