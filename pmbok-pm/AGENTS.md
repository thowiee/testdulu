# AGENTS.md — Aturan kerja PMBOK-PM

Dokumen ini adalah instruksi proyek untuk agent/AI (Antigravity, Codex, Claude Code, dll.) dan untuk
manusia yang melanjutkan pekerjaan. Baca juga `docs/progress-handoff.md` (status & backlog) dan
`docs/migrasi-antigravity.md` (setup lingkungan).

## Tujuan produk

Aplikasi manajemen portofolio proyek berbasis PMBOK. Status proyek **dihitung** dari EVM dan dari
disiplin rapat (MOM yang sudah ditandatangani), bukan diketik manual. Bahasa UI: Indonesia.

## Stack & perintah

- Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, Prisma 6, SQLite (demo).
- `npm ci` → install dari lockfile (jangan upgrade dependency tanpa diminta).
- `npm run dev` → http://localhost:3000
- `npm test` → unit test mesin PMBOK (wajib lulus).
- `npx tsc --noEmit` → typecheck (wajib bersih).
- `npm run build` → build produksi.
- `npm run check` / `npm run check:planning` → cetak angka acuan.
- `node scripts/verify-pages.mjs` → HTTP check semua route (butuh dev server).
- `npm run db:seed` / `npm run db:reset` → **destruktif**, hapus semua data. Jangan jalankan tanpa
  memastikan tidak ada data yang harus dipertahankan.

## Peta arsitektur

```text
page (server component)  →  loader *-data.ts  →  Prisma
client component         →  server action    →  guard + validasi + audit + revalidate
src/lib/pmbok/*.ts       →  logika murni, diuji unit test
```

- Jangan menaruh rumus bisnis di page atau komponen. Tambahkan ke `src/lib/pmbok/`.
- Mutasi **wajib** memakai server action dengan `assertCanPlan()` (atau cek sesi MOM), validasi,
  `prisma.auditLog.create`, dan `revalidatePath` untuk semua route terdampak.
- Jangan mengimpor `prisma` atau modul server ke komponen `"use client"`.
- File `"use server"` hanya boleh mengekspor fungsi async (tipe boleh).
- Setelah mengubah `prisma/schema.prisma`: `npx prisma generate` lalu `npx prisma db push`.

## Invarian yang tidak boleh dilanggar

1. **MOM tidak boleh menaikkan status.** `combineHealth()` memakai `worseOf(...)`; jangan diubah
   menjadi penggabungan bebas.
2. **Dampak MOM hanya aktif setelah semua tanda tangan lengkap.** Action item, risiko, dan keputusan
   dari MOM berstatus usulan sampai `Meeting.status = APPROVED`.
3. **Status aktivitas & durasi diturunkan.** Status dari progress (0/1–99/100), durasi dari selisih
   tanggal. Jangan menambah input manual yang menduplikasi.
4. **Roll-up WBS berbobot.** Anak berbobot 0 tidak menggeser progres induk. Jangan mengganti dengan
   rata-rata sederhana.
5. **Relasi dependensi harus acyclic.** Action menolak relasi yang membentuk siklus; CPM tetap
   defensif bila menemukan siklus.
6. **Angka dihitung ulang, tidak disimpan.** PV/EV/AC, health, roll-up, CPM dihitung dari data mentah.
7. **Batas izin edit:** ADMIN, atau PM yang merupakan `project.managerId`. Sponsor dan member
   read-only untuk baseline.
8. **Uang dan tanggal:** tanggal disimpan UTC (`startOfDay`), input `YYYY-MM-DD`; jangan memakai
   `toLocaleDateString` untuk logika.
9. **Seed destruktif dan bergantung tanggal berjalan.** Jangan jalankan pada database nyata.
10. **Jangan commit** `.env`, `prisma/dev.db`, `.next`, `node_modules`, atau rahasia apa pun.

## Konvensi

- Server component untuk halaman; client component hanya untuk form/editor yang butuh state.
- Tailwind memakai token di `src/app/globals.css`: `card`, `chip`, `bg-brand`, `text-muted`,
  `border-line`. Ikuti gaya yang ada, jangan menambah design system baru.
- Format angka/tanggal lewat `src/lib/format.ts` (Rupiah compact, tanggal Indonesia).
- Nama file domain: `evm.ts`, `health.ts`, `mom.ts`, `wbs.ts`, `schedule.ts`, `activity.ts`;
  loader: `project-data.ts`, `planning-data.ts`.
- Setiap logika murni baru harus punya unit test di `src/lib/pmbok/pmbok.test.ts` (atau file
  `*.test.ts` di folder yang sama; `npm test` menjalankan `src/lib/pmbok/*.test.ts`).
- Komentar dan teks UI memakai Bahasa Indonesia yang ringkas dan faktual.

## Definition of Done

- [ ] `npx tsc --noEmit` bersih
- [ ] `npm test` lulus
- [ ] `npm run build` sukses
- [ ] `node scripts/verify-pages.mjs` lulus (dev server hidup)
- [ ] Mutasi baru punya guard peran, validasi, audit log, revalidate
- [ ] Dokumen status/backlog diperbarui bila cakupan berubah

## Peta file penting

```text
prisma/schema.prisma                 26 model PMBOK + MOM
prisma/seed.ts                       12 proyek, 84 aktivitas, 84 dependensi, 8 MOM
src/lib/pmbok/evm.ts                 PV/EV/AC, SPI/CPI/EAC/VAC/TCPI, forecast
src/lib/pmbok/health.ts              5 level + combineHealth (MOM hanya menurunkan)
src/lib/pmbok/mom.ts                 MOM index + sinyal keras
src/lib/pmbok/wbs.ts                 tree, share bobot, roll-up, statistik dictionary
src/lib/pmbok/schedule.ts            CPM FS/SS/FF/SF, siklus, float, Gantt plan
src/lib/pmbok/activity.ts            status dari progress, durasi dari tanggal
src/lib/pmbok/project-data.ts        loader portofolio/proyek/governance
src/lib/pmbok/planning-data.ts       loader scope + schedule
src/lib/pmbok/planning-guard.ts      izin edit baseline
src/app/(app)/projects/[id]/scope/          halaman + action WBS & aktivitas
src/app/(app)/projects/[id]/schedule/       halaman + action dependensi
src/components/WbsEditor.tsx                editor WBS + dictionary
src/components/ActivityPanel.tsx            aktivitas & progress per work package
src/components/DependencyEditor.tsx         form relasi + lag
src/components/Gantt.tsx                    baseline vs CPM
scripts/check-portfolio.ts, check-planning.ts, verify-pages.mjs
```

## Backlog aktif

Urutan yang disarankan ada di `docs/progress-handoff.md` §10: Fase 4 timesheet & Cost/EVM,
Fase 5 Risk, Fase 6 Team/Stakeholder, Fase 7 laporan & e-sign lanjutan, Fase 8 produksi
(PostgreSQL, auth nyata, ACL per proyek, CI). Jangan mengerjakan fase berikutnya tanpa diminta.
