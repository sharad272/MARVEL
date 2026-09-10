"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { TitleWatcherActions } from "@/components/title-watcher-actions";
import { officialTrailer } from "@/lib/videos";
import type { TitleCard } from "@/lib/queries";

export function ResultStrip({ titles }: { titles: TitleCard[] }) {
  if (titles.length === 0) return null;

  return (
    <div className="rail mt-4 flex gap-3 overflow-x-auto pb-2">
      {titles.map((t) => {
        const yt = officialTrailer(t.slug);
        return (
          <div key={t.id} className="w-[112px] shrink-0 sm:w-[128px]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-ink-800 ring-1 ring-white/[0.08]">
              <CoverArt
                alt={t.name}
                name={t.name}
                themeSlug={t.themeSlug}
                posterPath={t.posterPath}
                youtubeKey={yt?.key}
                sizes="128px"
              />
              <Link
                href={`/watch/${t.slug}`}
                className="absolute inset-0 flex items-end p-2"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent 50%)" }}
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
                  <Play className="h-2.5 w-2.5 fill-current" />
                  Play
                </span>
              </Link>
            </div>
            <Link
              href={`/title/${t.slug}`}
              className="clamp-2 mt-1.5 block text-[11px] leading-snug text-white/65 hover:text-white"
            >
              {t.name}
            </Link>
            <TitleWatcherActions slug={t.slug} name={t.name} variant="compact" className="mt-1.5" />
          </div>
        );
      })}
    </div>
  );
}
