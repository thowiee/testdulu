/**
 * Struktur lingkup (scope) sesuai PMBOK: WBS hierarkis, WBS dictionary, dan
 * roll-up progress berbobot dari aktivitas di level terendah.
 */

export const MAX_WBS_DEPTH = 4;

export type ScopeElement = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  kind: string;
  weight: number;
  description: string | null;
  acceptanceCriteria: string | null;
  responsible: string | null;
};

export type ScopeActivity = {
  id: string;
  wbsId: string | null;
  name: string;
  budget: number;
  percentComplete: number;
  status: string;
  durationDays: number;
  startBaseline: Date;
  finishBaseline: Date;
};

export type WbsNode = ScopeElement & {
  depth: number;
  /** Porsi bobot terhadap saudara sekandung, 0-100. */
  share: number;
  progress: number;
  budget: number;
  activityCount: number;
  childCount: number;
  dictionaryComplete: boolean;
  children: WbsNode[];
  activities: ScopeActivity[];
};

export type WbsStats = {
  elementCount: number;
  deliverableCount: number;
  workPackageCount: number;
  leafCount: number;
  emptyLeafCount: number;
  dictionaryCompleteCount: number;
  dictionaryRate: number;
  unmappedActivityCount: number;
  mappedBudget: number;
  rootProgress: number;
};

