import { Check, X, Database, Sparkles, Globe, CalendarClock } from "lucide-react";
import { db } from "@/lib/db";
import { getCatalogStats } from "@/lib/queries";
import { hasTmdbKey } from "@/lib/tmdb/client";
import { hasLlm, llmModel, llmProviderLabel } from "@/lib/llm/groq";
import { formatRelative } from "@/lib/utils";
import { formatAsOf } from "@/lib/clock";
import { getMediaRoot } from "@/lib/media/root";
import { MediaRootForm } from "@/components/media-root-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

/**
 * Status dashboard rather than a settings form: everything here is
 * configured in `.env.local`, so the useful thing to show is which
 * integrations are live and what the last sync actually did.
 */
export default async function SettingsPage() {
  const region = process.env.WATCH_REGION?.trim() || "US";
  const model = llmModel();
  const mediaRoot = await getMediaRoot();
  const lockedByEnv = Boolean(process.env.LOCAL_MEDIA_ROOT?.trim());

  const [stats, logs, localCount, availabilityCount] = await Promise.all([
    getCatalogStats(),
    db.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 8 }),
    db.localMedia.count(),
    db.availability.count({ where: { region } }),
  ]);

  return (
    <div className="page-shell mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Settings & status
        </h1>
        <p className="mt-2 leading-relaxed text-white/50">
          Integrations live in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">.env.local</code>.
          Your media folder can be set below — trailers play from YouTube without
          it.
        </p>
      </header>

      <div className="space-y-4">
        <StatusCard
          icon={<CalendarClock className="h-4 w-4" />}
          title="Release calendar"
          on
          onLabel={`Live · ${formatAsOf()}`}
          detail={
            stats.refreshedAt
              ? `${stats.titles} titles. Latest / Coming soon follow today's date. Last slate check ${formatRelative(stats.refreshedAt)}.`
              : `${stats.titles} titles. Latest / Coming soon follow today's date. Run npm run refresh after adding a TMDB key to ingest new releases.`
          }
          command="npm run refresh"
        />

        <StatusCard
          icon={<Database className="h-4 w-4" />}
          title="TMDB"
          on={hasTmdbKey()}
          onLabel="Connected"
          offLabel="No API key"
          detail={
            hasTmdbKey()
              ? `${stats.withArt} of ${stats.titles} titles have artwork. New MCU titles are discovered automatically (home, worker, deploy, daily cron).`
              : "Without a key, already-seeded titles still flip Latest ↔ Coming soon on release day. Set TMDB_API_KEY to ingest brand-new Marvel titles, posters and streaming links."
          }
          command={hasTmdbKey() ? "npm run sync" : undefined}
        />

        <StatusCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Language model"
          on={hasLlm()}
          onLabel={hasLlm() ? `${llmProviderLabel()} · ${model}` : undefined}
          offLabel="No API key"
          detail={
            hasLlm()
              ? "Powers natural-language search, spoiler-free recaps, watch-order advice and character arcs."
              : "Set HF_TOKEN in .env.local to enable Ask the Watcher, recaps and character arcs. Everything else works without it."
          }
          command="npm run check:llm"
        />

        <StatusCard
          icon={<Globe className="h-4 w-4" />}
          title="Watch region"
          on
          onLabel={region}
          detail={`${availabilityCount} provider entries recorded for ${region}. Change WATCH_REGION to any ISO 3166-1 code and re-sync.`}
        />

        <MediaRootForm
          initialRoot={mediaRoot}
          lockedByEnv={lockedByEnv}
          indexedCount={localCount}
        />
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
          Recent jobs
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-white/35">
            No jobs have run yet. Try{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">npm run sync</code>.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.07] overflow-hidden rounded-xl border border-white/[0.07]">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 p-3.5">
                <span
                  className={
                    log.status === "OK"
                      ? "h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                      : log.status === "PARTIAL"
                        ? "h-2 w-2 shrink-0 rounded-full bg-amber-400"
                        : "h-2 w-2 shrink-0 rounded-full bg-red-400"
                  }
                />
                <span className="w-24 shrink-0 text-sm font-medium text-white">{log.job}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/50">
                  {log.message ?? "—"}
                </span>
                <span className="shrink-0 text-xs text-white/30">
                  {formatRelative(log.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  on,
  onLabel,
  offLabel,
  detail,
  command,
}: {
  icon: React.ReactNode;
  title: string;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  detail: string;
  command?: string;
}) {
  return (
    <div className="panel rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-white/70">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-white">{title}</h2>
            <span
              className={
                on
                  ? "flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300"
                  : "flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/50"
              }
            >
              {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span className="max-w-[220px] truncate">
                {on ? (onLabel ?? "Enabled") : (offLabel ?? "Disabled")}
              </span>
            </span>
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{detail}</p>

          {command && (
            <code className="mt-2.5 inline-block rounded bg-black/40 px-2 py-1 text-xs text-white/70">
              {command}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
