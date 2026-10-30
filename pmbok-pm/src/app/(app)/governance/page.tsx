import Link from "next/link";
import { meetingStatusLabel, meetingTypeLabel, formatDateID } from "@/lib/format";
import { getGovernanceQueue } from "@/lib/pmbok/project-data";

export default async function GovernancePage() {
  const queue = await getGovernanceQueue();
  const stale = queue.filter((item) => item.daysWaiting > 3);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Governance · Notulen Menunggu Pengesahan</h1>
        <p className="mt-1 text-[13px] text-muted">
          MOM yang belum ditandatangani tidak menggerakkan proyek. Action item, risiko, dan keputusan tetap
          berstatus usulan sampai tanda tangan lengkap.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Menunggu tanda tangan</p>
          <p className="mt-2 text-2xl font-semibold">{queue.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Lewat 3 hari</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{stale.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Dampak tertahan</p>
          <p className="mt-2 text-2xl font-semibold">
            {queue.reduce((sum, item) => sum + (item.total - item.signed), 0)} tanda tangan
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">Antrean pengesahan MOM</h2>
          <p className="text-[11px] text-muted">Urut dari rapat paling lama</p>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[880px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">MOM</th>
                <th className="px-3 py-2.5 font-semibold">Proyek</th>
                <th className="px-3 py-2.5 font-semibold">Tipe</th>
                <th className="px-3 py-2.5 font-semibold">Tanggal</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Tanda tangan</th>
                <th className="px-5 py-2.5 font-semibold">Menunggu</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.meetingId} className="border-b border-line/70 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <Link
                      href={`/projects/${item.projectId}/meetings/${item.meetingId}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {item.momNo}
                    </Link>
                    <p className="text-[11px] text-muted">{item.title}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{item.projectName}</p>
                    <p className="text-[11px] text-muted">{item.projectCode}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{meetingTypeLabel(item.type)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{formatDateID(item.startAt)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`chip ${
                        item.status === "EXPIRED"
                          ? "bg-rose-50 text-rose-700"
                          : item.status === "DRAFT"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {meetingStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium">
                      {item.signed}/{item.total}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-[11px] text-slate-600">
                      {item.pendingSigners.length > 0 ? item.pendingSigners.join(", ") : "—"}
                    </p>
                    <p className={`text-[11px] ${item.daysWaiting > 3 ? "font-semibold text-rose-600" : "text-muted"}`}>
                      {item.daysWaiting} hari sejak rapat
                    </p>
                  </td>
                </tr>
              ))}
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[12px] text-muted">
                    Semua notulen sudah disahkan. Tidak ada dampak yang tertahan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold">Aturan pengesahan per tipe rapat</h2>
        <ul className="mt-3 grid gap-2 text-[12px] text-slate-600 sm:grid-cols-2">
          <li>• Kickoff &amp; gate review: PM lalu Sponsor (berurutan)</li>
          <li>• Weekly status: PM saja</li>
          <li>• CCB: Ketua CCB lalu PM</li>
          <li>• Steering: Sponsor</li>
          <li>• Batas waktu 3 hari; lewat dari itu menjadi sinyal governance</li>
          <li>• Isi berubah setelah tanda tangan → hash tidak cocok → wajib versi baru</li>
        </ul>
      </div>
    </div>
  );
}
