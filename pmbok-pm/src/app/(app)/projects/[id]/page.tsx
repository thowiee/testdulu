import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/charts";
import { HealthBadge, VerdictBadge } from "@/components/HealthBadge";
import { ProjectTabs } from "@/components/ProjectTabs";
import {
  formatCompactRupiah,
  formatDateID,
  formatIndex,
  formatPercent,
  meetingStatusLabel,
  meetingTypeLabel,
} from "@/lib/format";
import { HEALTH_TONE } from "@/lib/pmbok/health";
import { getProjectView } from "@/lib/pmbok/project-data";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectView(id);
  if (!project) notFound();

  const tone = HEALTH_TONE[project.health.level];

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/projects" className="text-[11px] font-medium text-muted hover:text-brand">
            ← Daftar proyek
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-[12px] text-muted">
            {project.code} · {project.department} · {project.lifecycleType} · fase {project.phase}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge level={project.health.level} />
          <VerdictBadge level={project.health.level} verdict={project.health.verdict} />
          <span className="chip bg-white text-slate-600 ring-1 ring-line">
            PM {project.managerName} · Sponsor {project.sponsorName}
          </span>
        </div>
      </div>

      <ProjectTabs projectId={project.id} active="overview" />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Kelancaran Proyek</h2>
              <p className="text-[11px] text-muted">
                Gabungan kinerja EVM (lagging) dan eksekusi rapat dari MOM (leading)
              </p>
            </div>
            <span className={`chip ${tone.chip}`}>skor {project.health.score}</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Kinerja EVM (SPI {formatIndex(project.evm.spi)} · CPI {formatIndex(project.evm.cpi)})</span>
                <span className="font-semibold">{project.health.evmScore}</span>
              </div>
              <ProgressBar value={project.health.evmScore} tone={project.health.evmScore >= 80 ? "bg-emerald-500" : "bg-orange-500"} className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">
                  Eksekusi rapat (MOM index){" "}
                  {project.mom ? `· ${Math.round(project.mom.index)}/100` : "· belum ada MOM disahkan"}
                </span>
                <span className="font-semibold">{project.health.momScore ?? "—"}</span>
              </div>
              <ProgressBar
                value={project.health.momScore ?? 0}
                tone={(project.health.momScore ?? 0) >= 75 ? "bg-teal-500" : "bg-rose-500"}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Alasan verdict</p>
            <ul className="mt-2 space-y-1.5">
              {project.health.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-[12px] leading-relaxed text-slate-600">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                  <span>{reason}</span>
                </li>
              ))}
              {project.health.reasons.length === 0 ? (
                <li className="text-[12px] text-muted">Tidak ada penyimpangan terdeteksi.</li>
              ) : null}
            </ul>
          </div>

          {project.health.hardSignals.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.health.hardSignals.map((signal) => (
                <span key={signal.code + signal.label} className="chip bg-rose-50 text-rose-700">
                  {signal.code}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Earned Value (cut-off hari ini)</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 text-[12px]">
            {[
              { label: "BAC", value: formatCompactRupiah(project.evm.bac) },
              { label: "PV", value: formatCompactRupiah(project.evm.pv) },
              { label: "EV", value: formatCompactRupiah(project.evm.ev) },
              { label: "AC", value: formatCompactRupiah(project.evm.ac) },
              { label: "SV", value: formatCompactRupiah(project.evm.sv) },
              { label: "CV", value: formatCompactRupiah(project.evm.cv) },
              { label: "EAC", value: formatCompactRupiah(project.evm.eac) },
              { label: "VAC", value: formatCompactRupiah(project.evm.vac) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-0.5 font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg border border-line px-2 py-1.5">
              <p className="text-muted">% complete</p>
              <p className="font-semibold">{formatPercent(project.evm.percentComplete, 1)}</p>
            </div>
            <div className="rounded-lg border border-line px-2 py-1.5">
              <p className="text-muted">% planned</p>
              <p className="font-semibold">{formatPercent(project.evm.percentPlanned, 1)}</p>
            </div>
            <div className="rounded-lg border border-line px-2 py-1.5">
              <p className="text-muted">TCPI</p>
              <p className="font-semibold">{formatIndex(project.evm.tcpi)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Forecast selesai {formatDateID(project.finishForecast)} · baseline {formatDateID(project.finishBaseline)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Milestone</h2>
            <span className="text-[11px] text-muted">{project.milestones.length} item</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {project.milestones.map((milestone) => (
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
            {project.milestones.length === 0 ? (
              <li className="text-[12px] text-muted">Belum ada milestone.</li>
            ) : null}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Risk Register (skor tertinggi)</h2>
            <span className="text-[11px] text-muted">{project.openHighRisks} risiko tinggi terbuka</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {project.risks.slice(0, 5).map((risk) => (
              <li key={risk.id} className="flex items-start justify-between gap-2 text-[12px]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{risk.title}</p>
                  <p className="text-[11px] text-muted">
                    P{risk.probability} × I{risk.impact} · {risk.response} · {risk.status}
                  </p>
                </div>
                <span
                  className={`chip ${
                    risk.score >= 15
                      ? "bg-rose-50 text-rose-700"
                      : risk.score >= 8
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {risk.score}
                </span>
              </li>
            ))}
            {project.risks.length === 0 ? <li className="text-[12px] text-muted">Belum ada risiko.</li> : null}
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Rapat &amp; Notulen</h2>
          <Link href={`/projects/${project.id}/meetings`} className="text-[11px] font-semibold text-brand hover:underline">
            Kelola MOM →
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {project.meetings.map((meeting) => (
            <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium">{meeting.title}</p>
                <p className="text-[11px] text-muted">
                  {meeting.momNo} · {meetingTypeLabel(meeting.type)} · {formatDateID(meeting.startAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`chip ${
                    meeting.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700"
                      : meeting.status === "REVIEW"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {meetingStatusLabel(meeting.status)}
                </span>
                <span className="chip bg-slate-100 text-slate-600">
                  ttd {meeting.signatureProgress.signed}/{meeting.signatureProgress.total}
                </span>
                <Link
                  href={`/projects/${project.id}/meetings/${meeting.id}`}
                  className="text-[11px] font-semibold text-brand hover:underline"
                >
                  Buka
                </Link>
              </div>
            </li>
          ))}
          {project.meetings.length === 0 ? (
            <li className="text-[12px] text-muted">Belum ada rapat tercatat.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
