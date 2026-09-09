import Link from "next/link";

export default function NotFound() {
  return (
    <div className="crackle page-shell relative flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-marvel-400">
          Variant 404
        </p>
        <h1 className="title-stroke mt-3 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          This timeline doesn&rsquo;t exist
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-white/55">
          That page isn&rsquo;t in this universe. The catalog, the timeline and
          the Watcher are still here.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
          >
            Back to HQ
          </Link>
          <Link
            href="/browse"
            className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
          >
            Browse the catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
