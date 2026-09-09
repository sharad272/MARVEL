"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Player } from "@/components/player/player";
import { youtubeThumb } from "@/lib/tmdb/images";
import type { PlayerSource } from "@/components/player/types";

type VideoItem = { key: string; name: string; kind: string };

type Props = {
  source: PlayerSource;
  titleId: string;
  episodeId: string | null;
  videoKey: string | null;
  isLocal: boolean;
  videos: VideoItem[];
  slug: string;
  activeVideoKey: string | null;
};

/**
 * Client shell around the player: owns theater layout and the up-next
 * queue, and advances to the following video when one ends.
 */
export function WatchScreen({
  source,
  titleId,
  episodeId,
  videoKey,
  isLocal,
  videos,
  slug,
  activeVideoKey,
}: Props) {
  const router = useRouter();
  const [theater, setTheater] = useState(false);

  const queue = videos.filter((v) => v.key !== activeVideoKey);
  const next = queue[0];

  const goToVideo = useCallback(
    (key: string) => {
      // Shallow-ish navigation: the server component re-resolves the source
      // and the player remounts on the new key.
      router.push(`/watch/${slug}?v=${key}`);
    },
    [router, slug]
  );

  return (
    <div className={cn("grid gap-6", !theater && "lg:grid-cols-[1fr_340px]")}>
      <div className="min-w-0">
        <div className="overflow-hidden bg-black sm:rounded-xl">
          <Player
            source={source}
            progressTarget={{ titleId, episodeId, videoKey }}
            onNext={next ? () => goToVideo(next.key) : undefined}
            nextLabel={next ? `Next: ${next.name}` : undefined}
            onEnded={!isLocal && next ? () => goToVideo(next.key) : undefined}
          />
        </div>

        <button
          type="button"
          onClick={() => setTheater((t) => !t)}
          className="mt-3 hidden text-xs font-semibold text-white/45 transition-colors hover:text-white lg:block"
        >
          {theater ? "Show up-next panel" : "Hide up-next panel"}
        </button>
      </div>

      {!theater && queue.length > 0 && (
        <aside className="min-w-0 px-4 sm:px-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
            {isLocal ? "Official videos" : "Up next"}
          </h2>
          <ul className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
            {queue.map((v) => (
              <li key={v.key}>
                <button
                  type="button"
                  onClick={() => goToVideo(v.key)}
                  className="flex w-full gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.07]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumb(v.key)}
                    alt=""
                    width={112}
                    height={63}
                    loading="lazy"
                    className="h-[63px] w-28 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="clamp-2 text-[13px] font-medium leading-snug text-white/90">
                      {v.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/40">{v.kind}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
