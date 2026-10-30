import Link from "next/link";
import { notFound } from "next/navigation";
import { meetingStatusLabel, meetingTypeLabel, formatDateID } from "@/lib/format";
import { getProjectView } from "@/lib/pmbok/project-data";

export default async function ProjectMeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectView(id);
  if (!project) notFound();

  const approved = project.meetings.filter((meeting) => meeting.status === "APPROVED");

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <Link href={`/projects/${project.id}`} className="text-[11px] font-medium text-muted hover:text-brand">
          ← {project.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Meetings &amp; MOM</h1>
        <p className="mt-1 text-[13px] text-muted">
          {project.meetings.length} rapat · {approved.length} disahkan. Hanya MOM yang disahkan yang
          memengaruhi kelancaran proyek.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">MOM</th>
                <th className="px-3 py-2.5 font-semibold">Tipe</th>
                <th className="px-3 py-2.5 font-semibold">Tanggal</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Tanda tangan</th>
                <th className="px-5 py-2.5 font-semibold">Dampak</th>
              </tr>
            </thead>
            <tbody>
              {project.meetings.map((meeting) => {
                const gated = meeting.status !== "APPROVED";
                return (
                  <tr key={meeting.id} className="border-b border-line/70 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/projects/${project.id}/meetings/${meeting.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {meeting.momNo}
                      </Link>
                      <p className="text-[11px] text-muted">{meeting.title}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{meetingTypeLabel(meeting.type)}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-500">{formatDateID(meeting.startAt)}</td>
                    <td className="px-3 py-3">
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
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium">
                        {meeting.signatureProgress.signed}/{meeting.signatureProgress.total}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`chip ${gated ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                        {gated ? "ditahan" : "aktif"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {project.meetings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[12px] text-muted">
                    Belum ada rapat untuk proyek ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
