"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, Loader2 } from "lucide-react";

export function MediaRootForm({
  initialRoot,
  lockedByEnv,
  indexedCount,
}: {
  initialRoot: string;
  lockedByEnv: boolean;
  indexedCount: number;
}) {
  const router = useRouter();
  const [root, setRoot] = useState(initialRoot);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaRoot: root.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      setRoot(json.mediaRoot);
      setMessage("Folder saved. Scan it to match files to titles.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const scan = async () => {
    setScanning(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/media/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setMessage("Scan finished. Matched files now play as the full movie.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="panel rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.07] text-white/70">
          <HardDrive className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-bold text-white">Your movies</h2>
          <p className="text-[13px] text-white/50">
            {indexedCount} file{indexedCount === 1 ? "" : "s"} indexed
          </p>
        </div>
      </div>

      <p className="mb-3 text-[13px] leading-relaxed text-white/55">
        Point this at a folder of films you already own. The built-in player
        streams them from disk with the same controls as the trailers.
      </p>

      <form onSubmit={save} className="space-y-2">
        <input
          value={root}
          onChange={(e) => setRoot(e.target.value)}
          disabled={lockedByEnv || saving}
          placeholder="D:\Media\Marvel"
          className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-marvel focus:outline-none disabled:opacity-60"
        />
        <div className="flex flex-wrap gap-2">
          {!lockedByEnv && (
            <button
              type="submit"
              disabled={saving || !root.trim()}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save folder"}
            </button>
          )}
          <button
            type="button"
            onClick={scan}
            disabled={scanning || !root.trim()}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Scan folder"}
          </button>
        </div>
      </form>

      {lockedByEnv && (
        <p className="mt-2 text-[11px] text-white/35">
          Locked by LOCAL_MEDIA_ROOT in .env.local.
        </p>
      )}
      {message && <p className="mt-2 text-xs text-emerald-300">{message}</p>}
      {error && <p className="mt-2 whitespace-pre-wrap text-xs text-amber-300">{error}</p>}
    </div>
  );
}
