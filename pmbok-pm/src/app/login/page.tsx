import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/portfolio");

  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true, jobTitle: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-sm md:grid md:grid-cols-2">
        <div className="bg-gradient-to-br from-[#1b3b8b] via-[#2f6df6] to-[#38bdf8] p-10 text-white">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-sm font-bold">PM</span>
            <span className="text-lg font-semibold">PMBOK-PM</span>
          </div>
          <h1 className="mt-10 text-2xl font-semibold leading-snug">
            Portofolio proyek yang bisa diaudit, bukan sekadar dashboard berwarna.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Status proyek dihitung dari EVM (SPI, CPI, EAC) dan dari disiplin rapat (MOM yang sudah
            ditandatangani). Setiap angka punya jejak ke data sumbernya.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-white/85">
            <li>• 49 proses PMBOK 6 dipetakan ke modul</li>
            <li>• 8 performance domain PMBOK 7 di dashboard</li>
            <li>• MOM dengan tanda tangan elektronik dan gating dampak</li>
          </ul>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-lg font-semibold text-ink">Masuk ke workspace</h2>
          <p className="mt-1 text-sm text-muted">
            Pilih salah satu akun demo untuk melihat peran yang berbeda.
          </p>
          <div className="mt-6">
            <LoginForm users={users} />
          </div>
        </div>
      </div>
    </main>
  );
}
