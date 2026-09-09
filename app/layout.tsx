import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "MarvelVerse — every hero, every story, one place",
    template: "%s · MarvelVerse",
  },
  description:
    "The complete Marvel catalog: films, series and animation across the MCU, the Defenders saga, the X-Men and the Spider-Verse. Timeline orders, official trailers and where to watch legally.",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MarvelVerse",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-ink-950 font-sans antialiased">
        <SiteHeader />
        {/* Above the fixed halftone grain in globals.css. */}
        <main className="relative z-[1]">{children}</main>
        <SiteFooter />
        <MobileNav />
      </body>
    </html>
  );
}
