"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Play, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, type ProgressTarget } from "./use-player";
import { usePlayerKeyboard, SHORTCUTS } from "./use-keyboard";
import { PlayerControls, type Chapter } from "./controls";
import type { PlayerSource } from "./types";

const IDLE_MS = 2600;

type Props = {
  source: PlayerSource;
  chapters?: Chapter[];
  progressTarget?: ProgressTarget;
  onNext?: () => void;
  nextLabel?: string;
  onEnded?: () => void;
  className?: string;
};

export function Player({
  source,
  chapters,
  progressTarget,
  onNext,
  nextLabel,
  onEnded,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = usePlayer({ source, containerRef, progressTarget, onEnded });
  const { state, actions, viewMode, videoRef, ytHostRef } = player;

  const [idle, setIdle] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"forward" | "back" | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  usePlayerKeyboard(player, {
    onToggleHelp: () => setShowHelp((v) => !v),
    onNext,
  });

  // --- Idle detection ----------------------------------------------------
  // Controls and cursor hide while playing and untouched; any pointer
  // movement brings them back.
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => {
    if (state.status !== "playing") {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [state.status, wake]);

  // --- Double-tap to seek ------------------------------------------------
  // Distinguishes a tap (toggle play) from a double-tap (seek ±10s) by
  // deferring the single-tap action briefly.
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail > 1) return; // handled by dblclick
    // iOS only counts play() as a user gesture if it runs synchronously.
    // Queue a delayed toggle only while already playing, so a double-tap
    // can still seek instead of pausing.
    if (state.status === "loading" || state.status === "idle") return;
    if (state.status !== "playing") {
      void actions.play();
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => actions.pause(), 200);
  };

  const onSurfaceDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tapTimer.current) clearTimeout(tapTimer.current);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      actions.seekBy(-10);
      setSeekFlash("back");
    } else if (x > third * 2) {
      actions.seekBy(10);
      setSeekFlash("forward");
    } else {
      void player.toggleFullscreen();
      return;
    }
    setTimeout(() => setSeekFlash(null), 450);
  };

  const controlsVisible = !idle || state.status !== "playing";

  useEffect(() => {
    if (viewMode !== "fullscreen" || document.fullscreenElement) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewMode]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-black [touch-action:manipulation]",
        viewMode === "fullscreen"
          ? "fixed inset-0 z-[100] h-[100dvh] w-full"
          : "aspect-video",
        idle && state.status === "playing" && "player-idle",
        className
      )}
      ref={containerRef}
      onMouseMove={wake}
      onTouchStart={wake}
      onMouseLeave={() => state.status === "playing" && setIdle(true)}
      // Focusable so the container can receive keys after a click without
      // stealing them from inputs elsewhere on the page.
      tabIndex={-1}
    >
      {/* --- Media surface ---------------------------------------------- */}
      <div
        className="absolute inset-0"
        onClick={onSurfaceClick}
        onDoubleClick={onSurfaceDoubleClick}
      >
        {source.kind === "file" ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            playsInline
            poster={source.poster ?? undefined}
            // Native controls stay off: ours are the only ones.
            controls={false}
          />
        ) : (
          // The YouTube API replaces a child of this node with its iframe.
          // pointer-events are disabled so our overlay owns all clicks and
          // YouTube's own UI can never be reached.
          <div
            ref={ytHostRef}
            className="pointer-events-none absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full"
          />
        )}
      </div>

      {/* --- Poster before first play ----------------------------------- */}
      {state.status === "idle" && source.poster && (
        <div className="pointer-events-none absolute inset-0">
          <Image src={source.poster} alt="" fill sizes="100vw" className="object-cover" priority quality={75} />
          <div className="absolute inset-0 bg-black/45" />
        </div>
      )}

      {/* --- Centre affordances ----------------------------------------- */}
      {(state.status === "idle" || state.status === "ready" || state.status === "paused") && (
        <button
          type="button"
          onClick={() => void actions.play()}
          aria-label="Play"
          className="absolute inset-0 z-10 grid place-items-center"
        >
          <span
            className="grid h-20 w-20 place-items-center rounded-full text-white shadow-2xl transition-transform hover:scale-110"
            style={{ backgroundColor: "var(--c-primary)" }}
          >
            <Play className="ml-1 h-9 w-9 fill-current" />
          </span>
        </button>
      )}

      {state.status === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <Loader2 className="h-12 w-12 animate-spin text-white/85" />
        </div>
      )}

      {seekFlash && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 z-10 grid w-1/3 place-items-center",
            seekFlash === "back" ? "left-0" : "right-0"
          )}
        >
          <span className="animate-fade-in rounded-full bg-black/65 px-4 py-3 text-sm font-bold text-white">
            {seekFlash === "back" ? "« 10s" : "10s »"}
          </span>
        </div>
      )}

      {state.status === "error" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 p-6">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-amber-400" />
            <p className="font-semibold text-white">Can&rsquo;t play this</p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              {state.error ?? "Something went wrong."}
            </p>
            {source.kind === "youtube" && (
              <a
                href={`https://www.youtube.com/watch?v=${source.src}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-black"
              >
                Watch on YouTube
              </a>
            )}
          </div>
        </div>
      )}

      {/* --- Title, top-left, while controls are up ---------------------- */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/75 to-transparent p-4 pb-12 transition-opacity duration-200 sm:p-5",
          controlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <p className="clamp-2 max-w-2xl text-sm font-semibold text-white drop-shadow sm:text-base">
          {source.title}
        </p>
      </div>

      <PlayerControls
        player={player}
        chapters={chapters}
        onNext={onNext}
        nextLabel={nextLabel}
        onToggleHelp={() => setShowHelp((v) => !v)}
        visible={controlsVisible}
      />

      {showHelp && <ShortcutSheet onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function ShortcutSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-white">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-white/60">{s.label}</dt>
              <dd>
                <kbd className="rounded border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
