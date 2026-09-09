"use client";

import { useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  SkipForward,
  RotateCcw,
  Check,
  Keyboard,
} from "lucide-react";
import { cn, formatTimecode } from "@/lib/utils";
import { PLAYBACK_RATES } from "./types";
import type { PlayerApi } from "./use-player";

export type Chapter = { startSec: number; title: string };

type Props = {
  player: PlayerApi;
  chapters?: Chapter[];
  onNext?: () => void;
  nextLabel?: string;
  onToggleHelp?: () => void;
  visible: boolean;
};

export function PlayerControls({
  player,
  chapters = [],
  onNext,
  nextLabel,
  onToggleHelp,
  visible,
}: Props) {
  const { state, actions, viewMode, toggleFullscreen, toggleTheater, canPip, togglePip } = player;
  const [menu, setMenu] = useState<"none" | "settings">("none");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const duration = state.duration || 0;
  const playedPct = duration ? (state.currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (state.buffered / duration) * 100 : 0;
  const isPlaying = state.status === "playing";

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || !duration) return null;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return ratio * duration;
    },
    [duration]
  );

  const activeChapter = chapters.length
    ? [...chapters].reverse().find((c) => state.currentTime >= c.startSec)
    : null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16 transition-opacity duration-200 sm:px-5 sm:pb-4",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      // Clicks in the control bar must not reach the surface's play toggle.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* --- Scrubber ----------------------------------------------------- */}
      <div className="group/bar relative mb-2">
        {hoverTime != null && duration > 0 && (
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-xs font-semibold tabular-nums text-white shadow-lg"
            style={{ left: `${(hoverTime / duration) * 100}%` }}
          >
            {formatTimecode(hoverTime)}
          </div>
        )}

        <div
          ref={barRef}
          className="relative flex h-8 cursor-pointer items-center sm:h-4"
          onMouseMove={(e) => setHoverTime(timeFromPointer(e.clientX))}
          onMouseLeave={() => setHoverTime(null)}
          onClick={(e) => {
            const t = timeFromPointer(e.clientX);
            if (t != null) actions.seek(t);
          }}
        >
          <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-[6px]">
            <div
              className="absolute inset-y-0 left-0 bg-white/35"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${playedPct}%`, backgroundColor: "var(--c-primary)" }}
            />
            {/* Chapter ticks sit on top so they read against played and
                unplayed track alike. */}
            {chapters.map((c) =>
              duration ? (
                <span
                  key={c.startSec}
                  className="absolute inset-y-0 w-[2px] bg-black/70"
                  style={{ left: `${(c.startSec / duration) * 100}%` }}
                  title={c.title}
                />
              ) : null
            )}
          </div>

          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover/bar:opacity-100"
            style={{ left: `${playedPct}%`, backgroundColor: "var(--c-primary)" }}
          />
        </div>

        {/* Native range input layered invisibly over the custom bar so the
            scrubber stays keyboard- and screen-reader-operable. */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={state.currentTime}
          onChange={(e) => actions.seek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatTimecode(state.currentTime)} of ${formatTimecode(duration)}`}
          className="absolute inset-0 h-8 w-full appearance-none bg-transparent opacity-0 sm:h-4"
        />
      </div>

      {/* --- Buttons ------------------------------------------------------ */}
      <div className="flex items-center gap-1 sm:gap-2">
        <IconButton
          onClick={actions.togglePlay}
          label={isPlaying ? "Pause (k)" : "Play (k)"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
        </IconButton>

        {onNext && (
          <IconButton onClick={onNext} label={nextLabel ?? "Next (Shift+N)"}>
            <SkipForward className="h-5 w-5 fill-current" />
          </IconButton>
        )}

        <IconButton
          onClick={() => actions.seekBy(-10)}
          label="Back 10 seconds (j)"
          className="hidden min-[400px]:grid"
        >
          <RotateCcw className="h-[18px] w-[18px]" />
        </IconButton>

        {/* Volume: the slider expands on hover, as it does on YouTube.
            On phones only the mute toggle is shown — the slider needs a
            hover/pointer, and the bar is already tight. */}
        <div className="group/vol flex items-center">
          <IconButton onClick={actions.toggleMute} label={state.muted ? "Unmute (m)" : "Mute (m)"}>
            {state.muted || state.volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : state.volume < 0.5 ? (
              <Volume1 className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </IconButton>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.muted ? 0 : state.volume}
            onChange={(e) => actions.setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="scrubber ml-1 hidden h-1 w-0 rounded-full transition-all duration-200 group-hover/vol:w-16 focus-visible:w-16 sm:block"
            style={{
              background: `linear-gradient(to right, var(--c-primary) ${
                (state.muted ? 0 : state.volume) * 100
              }%, rgba(255,255,255,0.3) ${(state.muted ? 0 : state.volume) * 100}%)`,
            }}
          />
        </div>

        <span className="ml-1 select-none text-xs font-medium tabular-nums text-white/85 sm:text-[13px]">
          {formatTimecode(state.currentTime)}
          <span className="mx-1 text-white/40">/</span>
          {formatTimecode(duration)}
        </span>

        {activeChapter && (
          <span className="ml-2 hidden max-w-[220px] truncate text-xs text-white/55 lg:block">
            {activeChapter.title}
          </span>
        )}

        <div className="flex-1" />

        {state.rate !== 1 && (
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
            {state.rate}×
          </span>
        )}

        {onToggleHelp && (
          <IconButton onClick={onToggleHelp} label="Keyboard shortcuts (?)" className="hidden sm:grid">
            <Keyboard className="h-[18px] w-[18px]" />
          </IconButton>
        )}

        <div className="relative">
          <IconButton
            onClick={() => setMenu((m) => (m === "settings" ? "none" : "settings"))}
            label="Settings"
            active={menu === "settings"}
          >
            <Settings className="h-[18px] w-[18px]" />
          </IconButton>

          {menu === "settings" && (
            <SettingsMenu
              player={player}
              onClose={() => setMenu("none")}
            />
          )}
        </div>

        {canPip && (
          <IconButton onClick={togglePip} label="Picture-in-picture (i)">
            <PictureInPicture2 className="h-[18px] w-[18px]" />
          </IconButton>
        )}

        <IconButton
          onClick={toggleTheater}
          label="Theater mode (t)"
          active={viewMode === "theater"}
          className="hidden sm:grid"
        >
          {/* Simple glyph rather than an icon import: it reads as a
              wide-screen frame at 18px, which no lucide icon does. */}
          <span
            className={cn(
              "block h-[13px] w-[18px] rounded-sm border-2 border-current",
              viewMode === "theater" && "border-b-[5px]"
            )}
          />
        </IconButton>

        <IconButton onClick={toggleFullscreen} label="Fullscreen (f)">
          {viewMode === "fullscreen" ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/90 transition-all hover:bg-white/15 hover:text-white active:scale-90 sm:h-9 sm:w-9",
        active && "text-[var(--c-primary)]",
        className
      )}
    >
      {children}
    </button>
  );
}

