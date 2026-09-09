"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Engine } from "./html5-engine";
import { YouTubeEngine } from "./youtube-engine";
import {
  INITIAL_STATE,
  SEEK_STEP_LARGE,
  SEEK_STEP_SMALL,
  VOLUME_STEP,
  type EngineState,
  type PlayerEngine,
  type PlayerSource,
} from "./types";

const VOLUME_KEY = "marvelverse:volume";
const MUTED_KEY = "marvelverse:muted";
const PROGRESS_INTERVAL_MS = 5000;

export type ViewMode = "default" | "theater" | "fullscreen";

export type ProgressTarget = {
  titleId: string;
  episodeId?: string | null;
  videoKey?: string | null;
};

export function usePlayer({
  source,
  containerRef,
  progressTarget,
  onEnded,
}: {
  source: PlayerSource;
  containerRef: React.RefObject<HTMLDivElement | null>;
  progressTarget?: ProgressTarget;
  onEnded?: () => void;
}) {
  const [state, setState] = useState<EngineState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<ViewMode>("default");
  const [pip, setPip] = useState(false);

  const engineRef = useRef<PlayerEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);

  // --- Engine lifecycle --------------------------------------------------
  useEffect(() => {
    let engine: PlayerEngine | null = null;

    if (source.kind === "file" && videoRef.current) {
      engine = new Html5Engine(videoRef.current, source.src, source.startAt ?? 0);
    } else if (source.kind === "youtube" && ytHostRef.current) {
      engine = new YouTubeEngine(ytHostRef.current, source.src, source.startAt ?? 0);
    }

    if (!engine) return;
    engineRef.current = engine;
    const unsubscribe = engine.subscribe(setState);

    // Restore the viewer's volume across sessions and sources.
    try {
      const savedVolume = localStorage.getItem(VOLUME_KEY);
      const savedMuted = localStorage.getItem(MUTED_KEY);
      if (savedVolume != null) engine.setVolume(Number(savedVolume));
      if (savedMuted === "true") engine.setMuted(true);
    } catch {
      // localStorage can throw in private modes; defaults are fine.
    }

    return () => {
      unsubscribe();
      engine?.destroy();
      engineRef.current = null;
    };
  }, [source.kind, source.src, source.startAt]);

  const autoplayed = useRef(false);
  useEffect(() => {
    autoplayed.current = false;
  }, [source.src]);

  useEffect(() => {
    if (autoplayed.current) return;
    if (state.status === "ready") {
      autoplayed.current = true;
      void engineRef.current?.play();
    }
  }, [state.status]);

  // --- Actions -----------------------------------------------------------
  const actions = useMemo(() => {
    const engine = () => engineRef.current;

    return {
      play: () => void engine()?.play(),
      pause: () => engine()?.pause(),
      togglePlay: () => {
        const e = engine();
        if (!e) return;
        if (e.getState().status === "playing") e.pause();
        else void e.play();
      },
      seek: (seconds: number) => engine()?.seek(seconds),
      seekBy: (delta: number) => {
        const e = engine();
        if (!e) return;
        e.seek(e.getState().currentTime + delta);
      },
      /** Jump to a fraction of the runtime — the 0-9 shortcuts. */
      seekToFraction: (fraction: number) => {
        const e = engine();
        if (!e) return;
        e.seek(e.getState().duration * fraction);
      },
      setVolume: (v: number) => {
        const e = engine();
        if (!e) return;
        e.setVolume(v);
        try {
          localStorage.setItem(VOLUME_KEY, String(v));
          localStorage.setItem(MUTED_KEY, String(v === 0));
        } catch {}
      },
      adjustVolume: (delta: number) => {
        const e = engine();
        if (!e) return;
        const next = Math.min(Math.max(e.getState().volume + delta, 0), 1);
        e.setVolume(next);
        try {
          localStorage.setItem(VOLUME_KEY, String(next));
        } catch {}
      },
      toggleMute: () => {
        const e = engine();
        if (!e) return;
        const next = !e.getState().muted;
        e.setMuted(next);
        try {
          localStorage.setItem(MUTED_KEY, String(next));
        } catch {}
      },
      setRate: (r: number) => engine()?.setRate(r),
      setQuality: (id: string) => engine()?.setQuality(id),
    };
  }, []);

  // --- Fullscreen --------------------------------------------------------
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // Denied without a user gesture, or unsupported. Nothing to recover.
    }
  }, [containerRef]);

  useEffect(() => {
    const onChange = () =>
      setViewMode((prev) =>
        document.fullscreenElement ? "fullscreen" : prev === "fullscreen" ? "default" : prev
      );
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleTheater = useCallback(() => {
    setViewMode((m) => (m === "theater" ? "default" : "theater"));
  }, []);

  // --- Picture-in-picture ------------------------------------------------
  // Only available for file playback: a YouTube iframe exposes no video
  // element for the browser to detach.
  const canPip =
    source.kind === "file" &&
    typeof document !== "undefined" &&
    document.pictureInPictureEnabled;

  const togglePip = useCallback(async () => {
    const video = engineRef.current?.getMediaElement();
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Blocked by the browser; the button simply does nothing.
    }
  }, []);

  useEffect(() => {
    const video = engineRef.current?.getMediaElement();
    if (!video) return;
    const onEnter = () => setPip(true);
    const onLeave = () => setPip(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [state.status]);

  // --- Ended -------------------------------------------------------------
  const endedFired = useRef(false);
  useEffect(() => {
    if (state.status === "ended" && !endedFired.current) {
      endedFired.current = true;
      onEnded?.();
    }
    if (state.status === "playing") endedFired.current = false;
  }, [state.status, onEnded]);

  // --- Progress persistence ---------------------------------------------
  // Written on an interval while playing, plus on pause/end/unload, so
  // closing the tab mid-film still resumes correctly.
  const latest = useRef({ currentTime: 0, duration: 0 });
  latest.current = { currentTime: state.currentTime, duration: state.duration };

  useEffect(() => {
    if (!progressTarget) return;

    const save = (useBeacon = false) => {
      const { currentTime, duration } = latest.current;
      if (currentTime < 1) return;

      const body = JSON.stringify({
        ...progressTarget,
        positionSec: currentTime,
        durationSec: duration || null,
      });

      // sendBeacon survives page teardown; fetch does not.
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    const interval =
      state.status === "playing" ? setInterval(save, PROGRESS_INTERVAL_MS) : null;

    if (state.status === "paused" || state.status === "ended") save();

    const onHide = () => save(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [state.status, progressTarget]);

  return {
    state,
    actions,
    viewMode,
    setViewMode,
    toggleFullscreen,
    toggleTheater,
    canPip,
    pip,
    togglePip,
    videoRef,
    ytHostRef,
    steps: { large: SEEK_STEP_LARGE, small: SEEK_STEP_SMALL, volume: VOLUME_STEP },
  };
}

export type PlayerApi = ReturnType<typeof usePlayer>;
