import { prisma } from "../db";
import { daysBetween } from "./evm";
import {
  buildSchedulePlan,
  type SchedulePlan,
  type ScheduleRow,
} from "./schedule";
import { buildWbsTree, type WbsStats } from "./wbs";

function clampPercent(value: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
}

export type EditorWbsNode = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  kind: string;
  weight: number;
  description: string | null;
  acceptanceCriteria: string | null;
  responsible: string | null;
  depth: number;
  progress: number;
  budget: number;
  share: number;
  childCount: number;
  activityCount: number;
  dictionaryComplete: boolean;
  activities: {
    id: string;
    name: string;
    percentComplete: number;
    budget: number;
    status: string;
    durationDays: number;
    startBaseline: string;
    finishBaseline: string;
    timesheetCount: number;
  }[];
};

export type ScopeView = {
  project: {
    id: string;
    code: string;
    name: string;
    bac: number;
    managerId: string;
    sponsorId: string;
    startBaseline: string;
    finishBaseline: string;
  };
  nodes: EditorWbsNode[];
  stats: WbsStats;
  evmPercent: number;
  leafNodes: EditorWbsNode[];
};

export async function getProjectScope(projectId: string): Promise<ScopeView | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      bac: true,
      managerId: true,
      sponsorId: true,
      startBaseline: true,
      finishBaseline: true,
      wbs: true,
      activities: {
        select: {
          id: true,
          wbsId: true,
          name: true,
          budget: true,
          percentComplete: true,
          status: true,
          durationDays: true,
          startBaseline: true,
          finishBaseline: true,
          _count: { select: { timesheets: true } },
        },
      },
    },
  });
  if (!project) return null;

  const tree = buildWbsTree(project.wbs, project.activities);
  const earnedValue = project.activities.reduce(
    (sum, activity) => sum + activity.budget * (clampPercent(activity.percentComplete) / 100),
    0
  );
  const evmPercent =
    project.bac > 0 ? Math.round((earnedValue / project.bac) * 1000) / 10 : 0;

  const timesheetCountByActivity = new Map(
    project.activities.map((activity) => [activity.id, activity._count.timesheets])
  );

  const nodes: EditorWbsNode[] = tree.flat.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    code: node.code,
    name: node.name,
    kind: node.kind,
    weight: node.weight,
    description: node.description,
    acceptanceCriteria: node.acceptanceCriteria,
    responsible: node.responsible,
    depth: node.depth,
    progress: node.progress,
    budget: node.budget,
    share: node.share,
    childCount: node.childCount,
    activityCount: node.activityCount,
    dictionaryComplete: node.dictionaryComplete,
    activities: node.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      percentComplete: activity.percentComplete,
      budget: activity.budget,
      status: activity.status,
      durationDays: activity.durationDays,
      startBaseline: activity.startBaseline.toISOString(),
      finishBaseline: activity.finishBaseline.toISOString(),
      timesheetCount: timesheetCountByActivity.get(activity.id) ?? 0,
    })),
  }));

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      bac: project.bac,
      managerId: project.managerId,
      sponsorId: project.sponsorId,
      startBaseline: project.startBaseline.toISOString(),
      finishBaseline: project.finishBaseline.toISOString(),
    },
    nodes,
    stats: tree.stats,
    evmPercent,
    leafNodes: nodes.filter((node) => node.childCount === 0),
  };
}

export type DependencyView = {
  id: string;
  predId: string;
  succId: string;
  type: string;
  lagDays: number;
  predName: string;
  predCode: string;
  succName: string;
  succCode: string;
  predCritical: boolean;
  succCritical: boolean;
};

export type ScheduleView = {
  project: {
    id: string;
    code: string;
    name: string;
    managerId: string;
    sponsorId: string;
    startBaseline: string;
    finishBaseline: string;
  };
  plan: SchedulePlan;
  rows: ScheduleRow[];
  dependencies: DependencyView[];
  activities: {
    id: string;
    name: string;
    code: string;
    critical: boolean;
    es: number;
    ef: number;
    totalFloat: number;
  }[];
  milestones: {
    id: string;
    name: string;
    baselineDate: string;
    forecastDate: string | null;
    status: string;
    slipDays: number;
  }[];
  today: string;
};

export async function getProjectSchedule(projectId: string): Promise<ScheduleView | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      managerId: true,
      sponsorId: true,
      startBaseline: true,
      finishBaseline: true,
      wbs: { select: { id: true, code: true } },
      activities: {
        orderBy: { startBaseline: "asc" },
        select: {
          id: true,
          name: true,
          wbsId: true,
          durationDays: true,
          startBaseline: true,
          finishBaseline: true,
          percentComplete: true,
          status: true,
        },
      },
      milestones: { orderBy: { baselineDate: "asc" } },
    },
  });
  if (!project) return null;

  const dependencies = await prisma.dependency.findMany({
    where: { pred: { projectId } },
    include: {
      pred: { select: { id: true, name: true, wbs: { select: { code: true } } } },
      succ: { select: { id: true, name: true, wbs: { select: { code: true } } } },
    },
    orderBy: { id: "asc" },
  });

  const wbsCodeById = new Map(project.wbs.map((element) => [element.id, element.code]));
  const today = new Date();
  const plan = buildSchedulePlan({
    projectStart: project.startBaseline,
    baselineFinish: project.finishBaseline,
    today,
    activities: project.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      wbsCode: (activity.wbsId && wbsCodeById.get(activity.wbsId)) || "—",
      durationDays: activity.durationDays,
      startBaseline: activity.startBaseline,
      finishBaseline: activity.finishBaseline,
      percentComplete: activity.percentComplete,
      status: activity.status,
    })),
    dependencies: dependencies.map((dependency) => ({
      predId: dependency.predId,
      succId: dependency.succId,
      type: dependency.type,
      lagDays: dependency.lagDays,
    })),
  });

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      managerId: project.managerId,
      sponsorId: project.sponsorId,
      startBaseline: project.startBaseline.toISOString(),
      finishBaseline: project.finishBaseline.toISOString(),
    },
    plan,
    rows: plan.rows,
    dependencies: dependencies.map((dependency) => ({
      id: dependency.id,
      predId: dependency.predId,
      succId: dependency.succId,
      type: dependency.type,
      lagDays: dependency.lagDays,
      predName: dependency.pred.name,
      predCode: dependency.pred.wbs?.code ?? "—",
      succName: dependency.succ.name,
      succCode: dependency.succ.wbs?.code ?? "—",
      predCritical: plan.nodes.get(dependency.predId)?.critical ?? false,
      succCritical: plan.nodes.get(dependency.succId)?.critical ?? false,
    })),
    activities: plan.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.wbsCode,
      critical: row.critical,
      es: row.es,
      ef: row.ef,
      totalFloat: row.totalFloat,
    })),
    milestones: project.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      baselineDate: milestone.baselineDate.toISOString(),
      forecastDate: milestone.forecastDate ? milestone.forecastDate.toISOString() : null,
      status: milestone.status,
      slipDays: milestone.forecastDate
        ? Math.max(0, daysBetween(milestone.baselineDate, milestone.forecastDate))
        : 0,
    })),
    today: today.toISOString(),
  };
}
