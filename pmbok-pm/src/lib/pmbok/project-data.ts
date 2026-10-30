import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  computeEvm,
  daysBetween,
  earnedValueAt,
  forecastFinishDate,
  plannedValueAt,
  type EvmResult,
} from "./evm";
import {
  combineHealth,
  evmHealth,
  type CombinedHealth,
  type HealthLevel,
} from "./health";
import { computeMomHealth, type MomHealthInput, type MomHealthResult } from "./mom";

const projectInclude = Prisma.validator<Prisma.ProjectInclude>()({
  manager: { select: { id: true, name: true, initials: true } },
  sponsor: { select: { id: true, name: true, initials: true } },
  activities: true,
  timesheets: { select: { hours: true, rate: true } },
  milestones: true,
  risks: true,
  issues: true,
  meetings: {
    include: {
      versions: { include: { requests: { include: { signature: true } } } },
      attendees: true,
      actions: true,
      decisions: true,
    },
    orderBy: { startAt: "asc" },
  },
});

export type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export type ProjectView = {
  id: string;
  code: string;
  name: string;
  department: string;
  lifecycleType: string;
  frameworkStatus: string;
  phase: string;
  managerName: string;
  sponsorName: string;
  managerInitials: string;
  sponsorInitials: string;
  startBaseline: string;
  finishBaseline: string;
  finishForecast: string;
  bac: number;
  evm: EvmResult;
  evmLevel: HealthLevel;
  evmReasons: string[];
  mom: MomHealthResult | null;
  health: CombinedHealth;
  openHighRisks: number;
  maxMilestoneSlip: number;
  meetings: {
    id: string;
    momNo: string;
    title: string;
    type: string;
    status: string;
    startAt: string;
    signatureProgress: { signed: number; total: number };
    momIndex: number | null;
  }[];
  milestones: {
    id: string;
    name: string;
    baselineDate: string;
    forecastDate: string | null;
    status: string;
    slipDays: number;
  }[];
  risks: {
    id: string;
    code: string;
    title: string;
    probability: number;
    impact: number;
    score: number;
    response: string;
    status: string;
  }[];
};

function buildMomSource(project: ProjectWithRelations, today: Date): MomHealthInput | null {
  const approvedMeetings = project.meetings.filter((meeting) => meeting.status === "APPROVED");
  const pendingMeetings = project.meetings.filter(
    (meeting) => meeting.status === "REVIEW" || meeting.status === "EXPIRED"
  );

  if (approvedMeetings.length === 0 && pendingMeetings.length === 0) return null;

  const approvedIds = new Set(approvedMeetings.map((meeting) => meeting.id));
  const actions = approvedMeetings.flatMap((meeting) =>
    meeting.actions.map((action) => ({
      text: action.text,
      status: action.status,
      dueDate: action.dueDate,
      completedAt: action.completedAt,
    }))
  );
  const decisions = approvedMeetings.flatMap((meeting) =>
    meeting.decisions.map((decision) => ({
      text: decision.text,
      impactLevel: decision.impactLevel,
      status: decision.status,
      createdAt: decision.createdAt,
      hasChange: decision.changeId !== null,
    }))
  );

  const meetingRisks = project.risks
    .filter((risk) => risk.sourceMeetingId && approvedIds.has(risk.sourceMeetingId))
    .map((risk) => ({
      title: risk.title,
      score: risk.probability * risk.impact,
      status: risk.status,
      createdAt: risk.createdAt,
    }));

  const meetingIssues = project.issues
    .filter((issue) => issue.sourceMeetingId && approvedIds.has(issue.sourceMeetingId))
    .map((issue) => ({
      title: issue.title,
      occurrences: issue.occurrences,
      status: issue.status,
    }));

  const quorumRate =
    approvedMeetings.length > 0
      ? approvedMeetings.reduce((sum, meeting) => {
          const present = meeting.attendees.filter(
            (attendee) => attendee.presence === "PRESENT" || attendee.presence === "LATE"
          ).length;
          return sum + (meeting.attendees.length > 0 ? present / meeting.attendees.length : 0);
        }, 0) / approvedMeetings.length
      : 1;

  const sponsorAttendanceRate =
    approvedMeetings.length > 0
      ? approvedMeetings.filter((meeting) =>
          meeting.attendees.some(
            (attendee) =>
              attendee.userId === project.sponsorId &&
              (attendee.presence === "PRESENT" || attendee.presence === "LATE")
          )
        ).length / approvedMeetings.length
      : 1;

  const allAttendees = approvedMeetings.flatMap((meeting) => meeting.attendees);
  const ackRate =
    allAttendees.length > 0
      ? allAttendees.filter((attendee) => attendee.acknowledgedAt !== null).length /
        allAttendees.length
      : 1;

  const tones = approvedMeetings
    .map((meeting) => {
      const latest = [...meeting.versions].sort((a, b) => b.version - a.version)[0];
      return latest?.negativeTone ?? 0;
    })
    .filter((tone) => Number.isFinite(tone));
  const negativeTone = tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;

  const unsigned = pendingMeetings.map((meeting) => ({
    momNo: meeting.momNo,
    title: meeting.title,
    daysWaiting: Math.max(0, daysBetween(meeting.startAt, today)),
  }));

  return {
    approvedMeetingCount: approvedMeetings.length,
    actions,
    decisions,
    risks: meetingRisks,
    issues: meetingIssues,
    engagement: { quorumRate, sponsorAttendanceRate, ackRate },
    negativeTone,
    unsigned,
    today,
  };
}

