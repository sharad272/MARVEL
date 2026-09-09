"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Compass, Library, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Clapperboard, match: (p: string) => p === "/" },
  {
    href: "/browse",
    label: "Browse",
    icon: Compass,
    match: (p: string) => p.startsWith("/browse") || p.startsWith("/timeline"),
  },
  { href: "/ask", label: "Ask", icon: Sparkles, match: (p: string) => p.startsWith("/ask") },
  {
    href: "/library",
    label: "Library",
    icon: Library,
    match: (p: string) => p.startsWith("/library"),
  },
];

export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/watch")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Primary"
    >
      <ul className="grid h-14 grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  active ? "text-white" : "text-white/45"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-marvel-400")} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
