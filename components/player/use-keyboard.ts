"use client";

import { useEffect } from "react";
import { PLAYBACK_RATES } from "./types";
import type { PlayerApi } from "./use-player";

export type ShortcutHint = { keys: string; label: string };

/** Rendered by the on-screen help sheet, and the contract this hook implements. */
export const SHORTCUTS: ShortcutHint[] = [
  { keys: "K / Space", label: "Play or pause" },
  { keys: "J / L", label: "Back or forward 10 seconds" },
  { keys: "← / →", label: "Back or forward 5 seconds" },
  { keys: "↑ / ↓", label: "Volume up or down" },
  { keys: "0 – 9", label: "Jump to 0–90% of the runtime" },
  { keys: "Home / End", label: "Jump to start or end" },
  { keys: "F", label: "Fullscreen" },
  { keys: "T", label: "Theater mode" },
  { keys: "I", label: "Picture-in-picture" },
  { keys: "M", label: "Mute" },
  { keys: "< / >", label: "Slower or faster playback" },
  { keys: "?", label: "Toggle this list" },
];

/**
 * Global playback shortcuts, matching YouTube's bindings.
 *
 * Deliberately window-level rather than scoped to a focused element: a
 * viewer who has clicked nothing still expects Space to start the film.
 * Typing in an input or a contenteditable is excluded.
 */
export function usePlayerKeyboard(
  player: PlayerApi,
  {
    enabled = true,
    onToggleHelp,
    onNext,
    onPrevious,
  }: {
    enabled?: boolean;
    onToggleHelp?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
  } = {}
) {
  const { actions, state, toggleFullscreen, toggleTheater, togglePip, canPip } = player;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      // Let the browser own modified keystrokes (Cmd+R, Ctrl+L, …).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const rateIndex = PLAYBACK_RATES.indexOf(
        state.rate as (typeof PLAYBACK_RATES)[number]
      );

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          actions.togglePlay();
          break;

        case "j":
        case "J":
          e.preventDefault();
          actions.seekBy(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          actions.seekBy(10);
          break;

        case "ArrowLeft":
          e.preventDefault();
          actions.seekBy(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          actions.seekBy(5);
          break;

        case "ArrowUp":
          e.preventDefault();
          actions.adjustVolume(0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          actions.adjustVolume(-0.05);
          break;

        case "m":
        case "M":
          e.preventDefault();
          actions.toggleMute();
          break;

        case "f":
        case "F":
          e.preventDefault();
          void toggleFullscreen();
          break;

        case "t":
        case "T":
          e.preventDefault();
          toggleTheater();
          break;

        case "i":
        case "I":
          if (!canPip) break;
          e.preventDefault();
          void togglePip();
          break;

        case "Home":
          e.preventDefault();
          actions.seek(0);
          break;
        case "End":
          e.preventDefault();
          if (state.duration) actions.seek(state.duration);
          break;

        // Shift+, and Shift+. on a US layout; accept both forms.
        case "<":
        case ",":
          e.preventDefault();
          if (rateIndex > 0) actions.setRate(PLAYBACK_RATES[rateIndex - 1]);
          break;
        case ">":
        case ".":
          e.preventDefault();
          if (rateIndex >= 0 && rateIndex < PLAYBACK_RATES.length - 1) {
            actions.setRate(PLAYBACK_RATES[rateIndex + 1]);
          }
          break;

        case "?":
          e.preventDefault();
          onToggleHelp?.();
          break;

        case "N":
          if (!e.shiftKey) break;
          e.preventDefault();
          onNext?.();
          break;
        case "P":
          if (!e.shiftKey) break;
          e.preventDefault();
          onPrevious?.();
          break;

        default:
          // 0-9 jump to that decile of the runtime.
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            actions.seekToFraction(Number(e.key) / 10);
          }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    actions,
    state.rate,
    state.duration,
    toggleFullscreen,
    toggleTheater,
    togglePip,
    canPip,
    onToggleHelp,
    onNext,
    onPrevious,
  ]);
}
