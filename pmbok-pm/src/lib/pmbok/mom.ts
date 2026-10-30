import { daysBetween } from "./evm";
import type { GovernanceSignal } from "./health";

/** Ambang batas yang dipakai mesin skor MOM. */
export const MOM_WEIGHTS = {
  actionDiscipline: 0.3,
  decisionFollowThrough: 0.2,
  riskTrend: 0.2,
  engagement: 0.15,
  tone: 0.15,
} as const;

export type MomComponent = {
  key: keyof typeof MOM_WEIGHTS;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type MomAction = {
  text: string;
  status: string;
  dueDate: Date;
  completedAt: Date | null;
};

export type MomDecision = {
  text: string;
  impactLevel: string;
  status: string;
  createdAt: Date;
  hasChange: boolean;
};

export type MomRisk = {
  title: string;
  score: number;
  status: string;
  createdAt: Date;
};

export type MomIssue = {
  title: string;
  occurrences: number;
  status: string;
};

export type MomEngagement = {
  quorumRate: number;
  sponsorAttendanceRate: number;
  ackRate: number;
};

export type MomUnsigned = {
  momNo: string;
  title: string;
  daysWaiting: number;
};

export type MomHealthInput = {
  approvedMeetingCount: number;
  actions: MomAction[];
  decisions: MomDecision[];
  risks: MomRisk[];
  issues: MomIssue[];
  engagement: MomEngagement;
  negativeTone: number;
  unsigned: MomUnsigned[];
  today: Date;
};

export type MomHealthResult = {
  index: number;
  components: MomComponent[];
  hardSignals: GovernanceSignal[];
  reasons: string[];
};

function clamp100(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * MOM Health Index: mengubah disiplin rapat menjadi angka 0-100 plus sinyal
 * keras. Hanya dipanggil untuk MOM yang sudah disahkan.
 */
export function computeMomHealth(input: MomHealthInput): MomHealthResult {
  const {
    approvedMeetingCount,
    actions,
    decisions,
    risks,
    issues,
    engagement,
    negativeTone,
    unsigned,
    today,
  } = input;

  // --- 1. Disiplin action item -------------------------------------------
  const closed = actions.filter((a) => a.status === "DONE" || a.completedAt !== null);
  const onTime = closed.filter((a) => a.completedAt !== null && a.completedAt <= a.dueDate);
  const onTimeRate = closed.length > 0 ? onTime.length / closed.length : 1;
  const openActions = actions.filter((a) => a.status !== "DONE" && a.status !== "CANCELLED");
  const overdue = openActions.filter((a) => daysBetween(a.dueDate, today) > 0);
  const overdueLong = overdue.filter((a) => daysBetween(a.dueDate, today) > 14);
  const actionScore =
    actions.length === 0
      ? 85
      : clamp100(100 * (0.6 * onTimeRate + 0.4 * (1 - Math.min(overdue.length / 5, 1))));

  // --- 2. Tindak lanjut keputusan ----------------------------------------
  const followedUp = decisions.filter((d) => d.status === "FOLLOWED_UP");
  const stalledMajor = decisions.filter(
    (d) => d.impactLevel === "MAJOR" && !d.hasChange && daysBetween(d.createdAt, today) > 7
  );
  const decisionScore =
    decisions.length === 0
      ? 85
      : clamp100(100 * (followedUp.length / decisions.length) - 10 * stalledMajor.length);

  // --- 3. Tren risiko & isu ----------------------------------------------
  const newHighRisks = risks.filter(
    (r) => r.score >= 15 && r.status !== "CLOSED" && daysBetween(r.createdAt, today) <= 30
  );
  const closedRisks = risks.filter((r) => r.status === "CLOSED");
  const chronicIssues = issues.filter((i) => i.occurrences >= 3 && i.status !== "CLOSED");
  const riskScore = clamp100(
    100 - 15 * newHighRisks.length + 10 * Math.min(closedRisks.length, 3) - 8 * chronicIssues.length
  );

  // --- 4. Keterlibatan ----------------------------------------------------
  const engagementScore = clamp100(
    100 *
      (0.5 * clamp01(engagement.quorumRate) +
        0.3 * clamp01(engagement.sponsorAttendanceRate) +
        0.2 * clamp01(engagement.ackRate))
  );

  // --- 5. Nada notulen ----------------------------------------------------
  const toneScore = clamp100(100 * (1 - clamp01(negativeTone)));

  const components: MomComponent[] = [
    {
      key: "actionDiscipline",
      label: "Disiplin action item",
      score: round1(actionScore),
      weight: MOM_WEIGHTS.actionDiscipline,
      detail:
        actions.length === 0
          ? "Belum ada action item"
          : `${onTime.length}/${closed.length} selesai tepat waktu · ${overdue.length} terlambat`,
    },
    {
      key: "decisionFollowThrough",
      label: "Tindak lanjut keputusan",
      score: round1(decisionScore),
      weight: MOM_WEIGHTS.decisionFollowThrough,
      detail: `${followedUp.length}/${decisions.length} keputusan ditindaklanjuti${
        stalledMajor.length > 0 ? ` · ${stalledMajor.length} keputusan mayor tanpa CR` : ""
      }`,
    },
    {
      key: "riskTrend",
      label: "Tren risiko & isu",
      score: round1(riskScore),
      weight: MOM_WEIGHTS.riskTrend,
      detail: `${newHighRisks.length} risiko tinggi baru · ${chronicIssues.length} isu kronis`,
    },
    {
      key: "engagement",
      label: "Keterlibatan",
      score: round1(engagementScore),
      weight: MOM_WEIGHTS.engagement,
      detail: `Quorum ${Math.round(engagement.quorumRate * 100)}% · sponsor ${Math.round(
        engagement.sponsorAttendanceRate * 100
      )}% · acknowledge ${Math.round(engagement.ackRate * 100)}%`,
    },
    {
      key: "tone",
      label: "Nada notulen",
      score: round1(toneScore),
      weight: MOM_WEIGHTS.tone,
      detail: `${Math.round(negativeTone * 100)}% kalimat mengandung risiko/kendala`,
    },
  ];

  const index = round1(
    components.reduce((sum, component) => sum + component.score * component.weight, 0)
  );

  // --- Sinyal keras (memaksa status minimal Berisiko) --------------------
  const hardSignals: GovernanceSignal[] = [];
  if (overdueLong.length >= 3) {
    hardSignals.push({
      code: "OVERDUE_ACTIONS",
      label: `${overdueLong.length} action item terlambat lebih dari 14 hari`,
    });
  }
  if (stalledMajor.length > 0) {
    hardSignals.push({
      code: "DECISION_NO_CHANGE",
      label: `${stalledMajor.length} keputusan mayor belum ditindaklanjuti dengan Change Request`,
    });
  }
  for (const issue of chronicIssues) {
    hardSignals.push({
      code: "CHRONIC_ISSUE",
      label: `Isu "${issue.title}" muncul di ${issue.occurrences} rapat tanpa penyelesaian`,
    });
  }
  const staleUnsigned = unsigned.filter((item) => item.daysWaiting > 3);
  if (staleUnsigned.length > 0) {
    hardSignals.push({
      code: "UNSIGNED_MOM",
      label: `${staleUnsigned.length} notulen menunggu tanda tangan lebih dari 3 hari (${staleUnsigned[0].momNo})`,
    });
  }
  if (approvedMeetingCount >= 2 && engagement.sponsorAttendanceRate < 0.5) {
    hardSignals.push({
      code: "SPONSOR_ABSENT",
      label: "Sponsor absen pada sebagian besar rapat yang sudah disahkan",
    });
  }
  if (closed.length >= 3 && onTimeRate < 0.5) {
    hardSignals.push({
      code: "LOW_ON_TIME",
      label: `Hanya ${Math.round(onTimeRate * 100)}% komitmen rapat selesai tepat waktu`,
    });
  }

  // --- Alasan untuk ditampilkan ------------------------------------------
  const reasons: string[] = [];
  for (const component of [...components].sort((a, b) => a.score - b.score)) {
    if (component.score < 70) {
      reasons.push(`${component.label} rendah (${Math.round(component.score)}/100) — ${component.detail}`);
    }
  }
  for (const signal of hardSignals) {
    if (signal.code === "CHRONIC_ISSUE" || signal.code === "OVERDUE_ACTIONS") {
      reasons.push(signal.label);
    }
  }

  return {
    index,
    components,
    hardSignals,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}
