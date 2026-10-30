import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/ProjectTabs";
import { WbsEditor } from "@/components/WbsEditor";
import { ProgressBar } from "@/components/charts";
import { formatCompactRupiah, formatPercent } from "@/lib/format";
import { canEditPlan } from "@/lib/pmbok/planning-guard";
import { getProjectScope } from "@/lib/pmbok/planning-data";
import { getSession } from "@/lib/session";

export default async function ProjectScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, session] = await Promise.all([getProjectScope(id), getSession()]);
  if (!data) notFound();

  const canEdit = canEditPlan(session, data.project);
  const stats = data.stats;
  const budgetCoverage =
    data.project.bac > 0 ? Math.round((stats.mappedBudget / data.project.bac) * 1000) / 10 : 0;
  const progressGap = Math.round((stats.rootProgress - data.evmPercent) * 10) / 10;

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <Link href="/projects" className="text-[11px] font-medium text-muted hover:text-brand">
          ← Daftar proyek
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{data.project.name}</h1>
          <span className="chip bg-white text-slate-600 ring-1 ring-line">{data.project.code}</span>
          <span className="chip bg-brand-soft text-brand">Scope &amp; WBS</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          WBS dictionary, bobot elemen, dan roll-up progress dari aktivitas di level terendah.
        </p>
      </div>

      <ProjectTabs projectId={data.project.id} active="scope" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Struktur WBS</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{stats.elementCount}</p>
          <p className="mt-1 text-[11px] text-muted">
            {stats.deliverableCount} deliverable · {stats.workPackageCount} work package
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            {stats.leafCount} elemen daun
            {stats.emptyLeafCount > 0 ? ` · ${stats.emptyLeafCount} tanpa aktivitas` : ""}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Roll-up progress</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-2xl font-semibold leading-none">{formatPercent(stats.rootProgress, 1)}</p>
            <span className="chip bg-slate-100 text-slate-600">berbobot</span>
          </div>
          <ProgressBar value={stats.rootProgress} className="mt-2.5" />
          <p className="mt-2 text-[11px] text-muted">
            EV/BAC {formatPercent(data.evmPercent, 1)} · selisih {progressGap > 0 ? "+" : ""}
            {formatPercent(progressGap, 1)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">WBS Dictionary</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{formatPercent(stats.dictionaryRate)}</p>
          <p className="mt-1 text-[11px] text-muted">
            {stats.dictionaryCompleteCount}/{stats.elementCount} elemen lengkap (deskripsi, kriteria,
            penanggung jawab)
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {stats.dictionaryRate === 100 ? (
              <span className="chip bg-emerald-50 text-emerald-700">lengkap</span>
            ) : (
              <span className="chip bg-amber-50 text-amber-700">
                {stats.elementCount - stats.dictionaryCompleteCount} elemen perlu dilengkapi
              </span>
            )}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted">Cakupan anggaran</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{formatPercent(budgetCoverage, 1)}</p>
          <p className="mt-1 text-[11px] text-muted">
            {formatCompactRupiah(stats.mappedBudget)} dari BAC {formatCompactRupiah(data.project.bac)}
          </p>
          {budgetCoverage > 100 ? (
            <p className="mt-2 text-[11px] font-semibold text-rose-600">
              over-alokasi: kurangi anggaran aktivitas atau revisi BAC
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-500">
            {stats.unmappedActivityCount} aktivitas belum ditempel ke WBS
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-brand/20 bg-brand-soft/60 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-slate-600">
          <b>Aturan roll-up:</b> progress elemen induk = Σ(progress anak × bobot anak) / Σ bobot anak.
          Elemen berbobot 0 (mis. governance) tetap terlihat di struktur dan Gantt, tetapi tidak
          menggeser progres lingkup. Bobot bukan persentase anggaran — anggaran tetap dihitung dari
          aktivitas.
        </p>
      </section>

      <WbsEditor projectId={data.project.id} nodes={data.nodes} canEdit={canEdit} />

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">WBS Dictionary</h2>
            <p className="text-[11px] text-muted">
              Rincian setiap work package: deskripsi, kriteria penerimaan, penanggung jawab, dan bobot.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">{data.leafNodes.length} work package</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[980px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">Kode</th>
                <th className="px-3 py-2.5 font-semibold">Elemen</th>
                <th className="px-3 py-2.5 font-semibold">Deskripsi</th>
                <th className="px-3 py-2.5 font-semibold">Kriteria penerimaan</th>
                <th className="px-3 py-2.5 font-semibold">Penanggung jawab</th>
                <th className="px-3 py-2.5 font-semibold">Bobot</th>
                <th className="px-3 py-2.5 font-semibold">Progress</th>
                <th className="px-5 py-2.5 font-semibold">Anggaran</th>
              </tr>
            </thead>
            <tbody>
              {data.leafNodes.map((node) => (
                <tr key={node.id} className="border-b border-line/70 align-top last:border-0">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{node.code}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{node.name}</p>
                    <p className="text-[10px] text-muted">{node.activityCount} aktivitas</p>
                  </td>
                  <td className="max-w-[240px] px-3 py-3 text-[11px] text-slate-600">
                    {node.description ?? (
                      <span className="text-amber-600">belum diisi</span>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-[11px] text-slate-600">
                    {node.acceptanceCriteria ?? <span className="text-amber-600">belum diisi</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">
                    {node.responsible ?? <span className="text-amber-600">belum diisi</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px]">{node.share}%</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={node.progress} className="w-16" />
                      <span className="text-[11px] font-semibold">{Math.round(node.progress)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[11px]">{formatCompactRupiah(node.budget)}</td>
                </tr>
              ))}
              {data.leafNodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[12px] text-muted">
                    Belum ada work package. Tambahkan dari WBS Editor di atas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Kontrol kualitas lingkup</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slate-600">
          <li>
            • {stats.dictionaryRate === 100 ? "Semua elemen" : `${stats.dictionaryCompleteCount} dari ${stats.elementCount} elemen`}{" "}
            sudah punya deskripsi, kriteria penerimaan, dan penanggung jawab (PMBOK: WBS dictionary).
          </li>
          <li>
            • {stats.emptyLeafCount === 0 ? "Tidak ada work package kosong" : `${stats.emptyLeafCount} work package belum punya aktivitas`}{" "}
            — work package tanpa aktivitas tidak bisa menghasilkan earned value.
          </li>
          <li>
            • {stats.unmappedActivityCount === 0 ? "Seluruh aktivitas terpetakan ke WBS" : `${stats.unmappedActivityCount} aktivitas belum terpetakan`}{" "}
            sehingga roll-up belum mencakup seluruh pekerjaan.
          </li>
        </ul>
      </section>
    </div>
  );
}
