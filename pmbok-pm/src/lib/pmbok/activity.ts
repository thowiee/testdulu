import { daysBetween } from "./evm";

export type ActivityStatus = "TODO" | "ONGOING" | "DONE";

/**
 * Status aktivitas diturunkan dari progress agar tidak ada dua sumber
 * kebenaran (progress 100% tetapi status masih ONGOING).
 */
export function deriveActivityStatus(percentComplete: number): ActivityStatus {
  const percent = Number.isFinite(percentComplete)
    ? Math.min(Math.max(percentComplete, 0), 100)
    : 0;
  if (percent >= 100) return "DONE";
  if (percent > 0) return "ONGOING";
  return "TODO";
}

/** Durasi untuk CPM diturunkan dari tanggal baseline, bukan diketik terpisah. */
export function activityDurationDays(start: Date, finish: Date): number {
  return Math.max(0, daysBetween(start, finish));
}
