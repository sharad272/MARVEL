export default function Loading() {
  return (
    <div className="page-shell min-h-dvh px-6 pb-16 lg:px-10">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-ink-800" />
            <div className="mt-2.5 h-3 w-4/5 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
