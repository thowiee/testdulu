import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/db";
import { formatDateID, roleLabel } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const pendingMom = await prisma.meeting.count({
    where: { status: { in: ["REVIEW", "EXPIRED"] } },
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        userName={session.name}
        userRole={roleLabel(session.role)}
        initials={session.initials}
        color={session.color}
        pendingMom={pendingMom}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/85 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">Portofolio</span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="font-semibold text-ink">Ringkasan Kinerja</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-muted sm:inline">Per {formatDateID(new Date())}</span>
            <span className="chip bg-brand-soft text-brand">{roleLabel(session.role)}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Keluar
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
