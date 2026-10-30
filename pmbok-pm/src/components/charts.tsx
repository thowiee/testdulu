export function StatusDonut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: number;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef1f7" strokeWidth="16" />
          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dashArray = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={segment.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeDasharray={dashArray}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold leading-none">{centerValue}</span>
          <span className="mt-1 text-[10px] text-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {segments.map((segment) => {
          const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <li key={segment.label} className="flex items-center gap-2 text-[12px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="flex-1 text-slate-600">{segment.label}</span>
              <span className="font-semibold text-ink">{segment.value}</span>
              <span className="w-8 text-right text-[11px] text-muted">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DepartmentBars({ data }: { data: { name: string; count: number }[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  const palette = ["#3b82f6", "#38bdf8", "#f59e0b", "#a855f7", "#64748b", "#10b981"];

  return (
    <div className="flex h-40 items-end gap-4">
      {data.map((item, index) => (
        <div key={item.name} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">{item.count}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max((item.count / max) * 100, 6)}%`,
                backgroundColor: palette[index % palette.length],
              }}
            />
          </div>
          <span className="max-w-[64px] truncate text-[10px] text-muted" title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HealthGauge({ value, color = "#10b981" }: { value: number; color?: string }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = 54;
  const arcLength = Math.PI * radius;
  const dash = (clamped / 100) * arcLength;

  return (
    <div className="relative">
      <svg viewBox="0 0 140 84" className="h-28 w-full">
        <path
          d="M 16 72 A 54 54 0 0 1 124 72"
          fill="none"
          stroke="#eef1f7"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M 16 72 A 54 54 0 0 1 124 72"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLength}`}
        />
      </svg>
      <div className="absolute inset-x-0 top-10 text-center">
        <p className="text-2xl font-semibold leading-none">{clamped}%</p>
        <p className="mt-1 text-[10px] text-muted">Portfolio Health</p>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "bg-brand",
  className = "",
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function MiniBar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}
