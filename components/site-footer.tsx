"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/watch")) return null;
  return (
    <footer className="relative z-[1] mt-12 border-t border-white/10 bg-ink-950 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:mt-24 md:pb-0">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <span className="inline-grid h-7 w-[60px] place-items-center rounded bg-marvel text-[11px] font-black uppercase italic tracking-tight text-white">
              Marvel
            </span>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              A personal catalog and player for the Marvel multiverse. Metadata,
              artwork and streaming availability from{" "}
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-white/70 underline decoration-white/25 underline-offset-2 hover:text-white"
              >
                TMDB
              </a>
              . Trailers served from Marvel&rsquo;s official YouTube channels.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-2">
            {[
              { href: "/browse", label: "Browse" },
              { href: "/timeline", label: "Timeline" },
              { href: "/characters", label: "Characters" },
              { href: "/library", label: "My Library" },
              { href: "/ask", label: "Ask the Watcher" },
              { href: "/settings", label: "Settings" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-white/50 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-6">
          <p className="text-xs leading-relaxed text-white/30">
            MarvelVerse is an unofficial personal-use project and is not
            affiliated with, endorsed by or sponsored by Marvel or The Walt
            Disney Company. All characters, artwork and trailers are the
            property of their respective owners. This app hosts no video of its
            own: it plays official trailers, links out to licensed streaming
            services, and plays media files you already own on this machine.
          </p>
        </div>
      </div>
    </footer>
  );
}