export function buildProjectView(project: ProjectWithRelations, today = new Date()): ProjectView {
  const pv = project.activities.reduce((sum, activity) => sum + plannedValueAt(activity, today), 0);
  const ev = project.activities.reduce((sum, activity) => sum + earnedValueAt(activity), 0);
  const ac = project.timesheets.reduce((sum, row) => sum + row.hours * row.rate, 0);
  const evm = computeEvm({ bac: project.bac, pv, ev, ac });

  const maxMilestoneSlip = project.milestones.reduce((max, milestone) => {
    if (milestone.status === "DONE") return max;
    const slip = milestone.forecastDate
      ? Math.max(0, daysBetween(milestone.baselineDate, milestone.forecastDate))
      : 0;
    return Math.max(max, slip);
  }, 0);

  const openHighRisks = project.risks.filter(
    (risk) => risk.probability * risk.impact >= 15 && risk.status !== "CLOSED"
  ).length;

  const evmResult = evmHealth({ evm, openHighRisks, maxMilestoneSlipDays: maxMilestoneSlip });
  const momSource = buildMomSource(project, today);
  const mom = momSource ? computeMomHealth(momSource) : null;

  const health = combineHealth({
    evmLevel: evmResult.level,
    evmReasons: evmResult.reasons,
    momIndex: mom ? mom.index : null,
    momReasons: mom ? mom.reasons : [],
    hardSignals: mom ? mom.hardSignals : [],
  });

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    department: project.department,
    lifecycleType: project.lifecycleType,
    frameworkStatus: project.frameworkStatus,
    phase: project.phase,
    managerName: project.manager.name,
    sponsorName: project.sponsor.name,
    managerInitials: project.manager.initials,
    sponsorInitials: project.sponsor.initials,
    startBaseline: project.startBaseline.toISOString(),
    finishBaseline: project.finishBaseline.toISOString(),
    finishForecast: forecastFinishDate(project.finishBaseline, today, evm.spi).toISOString(),
    bac: project.bac,
    evm,
    evmLevel: evmResult.level,
    evmReasons: evmResult.reasons,
    mom,
    health,
    openHighRisks,
    maxMilestoneSlip,
    meetings: project.meetings.map((meeting) => {
      const latest = [...meeting.versions].sort((a, b) => b.version - a.version)[0];
      const requests = latest?.requests ?? [];
      const signed = requests.filter((request) => request.signature !== null).length;
      const approvedTone = meeting.status === "APPROVED";
      return {
        id: meeting.id,
        momNo: meeting.momNo,
        title: meeting.title,
        type: meeting.type,
        status: meeting.status,
        startAt: meeting.startAt.toISOString(),
        signatureProgress: { signed, total: requests.length },
        momIndex: approvedTone ? health.momScore : null,
      };
    }),
    milestones: project.milestones
      .map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        baselineDate: milestone.baselineDate.toISOString(),
        forecastDate: milestone.forecastDate ? milestone.forecastDate.toISOString() : null,
        status: milestone.status,
        slipDays: milestone.forecastDate
          ? Math.max(0, daysBetween(milestone.baselineDate, milestone.forecastDate))
          : 0,
      }))
      .sort((a, b) => a.baselineDate.localeCompare(b.baselineDate)),
    risks: project.risks
      .map((risk) => ({
        id: risk.id,
        code: risk.code,
        title: risk.title,
        probability: risk.probability,
        impact: risk.impact,
        score: risk.probability * risk.impact,
        response: risk.response,
        status: risk.status,
      }))
      .sort((a, b) => b.score - a.score),
  };
}

