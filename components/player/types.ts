/**
 * Playback engine abstraction.
 *
 * The player renders one control surface for two very different backends:
 * a YouTube iframe (official trailers and clips) and a native <video>
 * element (media files you own, optionally over HLS). Both implement
 * `PlayerEngine`, so every control, keyboard shortcut and progress writer
 * is written once and is source-agnostic.
 */

export type PlayerSourceKind = "youtube" | "file";

export type PlayerSource = {
  kind: PlayerSourceKind;
  /** YouTube video key, or a URL for file playback. */
  src: string;
  title: string;
  /** Poster shown before playback starts. */
  poster?: string | null;
  /** Seconds to resume from. */
  startAt?: number;
};

export type Quality = {
  id: string;
  label: string;
  height?: number;
};

export type EngineState = {
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";
  currentTime: number;
  duration: number;
  /** Seconds buffered ahead of the playhead. */
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  qualities: Quality[];
  activeQuality: string | null;
  error: string | null;
};

export const INITIAL_STATE: EngineState = {
  status: "idle",
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: false,
  rate: 1,
  qualities: [],
  activeQuality: null,
  error: null,
};

export interface PlayerEngine {
  play(): Promise<void> | void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  setQuality(id: string): void;
  /** Native element for fullscreen/PiP targeting, when there is one. */
  getMediaElement(): HTMLVideoElement | null;
  subscribe(listener: (state: EngineState) => void): () => void;
  getState(): EngineState;
  destroy(): void;
}

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** j / l on YouTube, and the convention most players follow. */
export const SEEK_STEP_LARGE = 10;
/** Arrow keys. */
export const SEEK_STEP_SMALL = 5;
export const VOLUME_STEP = 0.05;

/** Base class handling listener bookkeeping and state diffing. */
export abstract class BaseEngine implements PlayerEngine {
  protected state: EngineState = { ...INITIAL_STATE };
  private listeners = new Set<(s: EngineState) => void>();

  protected patch(partial: Partial<EngineState>) {
    // Time updates fire ~4x/sec; skip no-op renders.
    let changed = false;
    for (const [k, v] of Object.entries(partial)) {
      if (this.state[k as keyof EngineState] !== v) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: (state: EngineState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  protected clearListeners() {
    this.listeners.clear();
  }

  abstract play(): Promise<void> | void;
  abstract pause(): void;
  abstract seek(seconds: number): void;
  abstract setVolume(volume: number): void;
  abstract setMuted(muted: boolean): void;
  abstract setRate(rate: number): void;
  abstract setQuality(id: string): void;
  abstract getMediaElement(): HTMLVideoElement | null;
  abstract destroy(): void;
}
