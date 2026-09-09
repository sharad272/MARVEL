/**
 * Calendar helpers so rails and badges follow the real current date
 * instead of a hardcoded year.
 */

export function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function endOfTodayUtc(now = new Date()): Date {
  return new Date(startOfTodayUtc(now).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function monthsAgoUtc(months: number, now = new Date()): Date {
  const d = startOfTodayUtc(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

export function isUpcoming(date: Date | string | null | undefined, now = new Date()): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > endOfTodayUtc(now).getTime();
}

export function formatAsOf(now = new Date()): string {
  return startOfTodayUtc(now).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
