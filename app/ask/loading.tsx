export default function Loading() {
  return (
    <div className="page-shell mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <div className="mx-auto h-8 w-56 animate-pulse rounded bg-white/10" />
      <div className="mx-auto mt-4 h-4 w-80 animate-pulse rounded bg-white/10" />
      <div className="mt-10 h-24 animate-pulse rounded-xl bg-ink-850" />
    </div>
  );
}
