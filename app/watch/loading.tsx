export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-ink-950 px-4 pt-16 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 h-4 w-48 rounded bg-white/10" />
        <div className="aspect-video w-full animate-pulse rounded-xl bg-ink-800" />
      </div>
    </div>
  );
}
