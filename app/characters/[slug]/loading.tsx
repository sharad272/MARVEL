export default function Loading() {
  return (
    <div className="page-shell mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-10">
      <div className="h-16 w-80 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-48 animate-pulse rounded bg-white/10" />
      <div className="mt-10 h-24 animate-pulse rounded-xl bg-ink-850" />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink-800" />
        ))}
      </div>
    </div>
  );
}