export type WbsTree = {
  roots: WbsNode[];
  flat: WbsNode[];
  byId: Map<string, WbsNode>;
  stats: WbsStats;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function isFilled(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function codeParts(code: string): number[] {
  return code
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((value) => (Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER));
}

/** Urutkan kode WBS secara numerik: 1.2 < 1.10. */
export function compareWbsCode(a: string, b: string): number {
  const left = codeParts(a);
  const right = codeParts(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? -1) - (right[index] ?? -1);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

export function isValidWbsCode(code: string): boolean {
  return /^\d+(\.\d+)*$/.test(code);
}

/** Kode anak berikutnya, mis. 1.2 -> 1.2.3; tanpa induk -> root berikutnya. */
export function nextChildCode(parentCode: string | null, siblingCodes: string[]): string {
  if (!parentCode) {
    const roots = siblingCodes
      .map((code) => Number(code.split(".")[0]))
      .filter((value) => Number.isFinite(value));
    return String((roots.length > 0 ? Math.max(...roots) : 0) + 1);
  }
  const prefix = `${parentCode}.`;
  const direct = siblingCodes
    .filter((code) => code.startsWith(prefix) && !code.slice(prefix.length).includes("."))
    .map((code) => Number(code.slice(prefix.length)))
    .filter((value) => Number.isFinite(value));
  return `${prefix}${(direct.length > 0 ? Math.max(...direct) : 0) + 1}`;
}

/** Kedalaman sebuah elemen (root = 1) mengikuti rantai induk. */
export function wbsDepthById(elements: { id: string; parentId: string | null }[], id: string | null): number {
  if (!id) return 0;
  const byId = new Map(elements.map((element) => [element.id, element]));
  let depth = 0;
  let cursor: string | null = id;
  const guard = new Set<string>();
  while (cursor) {
    if (guard.has(cursor)) break;
    guard.add(cursor);
    const element = byId.get(cursor);
    if (!element) break;
    depth += 1;
    cursor = element.parentId;
  }
  return depth;
}

export function buildWbsTree(elements: ScopeElement[], activities: ScopeActivity[]): WbsTree {
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const childrenOf = new Map<string | null, ScopeElement[]>();
  const activitiesOf = new Map<string, ScopeActivity[]>();

  for (const element of elements) {
    const parentKey =
      element.parentId && elementById.has(element.parentId) ? element.parentId : null;
    const group = childrenOf.get(parentKey) ?? [];
    group.push(element);
    childrenOf.set(parentKey, group);
  }
  for (const group of childrenOf.values()) {
    group.sort((a, b) => compareWbsCode(a.code, b.code));
  }

  let unmappedActivityCount = 0;
  for (const activity of activities) {
    if (!activity.wbsId || !elementById.has(activity.wbsId)) {
      unmappedActivityCount += 1;
      continue;
    }
    const group = activitiesOf.get(activity.wbsId) ?? [];
    group.push(activity);
    activitiesOf.set(activity.wbsId, group);
  }

  const flat: WbsNode[] = [];

  const buildGroup = (parentId: string | null, depth: number): WbsNode[] => {
    const group = childrenOf.get(parentId) ?? [];
    const positiveTotal = group.reduce((sum, element) => sum + Math.max(element.weight, 0), 0);
    return group.map((element) => {
      const share =
        positiveTotal > 0
          ? (Math.max(element.weight, 0) / positiveTotal) * 100
          : group.length > 0
            ? 100 / group.length
            : 0;
      return buildNode(element, depth, share);
    });
  };

  const buildNode = (element: ScopeElement, depth: number, share: number): WbsNode => {
    const children = buildGroup(element.id, depth + 1);
    const ownActivities = activitiesOf.get(element.id) ?? [];
    const ownBudget = ownActivities.reduce((sum, activity) => sum + activity.budget, 0);
    const budget = ownBudget + children.reduce((sum, child) => sum + child.budget, 0);

    let progress = 0;
    if (children.length > 0) {
      // Roll-up berbobot: anak dengan bobot 0 tidak menggeser hasil.
      const positiveTotal = children.reduce((sum, child) => sum + Math.max(child.weight, 0), 0);
      progress =
        positiveTotal > 0
          ? children.reduce((sum, child) => sum + child.progress * Math.max(child.weight, 0), 0) /
            positiveTotal
          : children.reduce((sum, child) => sum + child.progress, 0) / children.length;
    } else if (ownActivities.length > 0) {
      progress =
        ownBudget > 0
          ? ownActivities.reduce(
              (sum, activity) => sum + activity.budget * clampPercent(activity.percentComplete),
              0
            ) / ownBudget
          : ownActivities.reduce(
              (sum, activity) => sum + clampPercent(activity.percentComplete),
              0
            ) / ownActivities.length;
    }

    const node: WbsNode = {
      ...element,
      depth,
      share: Math.round(share * 10) / 10,
      progress: Math.round(progress * 10) / 10,
      budget,
      activityCount:
        ownActivities.length + children.reduce((sum, child) => sum + child.activityCount, 0),
      childCount: children.length,
      dictionaryComplete:
        isFilled(element.description) &&
        isFilled(element.acceptanceCriteria) &&
        isFilled(element.responsible),
      children,
      activities: ownActivities,
    };
    flat.push(node);
    return node;
  };

  const roots = buildGroup(null, 1);
  const rootBudget = roots.reduce((sum, root) => sum + root.budget, 0);
  const rootProgress =
    rootBudget > 0
      ? roots.reduce((sum, root) => sum + root.progress * root.budget, 0) / rootBudget
      : roots.length > 0
        ? roots.reduce((sum, root) => sum + root.progress, 0) / roots.length
        : 0;

  const dictionaryCompleteCount = flat.filter((node) => node.dictionaryComplete).length;
  const stats: WbsStats = {
    elementCount: flat.length,
    deliverableCount: flat.filter((node) => node.kind === "DELIVERABLE").length,
    workPackageCount: flat.filter((node) => node.kind === "WORK_PACKAGE").length,
    leafCount: flat.filter((node) => node.childCount === 0).length,
    emptyLeafCount: flat.filter((node) => node.childCount === 0 && node.activities.length === 0)
      .length,
    dictionaryCompleteCount,
    dictionaryRate: flat.length > 0 ? Math.round((dictionaryCompleteCount / flat.length) * 100) : 0,
    unmappedActivityCount,
    mappedBudget: flat.reduce((sum, node) => sum + node.activities.reduce((s, a) => s + a.budget, 0), 0),
    rootProgress: Math.round(rootProgress * 10) / 10,
  };

  const byId = new Map(flat.map((node) => [node.id, node]));
  return { roots, flat, byId, stats };
}
