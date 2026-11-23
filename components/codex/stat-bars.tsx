import { STAT_KEYS, type StatKey } from "@/lib/codex-stats";
import { cn } from "@/lib/utils";

const LABEL: Record<StatKey, string> = {
  intelligence: "Intelligence",
  strength: "Strength",
  speed: "Speed",
  durability: "Durability",
  power: "Power",
  combat: "Combat",
};

export function StatBars({
  stats,
  compare,
  className,
}: {
  stats: Record<StatKey, number | null>;
  /** Second character's stats, drawn as a thin bar under each row. */
  compare?: Record<StatKey, number | null>;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-2.5", className)}>
      {STAT_KEYS.map((k) => {
        const v = stats[k];
        const c = compare?.[k];
        return (
          <div key={k}>
            <div className="mb-1 flex items-baseline justify-between text-[12px]">
              <dt className="font-semibold text-white/60">{LABEL[k]}</dt>
              <dd className="font-bold tabular-nums text-white">
                {v ?? "—"}
                {compare ? <span className="ml-1.5 font-semibold text-white/40">vs {c ?? "—"}</span> : null}
              </dd>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${v ?? 0}%`, backgroundColor: "var(--c-primary)" }}
              />
            </div>
            {compare && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-white/45" style={{ width: `${c ?? 0}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </dl>
  );
}
