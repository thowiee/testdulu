/**
 * Verifikasi halaman: membuat cookie sesi sah, memanggil setiap route,
 * lalu memastikan status HTTP dan penanda isi sesuai harapan.
 * Jalankan saat dev server aktif: node scripts/verify-pages.mjs
 */
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SECRET = process.env.SESSION_SECRET ?? "pmbok-pm-demo-secret-ganti-di-produksi";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: "pm@pmbok.test" } });
const project = await prisma.project.findFirst({ where: { code: "PRJ-01" } });
const meeting = await prisma.meeting.findFirst({ where: { momNo: "MOM-2026-0004" } });
const approvedMeeting = await prisma.meeting.findFirst({ where: { momNo: "MOM-2026-0003" } });

if (!user || !project || !meeting || !approvedMeeting) {
  console.error("Data seed tidak lengkap.");
  process.exit(1);
}

const signature = createHmac("sha256", SECRET).update(user.id).digest("hex").slice(0, 32);
const cookie = `pm_session=${user.id}.${signature}`;

const checks = [
  { path: "/login", markers: ["Masuk ke workspace"] },
  { path: "/portfolio", markers: ["Portfolio Health", "Project Portfolio", "Peringatan dini", "tidak lancar"] },
  { path: "/projects", markers: ["Daftar Proyek", "ERP Implementation"] },
  { path: "/governance", markers: ["Notulen Menunggu Pengesahan", "MOM-2026-0004"] },
  { path: `/projects/${project.id}`, markers: ["Kelancaran Proyek", "Earned Value", "Alasan verdict"] },
  {
    path: `/projects/${project.id}/scope`,
    markers: ["WBS Editor", "WBS Dictionary", "Roll-up progress", "Kriteria penerimaan"],
  },
  {
    path: `/projects/${project.id}/schedule`,
    markers: ["Jalur Kritis", "Dependency jaringan", "Tabel CPM", "Gantt"],
  },
  { path: `/projects/${project.id}/meetings`, markers: ["MOM-2026-0004", "MOM-2026-0001", "Tanda tangan"] },
  {
    path: `/projects/${project.id}/meetings/${meeting.id}`,
    markers: ["Dampak ditahan sampai MOM disahkan", "Fingerprint isi", "Tanda tangan elektronik", "MOM-2026-0004"],
  },
  {
    path: `/projects/${project.id}/meetings/${approvedMeeting.id}`,
    markers: ["disahkan", "Snapshot kinerja saat rapat"],
  },
];

let failures = 0;
for (const check of checks) {
  const response = await fetch(`${BASE}${check.path}`, {
    headers: check.path === "/login" ? {} : { cookie },
    redirect: "manual",
  });
  const body = await response.text();
  const missing = check.markers.filter((marker) => !body.includes(marker));
  const ok = response.status === 200 && missing.length === 0;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${String(response.status).padEnd(4)} ${check.path.padEnd(48)} ${
      ok ? `${check.markers.length} penanda` : `hilang: ${missing.join(", ") || "-"}`
    }`
  );
}

// Halaman terlindungi harus mengalihkan pengguna tanpa sesi.
const unauth = await fetch(`${BASE}/portfolio`, { redirect: "manual" });
const unauthOk = unauth.status === 307 || unauth.status === 302;
console.log(`${unauthOk ? "PASS" : "FAIL"}  ${unauth.status}  /portfolio tanpa sesi harus dialihkan`);
if (!unauthOk) failures += 1;

await prisma.$disconnect();
console.log(failures === 0 ? "\nSemua pemeriksaan halaman lulus." : `\n${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);
