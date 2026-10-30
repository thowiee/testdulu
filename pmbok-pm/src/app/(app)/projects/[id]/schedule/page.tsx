import Link from "next/link";
import { notFound } from "next/navigation";
import { DependencyEditor } from "@/components/DependencyEditor";
import { Gantt } from "@/components/Gantt";
import { ProjectTabs } from "@/components/ProjectTabs";
import { formatDateID, formatDateShort, formatIndex, formatPercent } from "@/lib/format";
import { canEditPlan } from "@/lib/pmbok/planning-guard";
import { getProjectSchedule } from "@/lib/pmbok/planning-data";
import { getSession } from "@/lib/session";

export default async function ProjectSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, session] = await Promise.all([getProjectSchedule(id), getSession()]);
  if (!data) notFound();

  const canEdit = canEditPlan(session, data.project);
  const plan = data.plan;
  const floatRows = [...data.rows].sort((a, b) => b.totalFloat - a.totalFloat);
  const maxFloat = floatRows[0]?.totalFloat ?? 0;
  const baselineDuration = Math.max(
    0,
    Math.round(
      (new Date(data.project.finishBaseline).getTime() -
        new Date(data.project.startBaseline).getTime()) /
        86_400_000
    )
  );

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <Link href="/projects" className="text-[11px] font-medium text-muted hover:text-brand">
          ← Daftar proyek
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{data.project.name}</h1>
          <span className="chip bg-white text-slate-600 ring-1 ring-line">{data.project.code}</span>
          <span className="chip bg-brand-soft text-brand">Schedule &amp; CPM</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          Jaringan dependensi, early/late dates, float, dan jalur kritis dihitung dengan CPM.
        </p>
      </div>

      <ProjectTabs projectId={data.project.id} active="schedule" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Durasi jaringan CPM</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{plan.durationDays} hari</p>
          <p className="mt-1 text-[11px] text-muted">
            baseline {baselineDuration} hari · selesai {formatDateID(plan.finish)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Selesai vs baseline</p>
          <p className="mt-1 text-2xl font-semibold leading-none">
            {plan.finishVarianceDays === 0
              ? "0 hari"
              : `${plan.finishVarianceDays > 0 ? "+" : ""}${plan.finishVarianceDays} hari`}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            CPM {formatDateID(plan.finish)} · baseline {formatDateID(plan.baselineFinish)}
          </p>
          <span
            className={`mt-2 inline-block chip ${
              plan.finishVarianceDays > 0
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {plan.finishVarianceDays > 0 ? "melewati baseline" : "dalam baseline"}
          </span>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Jalur Kritis</p>
          <p className="mt-1 text-2xl font-semibold leading-none">
            {plan.criticalCount}
            <span className="text-sm font-normal text-muted">/{data.rows.length}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {plan.dependencyCount} relasi dependensi · float terbesar {formatIndex(maxFloat)} hari
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Aktivitas kritis tidak boleh bergeser tanpa menggeser tanggal selesai.
          </p>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Aktivitas terlambat</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{plan.lateCount}</p>
          <p className="mt-1 text-[11px] text-muted">
            baseline sudah lewat, progress belum 100%
          </p>
          <span
            className={`mt-2 inline-block chip ${
              plan.lateCount > 0 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {plan.lateCount > 0 ? "perlu percepatan" : "sesuai jadwal"}
          </span>
        </div>
      </section>

      {plan.ignoredDependencies > 0 || plan.cycles.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-800">
          <b>Jaringan tidak valid:</b> {plan.cycles.length} siklus terdeteksi,{" "}
          {plan.ignoredDependencies} relasi diabaikan saat menghitung CPM. Hapus relasi yang
          membentuk loop.
        </div>
      ) : null}

      <Gantt
        rows={data.rows.map((row) => ({
          id: row.id,
          name: row.name,
          wbsCode: row.wbsCode,
          cpmStart: row.cpmStart.toISOString(),
          cpmFinish: row.cpmFinish.toISOString(),
          baselineStart: row.startBaseline.toISOString(),
          baselineFinish: row.finishBaseline.toISOString(),
          totalFloat: row.totalFloat,
          critical: row.critical,
          percentComplete: row.percentComplete,
        }))}
        timelineStart={plan.timelineStart.toISOString()}
        timelineEnd={plan.timelineEnd.toISOString()}
        today={data.today}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <DependencyEditor
          projectId={data.project.id}
          canEdit={canEdit}
          activities={data.activities}
          dependencies={data.dependencies}
        />

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Tabel CPM</h2>
              <p className="text-[11px] text-muted">Early/late start &amp; finish serta total float.</p>
            </div>
            <span className="chip bg-slate-100 text-slate-600">hari ke-</span>
          </div>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-semibold">Aktivitas</th>
                  <th className="px-2 py-2.5 font-semibold">Durasi</th>
                  <th className="px-2 py-2.5 font-semibold">ES</th>
                  <th className="px-2 py-2.5 font-semibold">EF</th>
                  <th className="px-2 py-2.5 font-semibold">LS</th>
                  <th className="px-2 py-2.5 font-semibold">LF</th>
                  <th className="px-2 py-2.5 font-semibold">Float</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-line/70 last:border-0 ${
                      row.critical ? "bg-rose-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-2.5">
                      <p className="text-[11px] font-medium">{row.name}</p>
                      <p className="font-mono text-[10px] text-muted">{row.wbsCode}</p>
                    </td>
                    <td className="px-2 py-2.5 text-[11px]">{row.durationDays}h</td>
                    <td className="px-2 py-2.5 text-[11px]" title={formatDateID(row.cpmStart)}>
                      {formatDateShort(row.cpmStart)}
                    </td>
                    <td className="px-2 py-2.5 text-[11px]" title={formatDateID(row.cpmFinish)}>
                      {formatDateShort(row.cpmFinish)}
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-slate-500">
                      {formatDateShort(new Date(new Date(data.project.startBaseline).getTime() + row.ls * 86_400_000))}
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-slate-500">
                      {formatDateShort(new Date(new Date(data.project.startBaseline).getTime() + row.lf * 86_400_000))}
                    </td>
                    <td className="px-2 py-2.5 text-[11px]">{formatIndex(row.totalFloat)}h</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`chip ${
                          row.critical ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.critical ? "kritis" : "float"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Milestone</h2>
            <span className="text-[11px] text-muted">{data.milestones.length} item</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {data.milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-center justify-between gap-2 text-[12px]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{milestone.name}</p>
                  <p className="text-[11px] text-muted">
                    baseline {formatDateID(milestone.baselineDate)}
                    {milestone.forecastDate ? ` · forecast ${formatDateID(milestone.forecastDate)}` : ""}
                  </p>
                </div>
                {milestone.status === "DONE" ? (
                  <span className="chip bg-emerald-50 text-emerald-700">selesai</span>
                ) : milestone.slipDays > 0 ? (
                  <span className="chip bg-orange-50 text-orange-700">+{milestone.slipDays} hari</span>
                ) : (
                  <span className="chip bg-slate-100 text-slate-600">sesuai baseline</span>
                )}
              </li>
            ))}
            {data.milestones.length === 0 ? (
              <li className="text-[12px] text-muted">Belum ada milestone.</li>
            ) : null}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Aktivitas dengan float terbesar</h2>
          <p className="text-[11px] text-muted">
            Float = ruang geser sebelum aktivitas memengaruhi tanggal selesai proyek.
          </p>
          <ul className="mt-3 space-y-2">
            {floatRows.slice(0, 4).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 text-[12px]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="text-[11px] text-muted">
                    {formatDateID(row.cpmStart)} – {formatDateID(row.cpmFinish)} · progress{" "}
                    {formatPercent(row.percentComplete, 0)}
                  </p>
                </div>
                <span
                  className={`chip ${
                    row.critical ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700"
                  }`}
                >
                  {row.critical ? "kritis" : `${formatIndex(row.totalFloat)} hari`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">
        Early dates dihitung dari tanggal mulai proyek memakai forward pass CPM; late dates dari
        tanggal selesai jaringan memakai backward pass. Selisih late–early adalah total float. Gantt
        menampilkan bar CPM (early schedule) di atas bar baseline agar penyimpangan jadwal langsung
        terlihat.
      </p>
    </div>
  );
}
