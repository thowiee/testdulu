import { HEALTH_LABEL, HEALTH_TONE, type HealthLevel } from "@/lib/pmbok/health";

export function HealthBadge({ level, compact = false }: { level: HealthLevel; compact?: boolean }) {
  const tone = HEALTH_TONE[level];
  return (
    <span className={`chip ${tone.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {compact ? HEALTH_LABEL[level] : `${HEALTH_LABEL[level]}`}
    </span>
  );
}

export function VerdictBadge({ level, verdict }: { level: HealthLevel; verdict: string }) {
  const tone = HEALTH_TONE[level];
  return (
    <span className={`chip ${tone.chip} text-[11px]`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {verdict}
    </span>
  );
}

export function StatusChip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
