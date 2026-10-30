export const DAY_MS = 86_400_000;

export function startOfDay(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : new Date(value.getTime());
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export type PlannedActivity = {
  budget: number;
  startBaseline: Date;
  finishBaseline: Date;
};

/**
 * Planned Value linear: porsi anggaran yang seharusnya sudah diselesaikan
 * pada tanggal cut-off, berdasarkan baseline aktivitas.
 */
export function plannedValueAt(activity: PlannedActivity, cutoff: Date): number {
  const total = daysBetween(activity.startBaseline, activity.finishBaseline);
  const elapsed = daysBetween(activity.startBaseline, cutoff);
  if (elapsed <= 0) return 0;
  if (total <= 0 || elapsed >= total) return activity.budget;
  return activity.budget * (elapsed / total);
}

/** Earned Value aktivitas = anggaran x % complete fisik. */
export function earnedValueAt(activity: { budget: number; percentComplete: number }): number {
  return activity.budget * (clamp(activity.percentComplete, 0, 100) / 100);
}

export type EvmTotalsInput = {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
};

export type EvmResult = {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
  percentComplete: number;
  percentPlanned: number;
  percentSpent: number;
};

export function computeEvm({ bac, pv, ev, ac }: EvmTotalsInput): EvmResult {
  const safeBac = Math.max(bac, 0);
  const spi = pv > 0 ? ev / pv : 1;
  const cpi = ac > 0 ? ev / ac : 1;
  const eac = cpi > 0 ? safeBac / cpi : safeBac;
  const etc = Math.max(eac - ac, 0);
  const vac = safeBac - eac;
  const remainingBudget = safeBac - ac;
  const tcpi = Math.abs(remainingBudget) > 0.01 ? (safeBac - ev) / remainingBudget : 0;

  return {
    bac: Math.round(safeBac),
    pv: Math.round(pv),
    ev: Math.round(ev),
    ac: Math.round(ac),
    sv: Math.round(ev - pv),
    cv: Math.round(ev - ac),
    spi: round(spi, 3),
    cpi: round(cpi, 3),
    eac: Math.round(eac),
    etc: Math.round(etc),
    vac: Math.round(vac),
    tcpi: round(tcpi, 2),
    percentComplete: safeBac > 0 ? round((ev / safeBac) * 100, 1) : 0,
    percentPlanned: safeBac > 0 ? round((pv / safeBac) * 100, 1) : 0,
    percentSpent: safeBac > 0 ? round((ac / safeBac) * 100, 1) : 0,
  };
}

/**
 * Forecast tanggal selesai: sisa durasi dibagi SPI (asumsi tren berlanjut).
 */
export function forecastFinishDate(
  finishBaseline: Date,
  today: Date,
  spi: number
): Date {
  const remaining = Math.max(daysBetween(today, finishBaseline), 0);
  const safeSpi = spi > 0.2 ? spi : 0.2;
  return addDays(today, Math.round(remaining / safeSpi));
}

export type CpmActivity = {
  id: string;
  durationDays: number;
  predecessors: { predId: string; type: string; lagDays: number }[];
};

export type CpmResult = {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  float: number;
  critical: boolean;
};

/**
 * Hitung CPM sederhana (forward/backward pass) untuk jaringan aktivitas
 * dengan relasi FS/SS (FF dan SF diperlakukan sebagai FS).
 */
export function computeCriticalPath(activities: CpmActivity[]): Map<string, CpmResult> {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const memo = new Map<string, { es: number; ef: number }>();

  const forward = (id: string, guard = new Set<string>()): { es: number; ef: number } => {
    const cached = memo.get(id);
    if (cached) return cached;
    const activity = byId.get(id);
    if (!activity) return { es: 0, ef: 0 };
    if (guard.has(id)) return { es: 0, ef: activity.durationDays };
    guard.add(id);

    let es = 0;
    for (const dep of activity.predecessors) {
      if (!byId.has(dep.predId)) continue;
      const pred = forward(dep.predId, guard);
      const candidate = dep.type === "SS" ? pred.es + dep.lagDays : pred.ef + dep.lagDays;
      es = Math.max(es, candidate);
    }
    const result = { es, ef: es + activity.durationDays };
    memo.set(id, result);
    return result;
  };

  for (const activity of activities) forward(activity.id);

  const projectFinish = Math.max(...activities.map((a) => memo.get(a.id)?.ef ?? 0), 0);
  const results = new Map<string, CpmResult>();

  const backward = (id: string, guard = new Set<string>()): number => {
    const cached = results.get(id);
    if (cached) return cached.ls;
    const activity = byId.get(id);
    if (!activity) return projectFinish;
    if (guard.has(id)) return projectFinish;
    guard.add(id);

    const successors = activities.filter((a) => a.predecessors.some((p) => p.predId === id));
    let lf = projectFinish;
    if (successors.length > 0) {
      lf = Number.POSITIVE_INFINITY;
      for (const succ of successors) {
        const succStart = backward(succ.id, guard);
        const dep = succ.predecessors.find((p) => p.predId === id)!;
        const candidate = dep.type === "SS" ? succStart - dep.lagDays + activity.durationDays : succStart - dep.lagDays;
        lf = Math.min(lf, candidate);
      }
      if (!Number.isFinite(lf)) lf = projectFinish;
    }

    const { es, ef } = memo.get(id) ?? { es: 0, ef: activity.durationDays };
    const existing = results.get(id);
    if (!existing) {
      results.set(id, {
        es,
        ef,
        ls: lf - activity.durationDays,
        lf,
        float: lf - activity.durationDays - es,
        critical: false,
      });
    }
    return results.get(id)!.ls;
  };

  for (const activity of activities) backward(activity.id);
  for (const [id, value] of results) {
    value.critical = value.float <= 0;
    results.set(id, value);
  }
  return results;
}
