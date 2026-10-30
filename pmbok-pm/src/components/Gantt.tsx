import { DAY_MS, daysBetween } from "@/lib/pmbok/evm";
import { formatDateID, formatIndex, monthLabel } from "@/lib/format";

export type GanttRow = {
  id: string;
  name: string;
  wbsCode: string;
  cpmStart: string;
  cpmFinish: string;
  baselineStart: string;
  baselineFinish: string;
  totalFloat: number;
  critical: boolean;
  percentComplete: number;
};

function buildTicks(start: Date, end: Date) {
  const totalDays = Math.max((end.getTime() - start.getTime()) / DAY_MS, 1);
  const ticks: { key: string; label: string; basis: number }[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const segmentStart = cursor.getTime() < start.getTime() ? start : cursor;
    const segmentEnd = next.getTime() > end.getTime() ? end : next;
    const days = (segmentEnd.getTime() - segmentStart.getTime()) / DAY_MS;
    if (days > 0) {
      ticks.push({
        key: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`,
        label: `${monthLabel(cursor)} ${String(cursor.getUTCFullYear()).slice(2)}`,
        basis: (days / totalDays) * 100,
      });
    }
    cursor = next;
  }
  return ticks;
}

export function Gantt({
  rows,
  timelineStart,
  timelineEnd,
  today,
}: {
  rows: GanttRow[];
  timelineStart: string;
  timelineEnd: string;
  today: string;
}) {
  const start = new Date(timelineStart);
  const end = new Date(timelineEnd);
  const span = Math.max(daysBetween(start, end), 1);
  const ticks = buildTicks(start, end);

  const leftOf = (value: string | Date) => {
    const percent = (daysBetween(start, new Date(value)) / span) * 100;
    return Math.min(Math.max(percent, 0), 100);
  };
  const widthOf = (from: string | Date, to: string | Date) => {
    const left = leftOf(from);
    const right = leftOf(to);
    return Math.max(Math.min(right - left, 100 - left), 1);
  };
  const todayLeft = leftOf(today);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Gantt — baseline vs jadwal CPM</h2>
          <p className="text-[11px] text-muted">
            Bar abu-abu = baseline yang disetujui; bar berwarna = early schedule hasil CPM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-slate-300" /> baseline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-brand" /> CPM
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-rose-500" /> jalur kritis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-px bg-rose-400" /> hari ini
          </span>
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <div className="min-w-[880px]">
          <div className="flex border-b border-line bg-slate-50/70">
            <div className="w-72 shrink-0 border-r border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Aktivitas
            </div>
            <div className="flex flex-1">
              {ticks.map((tick) => (
                <div
                  key={tick.key}
                  className="border-r border-line/70 px-2 py-2 text-[10px] font-medium text-slate-500 last:border-r-0"
                  style={{ flexBasis: `${tick.basis}%` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex">
            <div className="w-72 shrink-0 border-r border-line">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex h-10 items-center gap-2 border-b border-line/60 px-4 last:border-b-0"
                >
                  <span className="w-9 shrink-0 text-[10px] font-semibold text-slate-400">
                    {row.wbsCode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium" title={row.name}>
                    {row.name}
                  </span>
                  <span
                    className={`chip shrink-0 ${
                      row.critical ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.critical ? "kritis" : `${formatIndex(row.totalFloat)}h`}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative flex-1">
              <div
                className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-rose-400"
                style={{ left: `${todayLeft}%` }}
              />
              {rows.map((row) => (
                <div key={row.id} className="relative h-10 border-b border-line/60 last:border-b-0">
                  <div
                    className="absolute rounded-full bg-slate-300"
                    style={{
                      left: `${leftOf(row.baselineStart)}%`,
                      width: `${widthOf(row.baselineStart, row.baselineFinish)}%`,
                      top: 12,
                      height: 3,
                    }}
                    title={`Baseline ${formatDateID(row.baselineStart)} – ${formatDateID(row.baselineFinish)}`}
                  />
                  <div
                    className={`absolute rounded-full ${
                      row.critical ? "bg-rose-500" : "bg-brand"
                    }`}
                    style={{
                      left: `${leftOf(row.cpmStart)}%`,
                      width: `${widthOf(row.cpmStart, row.cpmFinish)}%`,
                      top: 20,
                      height: 8,
                    }}
                    title={`CPM ${formatDateID(row.cpmStart)} – ${formatDateID(row.cpmFinish)} · ${Math.round(
                      row.percentComplete
                    )}% selesai`}
                  />
                </div>
              ))}
              {rows.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-muted">Belum ada aktivitas.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