function SettingsMenu({ player, onClose }: { player: PlayerApi; onClose: () => void }) {
  const { state, actions } = player;
  const [pane, setPane] = useState<"root" | "speed" | "quality">("root");

  return (
    <>
      {/* Click-away layer, so the menu closes like a native popover. */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div className="absolute bottom-12 right-0 z-40 w-56 overflow-hidden rounded-xl border border-white/10 bg-black/95 py-1.5 shadow-2xl backdrop-blur-xl">
        {pane === "root" && (
          <>
            <MenuRow
              label="Playback speed"
              value={state.rate === 1 ? "Normal" : `${state.rate}×`}
              onClick={() => setPane("speed")}
            />
            {state.qualities.length > 0 && (
              <MenuRow
                label="Quality"
                value={
                  state.qualities.find((q) => q.id === state.activeQuality)?.label ?? "Auto"
                }
                onClick={() => setPane("quality")}
              />
            )}
          </>
        )}

        {pane === "speed" && (
          <MenuPane title="Playback speed" onBack={() => setPane("root")}>
            {PLAYBACK_RATES.map((r) => (
              <MenuOption
                key={r}
                label={r === 1 ? "Normal" : `${r}×`}
                selected={state.rate === r}
                onClick={() => {
                  actions.setRate(r);
                  onClose();
                }}
              />
            ))}
          </MenuPane>
        )}

        {pane === "quality" && (
          <MenuPane title="Quality" onBack={() => setPane("root")}>
            {state.qualities.map((q) => (
              <MenuOption
                key={q.id}
                label={q.label}
                selected={state.activeQuality === q.id}
                onClick={() => {
                  actions.setQuality(q.id);
                  onClose();
                }}
              />
            ))}
          </MenuPane>
        )}
      </div>
    </>
  );
}

function MenuRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
    >
      <span>{label}</span>
      <span className="text-xs text-white/50">{value} ›</span>
    </button>
  );
}

function MenuPane({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-1 flex w-full items-center gap-2 border-b border-white/10 px-3.5 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        ‹ {title}
      </button>
      <div className="max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

function MenuOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10"
    >
      <Check
        className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
        style={selected ? { color: "var(--c-primary)" } : undefined}
      />
      {label}
    </button>
  );
}
