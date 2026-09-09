"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIBRARY_STATUS, type LibraryStatus } from "@/lib/constants";

type Props = {
  titleId: string;
  initialStatus: string | null;
  initialFavorite: boolean;
};

export function LibraryButtons({ titleId, initialStatus, initialFavorite }: Props) {
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const save = async (patch: { status?: LibraryStatus | null; favorite?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titleId, ...patch }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      // Roll the optimistic update back so the UI can't lie about state.
      setStatus(initialStatus);
      setFavorite(initialFavorite);
    } finally {
      setSaving(false);
    }
  };

  const inWatchlist = status === LIBRARY_STATUS.WATCHLIST;
  const watched = status === LIBRARY_STATUS.WATCHED;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          const next = inWatchlist ? null : LIBRARY_STATUS.WATCHLIST;
          setStatus(next);
          startTransition(() => void save({ status: next }));
        }}
        className={cn(
          "flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold backdrop-blur transition-colors",
          inWatchlist
            ? "border-white/40 bg-white/20 text-white"
            : "border-white/25 bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {saving || pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : inWatchlist ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {inWatchlist ? "In watchlist" : "Watchlist"}
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() => {
          const next = watched ? null : LIBRARY_STATUS.WATCHED;
          setStatus(next);
          startTransition(() => void save({ status: next }));
        }}
        title={watched ? "Mark as unwatched" : "Mark as watched"}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition-colors",
          watched
            ? "border-transparent text-white"
            : "border-white/25 bg-white/10 text-white hover:bg-white/20"
        )}
        style={watched ? { backgroundColor: "var(--c-primary)" } : undefined}
      >
        <Check className="h-5 w-5" />
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() => {
          const next = !favorite;
          setFavorite(next);
          startTransition(() => void save({ favorite: next }));
        }}
        title={favorite ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={favorite}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition-colors",
          favorite
            ? "border-transparent text-white"
            : "border-white/25 bg-white/10 text-white hover:bg-white/20"
        )}
        style={favorite ? { backgroundColor: "var(--c-primary)" } : undefined}
      >
        <Heart className={cn("h-5 w-5", favorite && "fill-current")} />
      </button>
    </div>
  );
}

/**
 * Compact plus/check used on the hero billboard, where the full button
 * row would fight the Play/More-info cluster.
 */
export function WatchlistIconButton({
  titleId,
  initialInList,
  onToggle,
}: {
  titleId: string;
  initialInList: boolean;
  onToggle?: (inList: boolean) => void;
}) {
  const [inList, setInList] = useState(initialInList);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !inList;
    setInList(next);
    onToggle?.(next);
    setSaving(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titleId,
          status: next ? LIBRARY_STATUS.WATCHLIST : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      setInList(!next);
      onToggle?.(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={inList}
      aria-label={inList ? "Remove from watchlist" : "Add to watchlist"}
      title={inList ? "In your watchlist" : "Add to watchlist"}
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition-colors",
        inList
          ? "border-transparent text-white"
          : "border-white/25 bg-white/10 text-white hover:bg-white/20"
      )}
      style={inList ? { backgroundColor: "var(--c-primary)" } : undefined}
    >
      {saving ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : inList ? (
        <Check className="h-5 w-5" />
      ) : (
        <Plus className="h-5 w-5" />
      )}
    </button>
  );
}
