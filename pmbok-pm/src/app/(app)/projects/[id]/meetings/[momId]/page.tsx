import Link from "next/link";
import { notFound } from "next/navigation";
import { SignForm } from "@/components/SignForm";
import { prisma } from "@/lib/db";
import {
  daysAgo,
  formatCompactRupiah,
  formatDateID,
  formatIndex,
  meetingStatusLabel,
  meetingTypeLabel,
} from "@/lib/format";
import { getSession } from "@/lib/session";

function statusTone(status: string): string {
  if (status === "SIGNED") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "DECLINED") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export default async function MomDetailPage({
  params,
}: {
  params: Promise<{ id: string; momId: string }>;
}) {
  const { momId } = await params;
  const session = await getSession();

  const meeting = await prisma.meeting.findUnique({
    where: { id: momId },
    include: {
      project: { select: { id: true, name: true, code: true } },
      chair: { select: { name: true } },
      secretary: { select: { name: true } },
      attendees: { include: { user: { select: { name: true, initials: true, color: true } } } },
      agenda: { orderBy: { seq: "asc" } },
      decisions: { include: { decidedBy: { select: { name: true } } } },
      actions: { include: { owner: { select: { name: true, initials: true, color: true } } }, orderBy: { dueDate: "asc" } },
      snapshots: true,
      versions: {
        orderBy: { version: "desc" },
        include: { requests: { include: { signer: { select: { name: true, initials: true, color: true } }, signature: true } } },
      },
    },
  });

  if (!meeting) notFound();

  const version = meeting.versions[0];
  const requests = version?.requests ?? [];
  const signedCount = requests.filter((request) => request.signature !== null).length;
  const approved = meeting.status === "APPROVED";
  const snapshot = meeting.snapshots[0];
  const myRequest = session
    ? requests.find((request) => request.signerId === session.id && request.signature === null)
    : undefined;
  const blockedByOrder = myRequest
    ? requests.some(
        (request) =>
          request.signature === null &&
          request.orderNo !== null &&
          myRequest.orderNo !== null &&
          request.orderNo < myRequest.orderNo
      )
    : false;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <Link
          href={`/projects/${meeting.project?.id ?? ""}/meetings`}
          className="text-[11px] font-medium text-muted hover:text-brand"
        >
          ← Rapat &amp; MOM {meeting.project ? `· ${meeting.project.name}` : ""}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{meeting.momNo}</h1>
          <span
            className={`chip ${
              approved
                ? "bg-emerald-50 text-emerald-700"
                : meeting.status === "REVIEW"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {meetingStatusLabel(meeting.status)} · ttd {signedCount}/{requests.length}
          </span>
          <span className="chip bg-white text-slate-600 ring-1 ring-line">{meetingTypeLabel(meeting.type)}</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">{meeting.title}</p>
      </div>

      {!approved ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[12px] font-semibold text-amber-900">Dampak ditahan sampai MOM disahkan</p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            Action item, risiko, dan keputusan di bawah berstatus <b>usulan</b>. Belum masuk hitungan
            kelancaran proyek dan belum menugaskan siapa pun.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Ringkasan rapat</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Waktu</dt>
              <dd className="font-medium">{formatDateID(meeting.startAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Lokasi</dt>
              <dd className="font-medium">{meeting.location ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Chair</dt>
              <dd className="font-medium">{meeting.chair.name}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Sekretaris</dt>
              <dd className="font-medium">{meeting.secretary.name}</dd>
            </div>
          </dl>

          {version?.summary ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-600">
              {version.summary}
            </p>
          ) : null}

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wide text-muted">Fingerprint isi (SHA-256)</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{version?.contentHash ?? "—"}</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tanda tangan elektronik</h2>
            <span className="chip bg-slate-100 text-slate-600">v{version?.version ?? 1}</span>
          </div>

          <ul className="mt-3 space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: request.signer.color }}
                  >
                    {request.signer.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{request.signer.name}</p>
                    <p className="text-[10px] text-muted">{request.requiredRole}</p>
                  </div>
                  <span className={`chip ${statusTone(request.status)}`}>
                    {request.signature ? "ditandatangani" : request.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted">
                  {request.signature
                    ? `${formatDateID(request.signature.signedAt)} · metode ${request.signature.method}`
                    : `diminta ${formatDateID(request.requestedAt)} · batas ${formatDateID(request.dueAt)}`}
                </p>
              </li>
            ))}
            {requests.length === 0 ? <li className="text-[12px] text-muted">Belum ada permintaan tanda tangan.</li> : null}
          </ul>

          {myRequest && !blockedByOrder ? <SignForm meetingId={meeting.id} /> : null}
          {myRequest && blockedByOrder ? (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              Anda penandatangan berikutnya, tetapi menunggu urutan sebelumnya selesai.
            </p>
          ) : null}
          {!myRequest && !approved ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              Login sebagai penandatangan yang ditunjuk untuk mengesahkan notulen ini.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Agenda &amp; hasil</h2>
          <ol className="mt-3 space-y-2.5">
            {meeting.agenda.map((item) => (
              <li key={item.id} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {item.seq}
                </span>
                <div>
                  <p className="text-[12px] font-medium">{item.topic}</p>
                  {item.summary ? <p className="text-[11px] text-muted">{item.summary}</p> : null}
                </div>
              </li>
            ))}
            {meeting.agenda.length === 0 ? <li className="text-[12px] text-muted">Agenda belum diisi.</li> : null}
          </ol>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Keputusan</h2>
          <ul className="mt-3 space-y-2">
            {meeting.decisions.map((decision) => (
              <li key={decision.id} className="rounded-xl border border-line px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`chip ${
                      decision.impactLevel === "MAJOR" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {decision.impactLevel}
                  </span>
                  <span
                    className={`chip ${
                      decision.status === "FOLLOWED_UP"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {decision.status === "FOLLOWED_UP" ? "ditindaklanjuti" : "menunggu tindak lanjut"}
                  </span>
                  {decision.changeId ? <span className="chip bg-brand-soft text-brand">ada CR</span> : null}
                </div>
                <p className="mt-1.5 text-[12px]">{decision.text}</p>
                <p className="mt-1 text-[10px] text-muted">oleh {decision.decidedBy.name}</p>
              </li>
            ))}
            {meeting.decisions.length === 0 ? <li className="text-[12px] text-muted">Tidak ada keputusan.</li> : null}
          </ul>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Action Items</h2>
            <p className="text-[11px] text-muted">
              {approved ? "Sudah ditugaskan ke pemilik karena MOM disahkan" : "Masih usulan — belum menugaskan siapa pun"}
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">{meeting.actions.length} item</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">Komitmen</th>
                <th className="px-3 py-2.5 font-semibold">Pemilik</th>
                <th className="px-3 py-2.5 font-semibold">Tenggat</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold">Terkait</th>
              </tr>
            </thead>
            <tbody>
              {meeting.actions.map((action) => {
                const open = action.status !== "DONE" && action.status !== "CANCELLED";
                const overdueDays = open ? daysAgo(action.dueDate) : 0;
                return (
                  <tr key={action.id} className="border-b border-line/70 last:border-0">
                    <td className={`px-5 py-3 ${approved ? "" : "text-slate-400"}`}>{action.text}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white"
                          style={{ backgroundColor: action.owner.color }}
                        >
                          {action.owner.initials}
                        </span>
                        <span className="text-[11px]">{action.owner.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px]">{formatDateID(action.dueDate)}</p>
                      {overdueDays > 0 ? (
                        <p className="text-[10px] font-semibold text-rose-600">terlambat {overdueDays} hari</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`chip ${
                          action.status === "DONE"
                            ? "bg-emerald-50 text-emerald-700"
                            : overdueDays > 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {action.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted">
                      {action.linkedLabel ?? "—"}
                      {action.linkedType ? <span className="ml-1 text-[10px] uppercase">({action.linkedType})</span> : null}
                    </td>
                  </tr>
                );
              })}
              {meeting.actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[12px] text-muted">
                    Tidak ada action item.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Peserta &amp; kehadiran</h2>
          <ul className="mt-3 space-y-2">
            {meeting.attendees.map((attendee) => (
              <li key={attendee.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-2">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white"
                    style={{ backgroundColor: attendee.user?.color ?? "#94a3b8" }}
                  >
                    {attendee.user?.initials ?? "EX"}
                  </span>
                  <span>{attendee.user?.name ?? attendee.externalName ?? "Peserta eksternal"}</span>
                </span>
                <span
                  className={`chip ${
                    attendee.presence === "PRESENT"
                      ? "bg-emerald-50 text-emerald-700"
                      : attendee.presence === "LATE"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {attendee.presence}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Snapshot kinerja saat rapat</h2>
          {snapshot ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted">PV</p>
                <p className="font-semibold">{formatCompactRupiah(snapshot.pv)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted">EV</p>
                <p className="font-semibold">{formatCompactRupiah(snapshot.ev)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted">AC</p>
                <p className="font-semibold">{formatCompactRupiah(snapshot.ac)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted">SPI / CPI</p>
                <p className="font-semibold">
                  {formatIndex(snapshot.spi)} / {formatIndex(snapshot.cpi)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-muted">Snapshot belum tersedia.</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Snapshot menyimpan kondisi EVM pada tanggal rapat, sehingga tren antar-rapat bisa dibandingkan
            tanpa menghitung ulang data historis.
          </p>
        </div>
      </section>
    </div>
  );
}
