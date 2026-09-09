"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, Loader2 } from "lucide-react";

export function AttachLocal({
  titleId,
  slug,
  mediaRoot: mediaRootProp,
}: {
  titleId: string;
  slug?: string;
  mediaRoot?: string;
}) {
  const router = useRouter();
  const [mediaRoot, setMediaRoot] = useState(mediaRootProp ?? "");
  const [filePath, setFilePath] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mediaRootProp) {
      setMediaRoot(mediaRootProp);
      return;
    }
    void fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.mediaRoot) setMediaRoot(json.mediaRoot);
      })
      .catch(() => {});
  }, [mediaRootProp]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/media/attach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titleId, path: filePath.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not attach");
      setFilePath("");
      if (slug) router.push(`/watch/${slug}`);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white/70"
      >
        <HardDrive className="h-3.5 w-3.5" />
        {open ? "Hide local file" : "Have a file you own?"}
      </button>

      {open && (
        <div className="mt-3">
          {!mediaRoot ? (
            <p className="text-sm leading-relaxed text-white/50">
              Set a media folder in{" "}
              <a
                href="/settings"
                className="text-white underline decoration-white/30 underline-offset-2"
              >
                Settings
              </a>{" "}
              first, then attach a file from that folder. Trailers still play
              without this.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder={`${mediaRoot}\\Avengers.Endgame.mp4`}
                  className="min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[var(--c-primary)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={saving || !filePath.trim()}
                  className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Play file"}
                </button>
              </div>
              {error && <p className="text-xs text-amber-300">{error}</p>}
              <p className="text-[11px] text-white/30">
                Must be inside {mediaRoot}. Nothing is uploaded.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
