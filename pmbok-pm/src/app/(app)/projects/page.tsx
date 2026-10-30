import Link from "next/link";
import { ProgressBar } from "@/components/charts";
import { HealthBadge, VerdictBadge } from "@/components/HealthBadge";
import { formatCompactRupiah, formatDateShort, formatIndex } from "@/lib/format";
import { HEALTH_TONE } from "@/lib/pmbok/health";
import { getPortfolioSnapshot } from "@/lib/pmbok/project-data";

export default async function ProjectsPage() {
  const snapshot = await getPortfolioSnapshot();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Daftar Proyek</h1>
        <p className="mt-1 text-[13px] text-muted">
          Setiap kartu menampilkan verdict gabungan: kinerja EVM (lagging) dan eksekusi rapat dari MOM (leading).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="card group p-5 transition hover:border-brand/40 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {project.code} · {project.department} · {project.lifecycleType}
                </p>
              </div>
              <HealthBadge level={project.health.level} compact />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Progress fisik (EV/BAC)</span>
                <span className="font-semibold">{Math.round(project.evm.percentComplete)}%</span>
              </div>
              <ProgressBar value={project.evm.percentComplete} tone={HEALTH_TONE[project.health.level].bar} />
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Rencana {Math.round(project.evm.percentPlanned)}%</span>
                <span>Terpakai {Math.round(project.evm.percentSpent)}%</span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <dt className="text-muted">SPI</dt>
                <dd className="font-semibold">{formatIndex(project.evm.spi)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <dt className="text-muted">CPI</dt>
                <dd className="font-semibold">{formatIndex(project.evm.cpi)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <dt className="text-muted">MOM</dt>
                <dd className="font-semibold">{project.mom ? Math.round(project.mom.index) : "—"}</dd>
              </div>
            </dl>

            <p className="mt-3 text-[11px] text-muted">
              {formatCompactRupiah(project.bac)} · {formatDateShort(project.startBaseline)} –{" "}
              {formatDateShort(project.finishBaseline)}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <VerdictBadge level={project.health.level} verdict={project.health.verdict} />
              <span className="text-[11px] font-semibold text-brand opacity-0 transition group-hover:opacity-100">
                Buka →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