export type PortfolioSnapshot = {
  today: string;
  kpi: {
    total: number;
    active: number;
    onTrack: number;
    atRisk: number;
    completed: number;
    watch: number;
    budget: number;
  };
  healthIndex: number;
  evmAverage: number;
  momAverage: number | null;
  projects: ProjectView[];
  departments: { name: string; count: number; bac: number }[];
  milestones: {
    id: string;
    name: string;
    projectName: string;
    projectCode: string;
    date: string;
    slipDays: number;
    status: string;
  }[];
  highlights: string[];
  earlyWarnings: { id: string; name: string; momScore: number; evmLevel: HealthLevel }[];
  unsignedMom: number;
};

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const today = new Date();
  const projects = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { code: "asc" },
  });

  const views = projects.map((project) => buildProjectView(project, today));
  const active = views.filter((view) => view.frameworkStatus === "ACTIVE");
  const completed = views.filter((view) => view.frameworkStatus === "COMPLETED");
  const onTrack = active.filter(
    (view) => view.health.level === "EXCELLENT" || view.health.level === "ON_TRACK"
  );
  const atRisk = active.filter(
    (view) => view.health.level === "AT_RISK" || view.health.level === "CRITICAL"
  );
  const watch = active.filter((view) => view.health.level === "NEEDS_ATTENTION");
  const totalBac = active.reduce((sum, view) => sum + view.bac, 0);
  const healthIndex =
    totalBac > 0
      ? Math.round(
          (active.reduce((sum, view) => sum + view.health.score * view.bac, 0) / totalBac) * 10
        ) / 10
      : 0;
  const evmAverage =
    active.length > 0
      ? Math.round((active.reduce((sum, view) => sum + view.evm.spi, 0) / active.length) * 100) / 100
      : 0;
  const withMom = active.filter((view) => view.mom !== null);
  const momAverage =
    withMom.length > 0
      ? Math.round((withMom.reduce((sum, view) => sum + (view.mom?.index ?? 0), 0) / withMom.length) * 10) /
        10
      : null;

  const departmentMap = new Map<string, { count: number; bac: number }>();
  for (const view of views) {
    const current = departmentMap.get(view.department) ?? { count: 0, bac: 0 };
    current.count += 1;
    current.bac += view.bac;
    departmentMap.set(view.department, current);
  }

  const milestones = views
    .flatMap((view) =>
      view.milestones
        .filter((milestone) => milestone.status !== "DONE")
        .map((milestone) => ({
          id: milestone.id,
          name: milestone.name,
          projectName: view.name,
          projectCode: view.code,
          date: milestone.forecastDate ?? milestone.baselineDate,
          slipDays: milestone.slipDays,
          status: milestone.status,
        }))
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Peringatan dini: angka EVM (SPI/CPI) masih hijau, tetapi eksekusi rapat memburuk.
  const earlyWarnings = active
    .filter(
      (view) =>
        view.mom !== null &&
        view.evm.spi >= 0.95 &&
        view.evm.cpi >= 0.95 &&
        view.mom.index < 70
    )
    .map((view) => ({
      id: view.id,
      name: view.name,
      momScore: view.mom?.index ?? 0,
      evmLevel: view.evmLevel,
    }));

  const unsignedMom = views.reduce(
    (sum, view) =>
      sum +
      view.meetings.filter((meeting) => meeting.status === "REVIEW" || meeting.status === "EXPIRED")
        .length,
    0
  );

  const highlights: string[] = [];
  highlights.push(
    `${onTrack.length} dari ${active.length} proyek aktif berstatus on track (health ${healthIndex}%)`
  );
  if (earlyWarnings.length > 0) {
    highlights.push(
      `Peringatan dini: ${earlyWarnings
        .map((warning) => `${warning.name} (MOM ${Math.round(warning.momScore)})`)
        .join(", ")} — EVM masih hijau, tetapi eksekusi rapat memburuk`
    );
  }
  if (atRisk.length > 0) {
    highlights.push(
      `Fokus perbaikan: ${atRisk
        .map((view) => `${view.name} — ${HEALTH_SUMMARY(view)}`)
        .join("; ")}`
    );
  }
  if (unsignedMom > 0) {
    highlights.push(`${unsignedMom} notulen rapat belum disahkan — dampaknya ditahan sampai ditandatangani`);
  }
  if (completed.length > 0) {
    highlights.push(`${completed.length} proyek selesai dengan VAC terkendali`);
  }

  return {
    today: today.toISOString(),
    kpi: {
      total: views.length,
      active: active.length,
      onTrack: onTrack.length,
      atRisk: atRisk.length,
      completed: completed.length,
      watch: watch.length,
      budget: views.reduce((sum, view) => sum + view.bac, 0),
    },
    healthIndex,
    evmAverage,
    momAverage,
    projects: views,
    departments: [...departmentMap.entries()]
      .map(([name, value]) => ({ name, count: value.count, bac: value.bac }))
      .sort((a, b) => b.count - a.count),
    milestones,
    highlights,
    earlyWarnings,
    unsignedMom,
  };
}

