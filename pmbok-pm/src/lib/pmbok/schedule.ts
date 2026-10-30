/**
 * Penjadwalan PMBOK: jaringan dependensi (FS/SS/FF/SF + lag), CPM
 * (forward/backward pass), float, jalur kritis, dan rencana Gantt.
 */
import { addDays, daysBetween } from "./evm";

export const DEPENDENCY_TYPES = ["FS", "SS", "FF", "SF"] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export function dependencyTypeLabel(type: string): string {
  switch (type) {
    case "SS":
      return "Start-to-Start";
    case "FF":
      return "Finish-to-Finish";
    case "SF":
      return "Start-to-Finish";
    default:
      return "Finish-to-Start";
  }
}

export function normalizeDependencyType(type: string): DependencyType {
  return (DEPENDENCY_TYPES as readonly string[]).includes(type) ? (type as DependencyType) : "FS";
}

export type CpmActivityInput = { id: string; durationDays: number };
export type CpmDependencyInput = {
  predId: string;
  succId: string;
  type: string;
  lagDays: number;
};

export type CpmNode = {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  critical: boolean;
};

export type CpmResult = {
  nodes: Map<string, CpmNode>;
  durationDays: number;
  cycles: string[][];
  ignoredDependencies: number;
  order: string[];
};

type Dependency = CpmDependencyInput & { type: DependencyType };

function detectCycles(ids: string[], dependencies: Dependency[]): string[][] {
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const dependency of dependencies) {
    adjacency.get(dependency.predId)?.push(dependency.succId);
  }

  const state = new Map<string, "white" | "gray" | "black">(ids.map((id) => [id, "white"]));
  const stack: string[] = [];
  const cycles: string[][] = [];

  const visit = (id: string): void => {
    state.set(id, "gray");
    stack.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const current = state.get(next) ?? "white";
      if (current === "gray") {
        const start = stack.indexOf(next);
        cycles.push([...stack.slice(start), next]);
      } else if (current === "white") {
        visit(next);
      }
    }
    stack.pop();
    state.set(id, "black");
  };

  for (const id of ids) {
    if ((state.get(id) ?? "white") === "white") visit(id);
  }
  return cycles;
}

function topologicalOrder(ids: string[], dependencies: Dependency[]): string[] {
  const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const dependency of dependencies) {
    outgoing.get(dependency.predId)?.push(dependency.succId);
    indegree.set(dependency.succId, (indegree.get(dependency.succId) ?? 0) + 1);
  }

  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  // Sisa node (jika masih ada siklus) tetap dihitung agar UI tidak kosong.
  for (const id of ids) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

/**
 * CPM dengan empat tipe relasi:
 * - FS: successor mulai setelah predecessor selesai + lag
 * - SS: successor mulai setelah predecessor mulai + lag
 * - FF: successor selesai setelah predecessor selesai + lag
 * - SF: successor selesai setelah predecessor mulai + lag
 */
