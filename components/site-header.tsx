"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchPalette } from "@/components/search-palette";

const NAV = [
  { href: "/browse", label: "Browse" },
  { href: "/timeline", label: "Timeline" },
  { href: "/characters", label: "Characters" },
  { href: "/library", label: "My Library" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparent over the hero, solid once the billboard is behind us.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // The player owns the viewport; a sticky header over it is just in the way.
  if (pathname.startsWith("/watch")) return null;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-ink-950/85 backdrop-blur-xl"
          : "bg-gradient-to-b from-black/75 to-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:h-16 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-[68px] place-items-center rounded bg-marvel text-[13px] font-black uppercase italic tracking-tight text-white shadow-lg transition-transform group-hover:scale-105">
            Marvel
          </span>
          <span className="hidden text-sm font-semibold tracking-wide text-white/80 sm:block">
            VERSE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <SearchPalette />

          <Link
            href="/ask"
            className="flex h-11 items-center gap-2 rounded-full bg-primary-grad px-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] sm:px-3.5"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="animate-fade-in fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 overflow-y-auto border-t border-white/10 bg-ink-950 px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-3.5 text-base font-medium text-white/75 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/ask"
            className="block rounded-md px-3 py-3.5 text-base font-medium text-white/75 hover:bg-white/5 hover:text-white"
          >
            Ask the Watcher
          </Link>
        </nav>
      )}
    </header>
  );
}
