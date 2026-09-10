/**
 * YouTube IFrame API engine.
 *
 * Powers trailer, teaser and clip playback from Marvel's official
 * channels. YouTube's own chrome is suppressed so our control bar is the
 * only one on screen, which is what makes trailers and local files feel
 * like the same player.
 *
 * The API has no progress event, so time is polled — that's the documented
 * approach and 250ms is smooth enough for a scrubber.
 */

import { BaseEngine } from "./types";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const POLL_MS = 250;
let apiPromise: Promise<void> | null = null;

/** Loads the IFrame API once per page, shared by every player instance. */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existing?.();
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the YouTube player."));
    document.head.appendChild(script);
  });

  return apiPromise;
}

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

export class YouTubeEngine extends BaseEngine {
  private player: YTPlayer | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private ready = false;
  /** Applied once the player reports ready, since setters no-op before then. */
  private pendingVolume: number | null = null;
  private pendingMuted: boolean | null = null;
  /** Play tapped before onReady — iOS otherwise drops the gesture. */
  private pendingPlay = false;

  constructor(
    private container: HTMLElement,
    private videoKey: string,
    private startAt = 0
  ) {
    super();
    this.patch({ status: "loading" });
    void this.init();
  }

  private async init() {
    try {
      await loadYouTubeApi();
      if (this.destroyed || !window.YT) return;

      // The API replaces this node outright, so hand it a child rather
      // than the container React owns.
      const mount = document.createElement("div");
      this.container.appendChild(mount);

      this.player = new window.YT.Player(mount, {
        videoId: this.videoKey,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0, // our control bar is the only one
          disablekb: 1, // our keyboard handler owns shortcuts
          modestbranding: 1,
          rel: 0,
          fs: 0, // fullscreen is handled on our container
          iv_load_policy: 3, // no annotations
          playsinline: 1, // stay in-page on iPhone instead of native fullscreen
          enablejsapi: 1,
          start: Math.floor(this.startAt) || undefined,
          origin: window.location.origin,
          widget_referrer: window.location.href,
        },
        events: {
          onReady: () => this.onReady(),
          onStateChange: (e: { data: number }) => this.onStateChange(e.data),
          onError: (e: { data: number }) =>
            this.patch({ status: "error", error: youtubeErrorMessage(e.data) }),
        },
      });
    } catch (e) {
      this.patch({ status: "error", error: (e as Error).message });
    }
  }

  private onReady() {
    if (!this.player || this.destroyed) return;

    this.ready = true;
    this.hardenIframe();

    if (this.pendingVolume != null) {
      this.player.setVolume(this.pendingVolume * 100);
      this.pendingVolume = null;
    }
    if (this.pendingMuted != null) {
      if (this.pendingMuted) this.player.mute();
      else this.player.unMute();
      this.pendingMuted = null;
    }

    this.patch({
      status: "ready",
      duration: this.player.getDuration(),
      muted: this.player.isMuted(),
      rate: this.player.getPlaybackRate(),
      // YouTube's quality API is deprecated and now ignores requests, so
      // the menu exposes speed only and quality stays adaptive.
      qualities: [],
      activeQuality: null,
    });

    if (this.pendingPlay) {
      this.pendingPlay = false;
      this.player.playVideo();
    }

    this.startPolling();
  }

  /**
   * YouTube's iframe is created without playsinline / autoplay permissions.
   * iOS Safari then refuses to start playback from our control bar.
   */
  private hardenIframe() {
    let iframe: HTMLIFrameElement | null = null;
    try {
      iframe = this.player?.getIframe() ?? null;
    } catch {
      iframe = this.container.querySelector("iframe");
    }
    if (!iframe) return;
    iframe.setAttribute("allow", IFRAME_ALLOW);
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("playsinline", "true");
    iframe.setAttribute("webkit-playsinline", "true");
    iframe.setAttribute("width", "100%");
    iframe.setAttribute("height", "100%");
  }

  private onStateChange(state: number) {
    const YT = window.YT;
    if (!YT) return;

    switch (state) {
      case YT.PlayerState.PLAYING:
        this.patch({ status: "playing" });
        break;
      case YT.PlayerState.PAUSED:
        this.patch({ status: "paused" });
        break;
      case YT.PlayerState.BUFFERING:
        // Don't flip to "loading" here. iOS often emits BUFFERING after
        // playVideo() even when autoplay is blocked; treating that as
        // loading hides the Play button and leaves a stuck spinner.
        break;
      case YT.PlayerState.ENDED:
        this.patch({ status: "ended" });
        break;
    }
  }

  private startPolling() {
    if (this.poll) return;
    this.poll = setInterval(() => {
      if (!this.player || this.destroyed) return;
      const duration = this.player.getDuration() || 0;
      this.patch({
        currentTime: this.player.getCurrentTime() || 0,
        duration,
        buffered: (this.player.getVideoLoadedFraction() || 0) * duration,
      });
    }, POLL_MS);
  }

  play() {
    if (!this.player || !this.ready) {
      this.pendingPlay = true;
      return;
    }
    this.player.playVideo();
  }

  pause() {
    this.pendingPlay = false;
    this.player?.pauseVideo();
  }

  seek(seconds: number) {
    if (!this.player) return;
    const duration = this.player.getDuration() || seconds;
    const target = Math.min(Math.max(seconds, 0), duration);
    this.player.seekTo(target, true);
    // Update optimistically: the poll is up to 250ms behind and the
    // scrubber should not visibly lag the drag.
    this.patch({ currentTime: target });
  }

  setVolume(volume: number) {
    const clamped = Math.min(Math.max(volume, 0), 1);
    this.patch({ volume: clamped, muted: clamped === 0 });
    if (!this.player || !this.ready) {
      this.pendingVolume = clamped;
      if (clamped === 0) this.pendingMuted = true;
      return;
    }
    this.player.setVolume(clamped * 100);
    if (clamped > 0 && this.player.isMuted()) this.player.unMute();
  }

  setMuted(muted: boolean) {
    this.patch({ muted });
    if (!this.player || !this.ready) {
      this.pendingMuted = muted;
      return;
    }
    if (muted) this.player.mute();
    else this.player.unMute();
  }

  setRate(rate: number) {
    this.player?.setPlaybackRate(rate);
    this.patch({ rate });
  }

  setQuality() {
    // No-op: YouTube removed programmatic quality selection.
  }

  getMediaElement() {
    // An iframe is not an HTMLVideoElement, so PiP is unavailable here.
    return null;
  }

  destroy() {
    this.destroyed = true;
    this.ready = false;
    this.pendingPlay = false;
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
    try {
      this.player?.destroy();
    } catch {
      // The API throws if the iframe is already gone; nothing to do.
    }
    this.player = null;
    this.clearListeners();
  }
}

function youtubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "That video id is invalid.";
    case 5:
      return "This video can't play in an HTML5 player.";
    case 100:
      return "This video has been removed or made private.";
    case 101:
    case 150:
      return "The owner doesn't allow this video to be played outside YouTube.";
    default:
      return "The YouTube player failed to load this video.";
  }
}
