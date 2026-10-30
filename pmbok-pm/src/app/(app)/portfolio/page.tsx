import Link from "next/link";
import { DepartmentBars, HealthGauge, ProgressBar, StatusDonut } from "@/components/charts";
import { HealthBadge } from "@/components/HealthBadge";
import { formatCompactRupiah, formatDateShort, formatIndex } from "@/lib/format";
import { HEALTH_TONE } from "@/lib/pmbok/health";
import { getPortfolioSnapshot } from "@/lib/pmbok/project-data";

export default async function PortfolioPage() {
  const snapshot = await getPortfolioSnapshot();
  const { kpi } = snapshot;

  const segments = [
    { label: "On Track", value: kpi.onTrack, color: "#10b981" },
    { label: "Perlu Perhatian", value: kpi.watch, color: "#f59e0b" },
    { label: "Berisiko", value: kpi.atRisk, color: "#f97316" },
    { label: "Selesai", value: kpi.completed, color: "#3b82f6" },
  ];

  const cards = [
    { label: "Total Proyek", value: kpi.total, hint: `${formatCompactRupiah(kpi.budget)} total baseline` },
    { label: "Proyek Aktif", value: kpi.active, hint: `${kpi.completed} selesai` },
    { label: "On Track", value: kpi.onTrack, hint: `${Math.round((kpi.onTrack / Math.max(kpi.active, 1)) * 100)}% dari proyek aktif` },
    { label: "At Risk", value: kpi.atRisk, hint: `${kpi.watch} perlu perhatian` },
    { label: "Selesai", value: kpi.completed, hint: "dengan VAC terkendali" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Project Portfolio Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted">
            Track · Monitor · Deliver — status dihitung dari EVM dan disiplin MOM, bukan diisi manual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="chip bg-white text-slate-600 ring-1 ring-line">As of {formatDateShort(snapshot.today)}</span>
          <span className="chip bg-white text-slate-600 ring-1 ring-line">Semua Departemen</span>
          <span className="chip bg-white text-slate-600 ring-1 ring-line">{kpi.total} proyek</span>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold leading-none">{card.value}</p>
            <p className="mt-2 text-[11px] text-muted">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Project Status Overview</h2>
          <p className="mt-0.5 text-[11px] text-muted">Hasil gabungan EVM + sinyal MOM</p>
          <div className="mt-5">
            <StatusDonut segments={segments} centerValue={kpi.total} centerLabel="Total Proyek" />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Proyek per Departemen</h2>
          <p className="mt-0.5 text-[11px] text-muted">Performing organization</p>
          <div className="mt-5">
            <DepartmentBars data={snapshot.departments} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Portfolio Health</h2>
          <p className="mt-0.5 text-[11px] text-muted">Rata-rata berbobot BAC</p>
          <HealthGauge value={snapshot.healthIndex} color={snapshot.healthIndex >= 80 ? "#10b981" : snapshot.healthIndex >= 65 ? "#f59e0b" : "#f97316"} />
          <div className="mt-3 space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Rata-rata SPI (EVM)</span>
                <span className="font-semibold">{formatIndex(snapshot.evmAverage)}</span>
              </div>
              <ProgressBar
                value={Math.min(snapshot.evmAverage * 80, 100)}
                tone={snapshot.evmAverage >= 0.95 ? "bg-emerald-500" : "bg-orange-500"}
                className="mt-1.5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Rata-rata MOM Index</span>
                <span className="font-semibold">{snapshot.momAverage ?? "—"}</span>
              </div>
              <ProgressBar
                value={snapshot.momAverage ?? 0}
                tone={(snapshot.momAverage ?? 100) >= 80 ? "bg-teal-500" : "bg-amber-500"}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]">
              <span className="text-muted">MOM belum disahkan</span>
              <span className="font-semibold text-rose-600">{snapshot.unsignedMom}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming Milestones</h2>
            <span className="text-[11px] text-muted">baseline vs forecast</span>
          </div>
          <ul className="mt-4 space-y-3">
            {snapshot.milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-center gap-3">
                <div className="w-12 shrink-0 rounded-lg bg-slate-50 py-1.5 text-center">
                  <p className="text-[9px] font-semibold uppercase text-muted">{formatDateShort(milestone.date).split(" ")[1]}</p>
                  <p className="text-sm font-semibold leading-none">{formatDateShort(milestone.date).split(" ")[0]}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{milestone.name}</p>
                  <p className="truncate text-[11px] text-muted">
                    {milestone.projectName} · {milestone.projectCode}
                  </p>
                </div>
                {milestone.slipDays > 0 ? (
                  <span className="chip bg-orange-50 text-orange-700">+{milestone.slipDays} hari</span>
                ) : (
                  <span className="chip bg-emerald-50 text-emerald-700">sesuai baseline</span>
                )}
              </li>
            ))}
            {snapshot.milestones.length === 0 ? (
              <li className="text-[12px] text-muted">Belum ada milestone mendatang.</li>
            ) : null}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Key Highlights</h2>
            <span className="text-[11px] text-muted">dihasilkan otomatis</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {snapshot.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2 text-[12px] leading-relaxed text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
          {snapshot.earlyWarnings.length > 0 ? (
            <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-amber-800">Peringatan dini (EVM hijau, MOM merah)</p>
              <ul className="mt-1.5 space-y-1">
                {snapshot.earlyWarnings.map((warning) => (
                  <li key={warning.id} className="text-[11px] text-amber-800">
                    {warning.name} — MOM index {Math.round(warning.momScore)} sementara EVM {warning.evmLevel}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Project Portfolio</h2>
            <p className="text-[11px] text-muted">Klik baris untuk melihat detail PMBOK proyek</p>
          </div>
          <Link href="/projects" className="text-[11px] font-semibold text-brand hover:underline">
            Lihat semua proyek →
          </Link>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[980px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">Proyek</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Progress (EV)</th>
                <th className="px-3 py-2.5 font-semibold">SPI</th>
                <th className="px-3 py-2.5 font-semibold">CPI</th>
                <th className="px-3 py-2.5 font-semibold">MOM</th>
                <th className="px-3 py-2.5 font-semibold">BAC</th>
                <th className="px-3 py-2.5 font-semibold">Jadwal</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {snapshot.projects.map((project) => (
                <tr key={project.id} className="border-b border-line/70 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/projects/${project.id}`} className="block">
                      <p className="font-semibold text-ink">{project.name}</p>
                      <p className="text-[11px] text-muted">
                        {project.code} · {project.department}
                      </p>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <HealthBadge level={project.health.level} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={project.evm.percentComplete} tone={HEALTH_TONE[project.health.level].bar} className="w-20" />
                      <span className="w-9 text-right text-[11px] font-medium">{Math.round(project.evm.percentComplete)}%</span>
                    </div>
                  </td>
                  <td className={`px-3 py-3 font-medium ${project.evm.spi < 0.95 ? "text-orange-600" : "text-emerald-600"}`}>
                    {formatIndex(project.evm.spi)}
                  </td>
                  <td className={`px-3 py-3 font-medium ${project.evm.cpi < 0.95 ? "text-orange-600" : "text-emerald-600"}`}>
                    {formatIndex(project.evm.cpi)}
                  </td>
                  <td className="px-3 py-3">
                    {project.mom ? (
                      <span className={`font-medium ${project.mom.index < 70 ? "text-rose-600" : "text-slate-700"}`}>
                        {Math.round(project.mom.index)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{formatCompactRupiah(project.bac)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">
                    {formatDateShort(project.startBaseline)} – {formatDateShort(project.finishBaseline)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/projects/${project.id}`} className="text-brand hover:underline">
                      →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