function HEALTH_SUMMARY(view: ProjectView): string {
  const parts = [`${view.health.verdict.toLowerCase()}`, `SPI ${view.evm.spi.toFixed(2)}`];
  if (view.mom) parts.push(`MOM ${Math.round(view.mom.index)}`);
  return parts.join(", ");
}

export async function getProjectView(projectId: string): Promise<ProjectView | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });
  if (!project) return null;
  return buildProjectView(project);
}

export type GovernanceItem = {
  meetingId: string;
  momNo: string;
  title: string;
  type: string;
  status: string;
  startAt: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  signed: number;
  total: number;
  pendingSigners: string[];
  daysWaiting: number;
};

export async function getGovernanceQueue(): Promise<GovernanceItem[]> {
  const today = new Date();
  const meetings = await prisma.meeting.findMany({
    where: { status: { in: ["REVIEW", "EXPIRED", "DRAFT"] } },
    include: {
      project: { select: { id: true, name: true, code: true } },
      versions: { include: { requests: { include: { signature: true, signer: true } } } },
    },
    orderBy: { startAt: "asc" },
  });

  return meetings.map((meeting) => {
    const latest = [...meeting.versions].sort((a, b) => b.version - a.version)[0];
    const requests = latest?.requests ?? [];
    return {
      meetingId: meeting.id,
      momNo: meeting.momNo,
      title: meeting.title,
      type: meeting.type,
      status: meeting.status,
      startAt: meeting.startAt.toISOString(),
      projectId: meeting.project?.id ?? "",
      projectName: meeting.project?.name ?? "Portofolio",
      projectCode: meeting.project?.code ?? "-",
      signed: requests.filter((request) => request.signature !== null).length,
      total: requests.length,
      pendingSigners: requests
        .filter((request) => request.signature === null)
        .map((request) => request.signer.name),
      daysWaiting: Math.max(0, daysBetween(meeting.startAt, today)),
    };
  });
}
