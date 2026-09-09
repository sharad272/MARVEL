/**
 * Native <video> engine, with HLS support via hls.js for .m3u8 sources.
 *
 * Used for media files you own on this machine, served by the app's own
 * range-request route.
 */

import type Hls from "hls.js";
import { BaseEngine, type Quality } from "./types";

export class Html5Engine extends BaseEngine {
  private video: HTMLVideoElement;
  private hls: Hls | null = null;
  private detach: (() => void)[] = [];

  constructor(video: HTMLVideoElement, src: string, startAt = 0) {
    super();
    this.video = video;
    this.bindEvents();

    if (isHls(src) && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void this.attachHls(src, startAt);
    } else {
      video.src = src;
      if (startAt > 0) {
        // currentTime is only assignable once metadata has loaded.
        const onMeta = () => {
          video.currentTime = startAt;
          video.removeEventListener("loadedmetadata", onMeta);
        };
        video.addEventListener("loadedmetadata", onMeta);
      }
    }

    this.patch({ status: "loading" });
  }

  private async attachHls(src: string, startAt: number) {
    // Dynamic import keeps hls.js out of the bundle for trailer playback,
    // which is the common case and never needs it.
    const { default: HlsLib } = await import("hls.js");

    if (!HlsLib.isSupported()) {
      this.patch({ status: "error", error: "HLS is not supported in this browser." });
      return;
    }

    const hls = new HlsLib({ startPosition: startAt > 0 ? startAt : -1 });
    this.hls = hls;
    hls.loadSource(src);
    hls.attachMedia(this.video);

    hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
      const qualities: Quality[] = hls.levels.map((l, i) => ({
        id: String(i),
        label: l.height ? `${l.height}p` : `Level ${i + 1}`,
        height: l.height,
      }));
      this.patch({
        qualities: [{ id: "-1", label: "Auto" }, ...qualities],
        activeQuality: "-1",
        status: "ready",
      });
    });

    hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => {
      // Report "Auto" while autoLevelEnabled, so the menu reflects intent
      // rather than whichever level the ABR ladder just picked.
      this.patch({
        activeQuality: hls.autoLevelEnabled ? "-1" : String(data.level),
      });
    });

    hls.on(HlsLib.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      this.patch({ status: "error", error: `Playback error: ${data.details}` });
    });
  }

  private bindEvents() {
    const v = this.video;

    const on = <K extends keyof HTMLMediaElementEventMap>(
      event: K,
      handler: (e: HTMLMediaElementEventMap[K]) => void
    ) => {
      v.addEventListener(event, handler as EventListener);
      this.detach.push(() => v.removeEventListener(event, handler as EventListener));
    };

    const syncTime = () => {
      // `buffered` can hold several ranges after seeking around; report the
      // one containing the playhead, which is what the bar should show.
      let bufferedEnd = 0;
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
          bufferedEnd = v.buffered.end(i);
          break;
        }
      }
      this.patch({
        currentTime: v.currentTime,
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        buffered: bufferedEnd,
      });
    };

    on("loadedmetadata", () =>
      this.patch({
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        status: "ready",
      })
    );
    on("timeupdate", syncTime);
    on("progress", syncTime);
    on("play", () => this.patch({ status: "playing" }));
    on("playing", () => this.patch({ status: "playing" }));
    on("pause", () => this.patch({ status: "paused" }));
    on("waiting", () => this.patch({ status: "loading" }));
    on("ended", () => this.patch({ status: "ended" }));
    on("ratechange", () => this.patch({ rate: v.playbackRate }));
    on("volumechange", () => this.patch({ volume: v.volume, muted: v.muted }));
    on("error", () =>
      this.patch({
        status: "error",
        error: mediaErrorMessage(v.error?.code),
      })
    );
  }

  play() {
    return this.video.play();
  }

  pause() {
    this.video.pause();
  }

  seek(seconds: number) {
    const duration = this.video.duration;
    const max = Number.isFinite(duration) ? duration : seconds;
    this.video.currentTime = Math.min(Math.max(seconds, 0), max);
  }

  setVolume(volume: number) {
    this.video.volume = Math.min(Math.max(volume, 0), 1);
    if (volume > 0 && this.video.muted) this.video.muted = false;
  }

  setMuted(muted: boolean) {
    this.video.muted = muted;
  }

  setRate(rate: number) {
    this.video.playbackRate = rate;
  }

  setQuality(id: string) {
    if (!this.hls) return;
    // -1 hands control back to the adaptive ladder.
    this.hls.currentLevel = Number(id);
    this.patch({ activeQuality: id });
  }

  getMediaElement() {
    return this.video;
  }

  destroy() {
    for (const off of this.detach) off();
    this.detach = [];
    this.hls?.destroy();
    this.hls = null;
    this.video.removeAttribute("src");
    this.video.load();
    this.clearListeners();
  }
}

function isHls(src: string) {
  return /\.m3u8($|\?)/i.test(src);
}

function mediaErrorMessage(code?: number): string {
  switch (code) {
    case 1:
      return "Playback was aborted.";
    case 2:
      return "A network error interrupted playback.";
    case 3:
      return "This file is corrupt, or uses a codec this browser can't decode.";
    case 4:
      return "This format isn't supported by your browser. MP4 (H.264/AAC) works everywhere.";
    default:
      return "Playback failed.";
  }
}