export function computeSchedule(
  activities: CpmActivityInput[],
  rawDependencies: CpmDependencyInput[]
): CpmResult {
  const ids = activities.map((activity) => activity.id);
  const known = new Set(ids);
  const seen = new Set<string>();
  const dependencies: Dependency[] = [];

  for (const dependency of rawDependencies) {
    if (!known.has(dependency.predId) || !known.has(dependency.succId)) continue;
    if (dependency.predId === dependency.succId) continue;
    const key = `${dependency.predId}|${dependency.succId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dependencies.push({
      ...dependency,
      type: normalizeDependencyType(dependency.type),
      lagDays: Number.isFinite(dependency.lagDays) ? Math.round(dependency.lagDays) : 0,
    });
  }

  const cycles = detectCycles(ids, dependencies);
  let active = dependencies;
  let ignoredDependencies = 0;
  if (cycles.length > 0) {
    const inCycle = new Set(cycles.flat());
    const before = active.length;
    active = active.filter(
      (dependency) => !(inCycle.has(dependency.predId) && inCycle.has(dependency.succId))
    );
    ignoredDependencies = before - active.length;
  }

  const duration = new Map(
    activities.map((activity) => [activity.id, Math.max(0, Math.round(activity.durationDays))])
  );
  const incoming = new Map<string, Dependency[]>();
  const outgoing = new Map<string, Dependency[]>();
  for (const dependency of active) {
    const inGroup = incoming.get(dependency.succId) ?? [];
    inGroup.push(dependency);
    incoming.set(dependency.succId, inGroup);
    const outGroup = outgoing.get(dependency.predId) ?? [];
    outGroup.push(dependency);
    outgoing.set(dependency.predId, outGroup);
  }

  const order = topologicalOrder(ids, active);
  const nodes = new Map<string, CpmNode>();
  for (const id of ids) {
    const days = duration.get(id) ?? 0;
    nodes.set(id, { es: 0, ef: days, ls: 0, lf: 0, totalFloat: 0, critical: false });
  }

  for (const id of order) {
    const node = nodes.get(id);
    if (!node) continue;
    const days = duration.get(id) ?? 0;
    let es = 0;
    for (const dependency of incoming.get(id) ?? []) {
      const pred = nodes.get(dependency.predId);
      if (!pred) continue;
      const candidate =
        dependency.type === "SS"
          ? pred.es + dependency.lagDays
          : dependency.type === "FF"
            ? pred.ef + dependency.lagDays - days
            : dependency.type === "SF"
              ? pred.es + dependency.lagDays - days
              : pred.ef + dependency.lagDays;
      es = Math.max(es, candidate);
    }
    node.es = Math.max(0, es);
    node.ef = node.es + days;
  }

  const projectFinish = Math.max(0, ...[...nodes.values()].map((node) => node.ef));

  for (const node of nodes.values()) node.lf = projectFinish;
  for (const id of [...order].reverse()) {
    const node = nodes.get(id);
    if (!node) continue;
    const days = duration.get(id) ?? 0;
    for (const dependency of outgoing.get(id) ?? []) {
      const succ = nodes.get(dependency.succId);
      if (!succ) continue;
      const candidate =
        dependency.type === "SS"
          ? succ.ls - dependency.lagDays + days
          : dependency.type === "FF"
            ? succ.lf - dependency.lagDays
            : dependency.type === "SF"
              ? succ.lf - dependency.lagDays + days
              : succ.ls - dependency.lagDays;
      node.lf = Math.min(node.lf, candidate);
    }
    node.ls = node.lf - days;
    node.totalFloat = Math.round((node.ls - node.es) * 100) / 100;
    node.critical = projectFinish > 0 && node.totalFloat <= 0.0001;
  }

  return {
    nodes,
    durationDays: projectFinish,
    cycles,
    ignoredDependencies,
    order,
  };
}

export type ScheduleActivityInput = {
  id: string;
  name: string;
  wbsCode: string;
  durationDays: number;
  startBaseline: Date;
  finishBaseline: Date;
  percentComplete: number;
  status: string;
};

export type ScheduleRow = ScheduleActivityInput &
  CpmNode & {
    cpmStart: Date;
    cpmFinish: Date;
    lateDays: number;
  };

export type SchedulePlan = {
  rows: ScheduleRow[];
  nodes: Map<string, CpmNode>;
  durationDays: number;
  finish: Date;
  baselineFinish: Date;
  finishVarianceDays: number;
  criticalCount: number;
  lateCount: number;
  dependencyCount: number;
  ignoredDependencies: number;
  cycles: string[][];
  timelineStart: Date;
  timelineEnd: Date;
};

export function buildSchedulePlan(input: {
  projectStart: Date;
  baselineFinish: Date;
  today: Date;
  activities: ScheduleActivityInput[];
  dependencies: CpmDependencyInput[];
}): SchedulePlan {
  const { projectStart, baselineFinish, today, activities, dependencies } = input;
  const network = computeSchedule(activities, dependencies);
  const finish = addDays(projectStart, network.durationDays);

  const rows: ScheduleRow[] = activities.map((activity) => {
    const node = network.nodes.get(activity.id) ?? {
      es: 0,
      ef: activity.durationDays,
      ls: 0,
      lf: activity.durationDays,
      totalFloat: 0,
      critical: false,
    };
    const lateDays =
      activity.status !== "DONE" ? Math.max(0, daysBetween(activity.finishBaseline, today)) : 0;
    return {
      ...activity,
      ...node,
      cpmStart: addDays(projectStart, node.es),
      cpmFinish: addDays(projectStart, node.ef),
      lateDays,
    };
  });

  const starts = activities.map((activity) => activity.startBaseline.getTime());
  const timelineStart = new Date(Math.min(projectStart.getTime(), ...starts));
  const timelineEnd = new Date(
    Math.max(baselineFinish.getTime(), finish.getTime(), ...activities.map((a) => a.finishBaseline.getTime()))
  );

  return {
    rows,
    nodes: network.nodes,
    durationDays: network.durationDays,
    finish,
    baselineFinish,
    finishVarianceDays: daysBetween(baselineFinish, finish),
    criticalCount: rows.filter((row) => row.critical).length,
    lateCount: rows.filter((row) => row.lateDays > 0).length,
    dependencyCount: dependencies.length,
    ignoredDependencies: network.ignoredDependencies,
    cycles: network.cycles,
    timelineStart,
    timelineEnd,
  };
}
