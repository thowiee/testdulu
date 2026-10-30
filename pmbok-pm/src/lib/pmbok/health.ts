import type { EvmResult } from "./evm";

export type HealthLevel =
  | "EXCELLENT"
  | "ON_TRACK"
  | "NEEDS_ATTENTION"
  | "AT_RISK"
  | "CRITICAL";

/** Urutan dari terburuk ke terbaik. */
const ORDER: HealthLevel[] = [
  "CRITICAL",
  "AT_RISK",
  "NEEDS_ATTENTION",
  "ON_TRACK",
  "EXCELLENT",
];

export const HEALTH_SCORE: Record<HealthLevel, number> = {
  EXCELLENT: 95,
  ON_TRACK: 85,
  NEEDS_ATTENTION: 72,
  AT_RISK: 55,
  CRITICAL: 30,
};

export const HEALTH_LABEL: Record<HealthLevel, string> = {
  EXCELLENT: "Excellent",
  ON_TRACK: "On Track",
  NEEDS_ATTENTION: "Perlu Perhatian",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

export const HEALTH_VERDICT: Record<HealthLevel, string> = {
  EXCELLENT: "Lancar",
  ON_TRACK: "Lancar",
  NEEDS_ATTENTION: "Lancar dengan catatan",
  AT_RISK: "Berisiko",
  CRITICAL: "Tidak lancar",
};

/** Kelas Tailwind: latar chip, teks, titik indikator. */
export const HEALTH_TONE: Record<HealthLevel, { chip: string; dot: string; bar: string }> = {
  EXCELLENT: { chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  ON_TRACK: { chip: "bg-teal-50 text-teal-700", dot: "bg-teal-500", bar: "bg-teal-500" },
  NEEDS_ATTENTION: { chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500" },
  AT_RISK: { chip: "bg-orange-50 text-orange-700", dot: "bg-orange-500", bar: "bg-orange-500" },
  CRITICAL: { chip: "bg-rose-50 text-rose-700", dot: "bg-rose-500", bar: "bg-rose-500" },
};

export type GovernanceSignal = { code: string; label: string };

export function worseBy(level: HealthLevel, steps: number): HealthLevel {
  const index = ORDER.indexOf(level);
  return ORDER[Math.max(0, index - steps)];
}

export function worseOf(a: HealthLevel, b: HealthLevel): HealthLevel {
  return ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b;
}

export function betterBy(level: HealthLevel, steps: number): HealthLevel {
  const index = ORDER.indexOf(level);
  return ORDER[Math.min(ORDER.length - 1, index + steps)];
}

export function scoreToLevel(score: number): HealthLevel {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "ON_TRACK";
  if (score >= 70) return "NEEDS_ATTENTION";
  if (score >= 55) return "AT_RISK";
  return "CRITICAL";
}

export type EvmHealthInput = {
  evm: EvmResult;
  openHighRisks: number;
  maxMilestoneSlipDays: number;
};

export type EvmHealthResult = {
  level: HealthLevel;
  reasons: string[];
};

/**
 * Aturan health dari EVM + risiko + milestone (PMBOK Measurement domain).
 * Dievaluasi berurutan; yang pertama cocok menentukan level.
 */
export function evmHealth({
  evm,
  openHighRisks,
  maxMilestoneSlipDays,
}: EvmHealthInput): EvmHealthResult {
  const reasons: string[] = [];
  const minIndex = Math.min(evm.spi, evm.cpi);

  if (evm.percentComplete >= 100 && evm.percentPlanned >= 100) {
    return { level: "EXCELLENT", reasons: ["Proyek selesai 100% dari baseline"] };
  }

  if (minIndex < 0.85 || maxMilestoneSlipDays > 14) {
    if (minIndex < 0.85) {
      reasons.push(
        `${evm.spi < evm.cpi ? "SPI" : "CPI"} ${fmt(minIndex)} di bawah ambang 0,85`
      );
    }
    if (maxMilestoneSlipDays > 14) {
      reasons.push(`Milestone terlambat ${maxMilestoneSlipDays} hari (> 14 hari)`);
    }
    return { level: "CRITICAL", reasons };
  }

  if (minIndex < 0.9) {
    reasons.push(`Indeks kinerja ${fmt(minIndex)} pada rentang 0,85–0,90`);
    return { level: "AT_RISK", reasons };
  }

  if (openHighRisks > 0 || maxMilestoneSlipDays > 0) {
    if (openHighRisks > 0) reasons.push(`${openHighRisks} risiko berskor tinggi masih terbuka`);
    if (maxMilestoneSlipDays > 0) reasons.push(`Milestone bergeser ${maxMilestoneSlipDays} hari`);
    return { level: "AT_RISK", reasons };
  }

  if (minIndex < 0.95) {
    reasons.push(`Indeks kinerja ${fmt(minIndex)} pada rentang 0,90–0,95`);
    return { level: "NEEDS_ATTENTION", reasons };
  }

  if (minIndex >= 1) {
    reasons.push(`SPI ${fmt(evm.spi)} dan CPI ${fmt(evm.cpi)} di atas baseline`);
    return { level: "EXCELLENT", reasons };
  }

  reasons.push(`SPI ${fmt(evm.spi)} · CPI ${fmt(evm.cpi)} dalam toleransi`);
  return { level: "ON_TRACK", reasons };
}

function fmt(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export type CombinedHealthInput = {
  evmLevel: HealthLevel;
  evmReasons: string[];
  momIndex: number | null;
  momReasons: string[];
  hardSignals: GovernanceSignal[];
};

export type CombinedHealth = {
  level: HealthLevel;
  score: number;
  evmScore: number;
  momScore: number | null;
  verdict: string;
  reasons: string[];
  hardSignals: GovernanceSignal[];
};

/**
 * Gabungkan sinyal lagging (EVM) dengan leading (MOM). Sinyal keras dari MOM
 * dapat menurunkan status meski angka EVM masih hijau.
 */
export function combineHealth({
  evmLevel,
  evmReasons,
  momIndex,
  momReasons,
  hardSignals,
}: CombinedHealthInput): CombinedHealth {
  const evmScore = HEALTH_SCORE[evmLevel];
  const blended =
    momIndex === null ? evmScore : 0.6 * evmScore + 0.4 * momIndex;
  // Sinyal MOM hanya boleh menurunkan status, tidak pernah menaikkan EVM yang buruk.
  let level = worseOf(scoreToLevel(blended), evmLevel);

  if (hardSignals.length > 0) level = worseBy(level, 1);
  if (momIndex !== null && momIndex < 70) level = worseBy(level, 1);
  if (momIndex !== null && momIndex < 60 && hardSignals.length >= 2) level = worseBy(level, 1);

  const reasons = [
    ...hardSignals.map((signal) => signal.label),
    ...momReasons,
    ...evmReasons,
  ].slice(0, 6);

  return {
    level,
    score: Math.round(blended),
    evmScore,
    momScore: momIndex === null ? null : Math.round(momIndex),
    verdict: HEALTH_VERDICT[level],
    reasons,
    hardSignals,
  };
}
