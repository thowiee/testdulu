# Status & Handoff — PMBOK-PM

Dokumen ini adalah **sumber kebenaran status pengerjaan** per 30 Oktober 2026, dipakai untuk
melanjutkan proyek di lingkungan lain (Antigravity). Untuk langkah pindah lingkungan, baca
[`migrasi-antigravity.md`](migrasi-antigravity.md). Untuk aturan kerja agent, baca
[`../AGENTS.md`](../AGENTS.md).

- Repo: `thowiee/testdulu` · folder aplikasi: **`pmbok-pm/`**
- Branch kerja: **`feat/pmbok-pm`** (commit aplikasi sudah dibuat; cek `git log -1`)
- Stack: Next.js 15.5.28 (App Router) · React 19.1.0 · TypeScript 5 · Tailwind CSS 4 · Prisma 6.19.3 · SQLite
- Bahasa UI: Indonesia · zona waktu data: UTC (`startOfDay` memakai komponen UTC)

---

## 1. Ringkasan

Aplikasi manajemen portofolio proyek yang mengikuti PMBOK 6th & 7th Edition. Prinsip utamanya:
**status proyek tidak diketik manual**. Verdict dihitung dari dua sumber:

1. **EVM (lagging)** — PV/EV/AC dari baseline aktivitas, persentase fisik, dan timesheet.
2. **MOM (leading)** — disiplin rapat: action item, keputusan, risiko/isu, keterlibatan, nada notulen.
   Hanya MOM yang **sudah ditandatangani lengkap** yang boleh memengaruhi status.

Sinyal MOM hanya boleh **menurunkan** status, tidak pernah menaikkan EVM yang buruk. Ini dikunci di
`combineHealth()` dan diuji unit test.

### Angka portofolio hasil mesin (seed, terverifikasi)

| Metrik | Nilai |
| --- | --- |
| Total proyek | 12 |
| Proyek aktif | 10 |
| On track | 7 |
| Berisiko | 3 |
| Selesai | 2 |
| Portfolio health (berbobot BAC) | **74,8** |
| Rata-rata SPI proyek aktif | 0,98 |
| Rata-rata MOM | 84,3 |
| MOM menunggu tanda tangan | 1 |

Proyek studi kasus **PRJ-01 ERP Implementation**: EV 75,8% · PV 74,4% · SPI **1,018** · CPI **1,047** ·
MOM **58** · verdict **Tidak lancar** (skor 56). Inilah demonstrasi peringatan dini: angka EVM hijau,
tetapi eksekusi rapat memburuk.

### Status fase

| Fase | Cakupan | Status |
| --- | --- | --- |
| 0 | Scaffold, shell, login, sesi | Selesai |
| 1 | Skema PMBOK 26 tabel + seed | Selesai |
| 2 | Dashboard portofolio + daftar proyek + hub | Selesai |
| MOM | Notulen, e-sign Tier 1, gating dampak, MOM index | Selesai (inti) |
| 3 | Scope & WBS editor, WBS dictionary, roll-up berbobot | Selesai |
| 3 | Editor aktivitas & progress | Selesai |
| 3 | Schedule: dependensi, CPM, float, Gantt | Selesai |
| 4 | Timesheet & tab Cost/EVM | **Belum** |
| 5 | Risk register UI | **Belum** |
| 6 | Team & RACI, stakeholder | **Belum** |
| 7 | Laporan PDF/Excel, e-sign Tier 2, revisi MOM | **Belum** |
| 8 | PostgreSQL, auth nyata, deployment, observability | **Belum** |

---

## 2. Menjalankan cepat

```bash
cd pmbok-pm
npm ci
cp .env.example .env          # isi SESSION_SECRET
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev                   # http://localhost:3000
```

Login demo (password semua akun: `demo1234`):

| Email | Peran | Catatan |
| --- | --- | --- |
| `admin@pmbok.test` | ADMIN / PMO | boleh mengubah semua proyek |
| `pm@pmbok.test` | PM | pemilik PRJ-01, 03, 06, 08, 10, 12 |
| `sari@pmbok.test` | PM | pemilik proyek lainnya |
| `sponsor@pmbok.test` | SPONSOR | read-only perencanaan, penandatangan MOM |
| `member@pmbok.test`, `qa@pmbok.test`, `dian@pmbok.test` | MEMBER | tidak boleh mengubah baseline |
| `vendor@pmbok.test` | STAKEHOLDER | eksternal |

Perintah penting:

| Perintah | Fungsi |
| --- | --- |
| `npm test` | 15 unit test mesin PMBOK (tanpa DB) |
| `npx tsc --noEmit` | typecheck ketat |
| `npm run build` | build produksi |
| `npm run check` | cetak angka portofolio hasil hitungan |
| `npm run check:planning` | cetak roll-up WBS + CPM proyek PRJ-01 |
| `node scripts/verify-pages.mjs` | HTTP check 10 route + redirect tanpa sesi (butuh dev server) |
| `npm run db:reset` | **destruktif**: hapus semua data lalu seed ulang |

---

## 3. Route & fitur

| Route | Isi | Status |
| --- | --- | --- |
| `/login` | Login 5 peran, cookie HMAC 12 jam | Selesai |
| `/portfolio` | KPI, donut status, bar departemen, gauge health, milestone, highlights, peringatan dini | Selesai |
| `/projects` | Kartu proyek: progress, SPI/CPI/MOM, verdict | Selesai |
| `/projects/[id]` | Hub: kelancaran + alasan verdict, EVM, milestone, risiko, rapat | Selesai |
| `/projects/[id]/scope` | WBS editor, WBS dictionary, roll-up, kontrol kualitas lingkup, panel aktivitas | Selesai |
| `/projects/[id]/schedule` | KPI jadwal, Gantt baseline-vs-CPM, dependency editor, tabel CPM, float, milestone | Selesai |
| `/projects/[id]/meetings` | Daftar rapat + status ttd + gating dampak | Selesai |
| `/projects/[id]/meetings/[momId]` | Detail MOM, agenda, keputusan, action item, peserta, snapshot, panel tanda tangan | Selesai |
| `/governance` | Antrean MOM belum disahkan + hari menunggu | Selesai |
| Tab Cost & EVM, Risk, Team & RACI | Masih `soon` di tab proyek | Belum |

---

## 4. Arsitektur

```text
Server Component (page)
   └─ loader di src/lib/pmbok/*-data.ts  → Prisma → SQLite
   └─ presentational components (charts, badges, Gantt) — tanpa state
Client Component (form/editor)
   └─ server action ("use server") → guard peran → validasi → Prisma → audit log → revalidatePath
   └─ domain murni di src/lib/pmbok/*.ts (EVM, health, WBS, CPM, MOM) — diuji unit test
```

Prinsip yang dipakai konsisten:

- **Logika bisnis tidak di page.** Page hanya memanggil loader + merender.
- **Mutasi selalu lewat server action** dengan `assertCanPlan()` / cek sesi, validasi input,
  `auditLog`, dan `revalidatePath` untuk semua halaman terdampak.
- **Angka tidak disimpan sebagai hasil.** Health, EVM, roll-up, dan CPM dihitung ulang dari data
  mentah setiap request. Tidak ada cache skor.
- **Tanggal UTC.** Input `YYYY-MM-DD` diparse sebagai UTC; `daysBetween()` menormalkan ke awal hari.

### Peta file

| File | Tanggung jawab |
| --- | --- |
| `prisma/schema.prisma` | 26 model PMBOK + MOM; enum disimulasikan sebagai `String` (SQLite) |
| `prisma/seed.ts` | Data demo deterministik relatif hari ini; **menghapus semua tabel** sebelum mengisi |
| `src/lib/db.ts` | Singleton PrismaClient |
| `src/lib/session.ts` | scrypt password, cookie HMAC `pm_session`, 12 jam |
| `src/lib/format.ts` | Rupiah compact, tanggal Indonesia (UTC), label peran/rapat/status |
| `src/lib/pmbok/evm.ts` | PV linear, EV, AC input, SPI/CPI/EAC/VAC/TCPI, forecast finish, CPM lama |
| `src/lib/pmbok/health.ts` | 5 level EVM + `combineHealth()` (aturan MOM tidak boleh menaikkan) |
| `src/lib/pmbok/mom.ts` | MOM index 5 komponen + 6 sinyal keras |
| `src/lib/pmbok/wbs.ts` | Tree WBS, share bobot, roll-up berbobot, statistik dictionary |
| `src/lib/pmbok/schedule.ts` | CPM FS/SS/FF/SF + lag, deteksi siklus, float, rencana Gantt |
| `src/lib/pmbok/activity.ts` | Status dari progress, durasi dari tanggal |
| `src/lib/pmbok/project-data.ts` | Loader portofolio + proyek + governance |
| `src/lib/pmbok/planning-data.ts` | Loader scope (WBS + aktivitas) dan schedule (CPM + dependensi) |
| `src/lib/pmbok/planning-guard.ts` | Matriks izin edit baseline (ADMIN / PM pemilik) |
| `src/app/(app)/layout.tsx` | Guard sesi + shell sidebar |
| `src/app/(app)/projects/[id]/scope/actions.ts` | CRUD WBS |
| `src/app/(app)/projects/[id]/scope/activity-actions.ts` | CRUD aktivitas + progress |
| `src/app/(app)/projects/[id]/schedule/actions.ts` | Tambah/hapus dependensi + validasi siklus |
| `src/app/(app)/projects/[id]/meetings/[momId]/actions.ts` | Tanda tangan MOM + gating dampak |
| `src/components/WbsEditor.tsx` | Editor WBS + form dictionary (client) |
| `src/components/ActivityPanel.tsx` | Panel aktivitas & progress per work package (client) |
| `src/components/DependencyEditor.tsx` | Form relasi FS/SS/FF/SF + lag (client) |
| `src/components/Gantt.tsx` | Bar baseline vs CPM, garis hari ini (server) |
| `src/components/ProjectTabs.tsx` | Navigasi tab proyek |
| `scripts/check-portfolio.ts` | Cetak angka portofolio |
| `scripts/check-planning.ts` | Cetak roll-up + CPM |
| `scripts/verify-pages.mjs` | Uji HTTP semua route dengan cookie sah |
| `docs/blueprint-pmbok.md` | Pemetaan proses/artefak PMBOK ke modul (untuk laporan) |
| `docs/flow-mom-esign.md` | Alur MOM + state machine + sequence e-sign |
| `docs/migrasi-antigravity.md` | Runbook pindah lingkungan |
| `AGENTS.md` | Aturan kerja untuk agent/AI di repo ini |

### Matriks izin

| Aksi | ADMIN | PM pemilik | PM lain | SPONSOR | MEMBER |
| --- | --- | --- | --- | --- | --- |
| Lihat semua proyek/portofolio | Ya | Ya | Ya | Ya | Ya |
| Edit WBS, aktivitas, dependensi | Ya | Ya | Tidak | Tidak | Tidak |
| Tanda tangan MOM | Sesuai request | Sesuai request | Sesuai request | Sesuai request | Sesuai request |
| Lihat governance | Ya | Ya | Ya | Ya | Ya |

Catatan: **semua user login dapat melihat semua proyek**. Belum ada ACL per proyek — ini utang
keamanan yang harus ditutup sebelum produksi (lihat §9).

---

## 5. Model data

26 model, dikelompokkan:

| Kelompok | Model |
| --- | --- |
| Organisasi | `User`, `Portfolio`, `Program`, `ResourceAssignment` |
| Proyek | `Project`, `Baseline`, `AuditLog` |
| Lingkup | `WbsElement`, `Activity`, `Dependency`, `Deliverable` |
| Jadwal | `Milestone` |
| Biaya | `Timesheet` |
| Risiko | `Risk`, `Issue`, `ChangeRequest` |
| Stakeholder | `Stakeholder` |
| Rapat/MOM | `Meeting`, `Attendee`, `AgendaItem`, `Decision`, `ActionItem`, `PerformanceSnapshot`, `MomVersion`, `SignatureRequest`, `Signature` |

Hal penting:

- `WbsElement` punya `description`, `acceptanceCriteria`, `responsible` (WBS dictionary) dan
  `weight` (bobot relatif; seed memakai persen 0–100).
- `Activity` menyimpan `startBaseline`, `finishBaseline`, `durationDays`, `budget`,
  `percentComplete`, `status`; `durationDays` **diturunkan dari tanggal** oleh action, bukan input.
- `Dependency` unik secara logika per `(predId, succId)` tetapi **belum ada unique constraint** di DB
  — dicek di action. Pertimbangkan menambah `@@unique([predId, succId])` saat migrasi Postgres.
- `SignatureRequest` → `Signature` satu-satu; `MomVersion.contentHash` menyimpan SHA-256.
- `AuditLog` belum append-only (bisa dihapus lewat Prisma); belum ada trigger/immutability.
- Uang memakai `Float` (demo). Untuk produksi gunakan `Decimal`.

---

## 6. Kontrak mesin perhitungan

### EVM (`evm.ts`)

```text
PV aktivitas = budget × clamp((cut-off − start) / (finish − start), 0, 1)
EV aktivitas = budget × % selesai / 100
AC          = Σ (hours × rate) dari timesheet
SPI = EV/PV   CPI = EV/AC   EAC = BAC/CPI   ETC = max(EAC−AC,0)
VAC = BAC−EAC   TCPI = (BAC−EV)/(BAC−AC)
%complete = EV/BAC   %planned = PV/BAC   %spent = AC/BAC
forecast finish = hari ini + sisa hari / SPI (SPI minimum 0,2)
```

### Health (`health.ts`)

Urutan evaluasi EVM (yang pertama cocok menang):

1. `EXCELLENT` bila %complete ≥ 100 dan %planned ≥ 100.
2. `CRITICAL` bila min(SPI,CPI) < 0,85 **atau** slip milestone > 14 hari.
3. `AT_RISK` bila min < 0,90.
4. `AT_RISK` bila ada risiko skor ≥ 15 terbuka **atau** milestone bergeser > 0.
5. `NEEDS_ATTENTION` bila min < 0,95.
6. `EXCELLENT` bila min ≥ 1, selain itu `ON_TRACK`.

Kombinasi MOM:

```text
blended = 0,6 × skor(level EVM) + 0,4 × MOM index
level   = worseOf(scoreToLevel(blended), level EVM)   // MOM tidak boleh menaikkan
hard signal  → turun 1 level
MOM < 70     → turun 1 level
MOM < 60 dan ≥ 2 hard signal → turun 1 level
```

Skor level: Excellent 95, On Track 85, Perlu Perhatian 72, At Risk 55, Critical 30.

### MOM index (`mom.ts`)

```text
0,30 disiplin action + 0,20 tindak lanjut keputusan + 0,20 tren risiko/isu
+ 0,15 keterlibatan + 0,15 nada notulen
```

Sinyal keras: `OVERDUE_ACTIONS` (≥3 action >14 hari), `DECISION_NO_CHANGE` (keputusan mayor >7 hari
tanpa CR), `CHRONIC_ISSUE` (isu ≥3 rapat), `UNSIGNED_MOM` (>3 hari), `SPONSOR_ABSENT` (<50% rapat),
`LOW_ON_TIME` (<50% komitmen tepat waktu).

### Roll-up WBS (`wbs.ts`)

```text
share anak   = bobot anak / Σ bobot saudara positif × 100    (bobot 0 diabaikan)
progress daun = Σ(budget aktivitas × %) / Σ budget           (fallback rata-rata bila budget 0)
progress induk = Σ(progress anak × bobot anak) / Σ bobot anak
```

Konsekuensi: mengubah anggaran aktivitas mengubah bobot relatif di dalam work package; elemen
berbobot 0 (governance) tetap tampil tetapi tidak menggeser progres.

### CPM (`schedule.ts`)

```text
FS: ES(succ) ≥ EF(pred) + lag        FF: EF(succ) ≥ EF(pred) + lag
SS: ES(succ) ≥ ES(pred) + lag        SF: EF(succ) ≥ ES(pred) + lag
backward memakai constraint cermin; float = LS − ES; kritis bila float ≤ 0,0001
durasi jaringan = max EF; ES dijepit ≥ 0
siklus dideteksi DFS; relasi dalam siklus diabaikan saat menghitung dan ditolak saat disimpan
```

### Aktivitas (`activity.ts` + action)

- `durationDays = max(0, finish − start)`.
- `status = TODO (0%) / ONGOING (1–99%) / DONE (100%)`.
- Anggaran aktivitas boleh melebihi BAC, tetapi action mengembalikan pesan peringatan dan halaman
  scope menandai **over-alokasi** (kartu cakupan anggaran).

---

## 7. Data demo (seed)

Seed menghapus seluruh tabel lalu mengisi ulang. Isi terverifikasi:

```text
users 8 · projects 12 · activities 84 · dependencies 84
meetings 8 · momVersions 8 · signatures 10
```

- 12 proyek, 5 work package utama per proyek + 1 work package governance (bobot 0, anggaran 0) dan
  2 aktivitas governance paralel agar CPM punya float yang bisa dibaca.
- 5 aktivitas utama per proyek dengan bobot 10/20/25/30/15 dan deviasi progress yang disengaja.
- ERP (PRJ-01) diberi MOM bermasalah: action menumpuk, 2 isu kronis, keputusan mayor tanpa CR,
  1 MOM belum ditandatangani.
- Tanggal seed dihitung relatif `TODAY` saat seed dijalankan, jadi angka "hari ini" bergeser bila
  seed dijalankan di tanggal lain. Test unit memakai tanggal tetap dan tidak terpengaruh.

---

## 8. Bukti verifikasi (30 Oktober 2026)

| Pemeriksaan | Hasil |
| --- | --- |
| `npx tsc --noEmit` | 0 error |
| `npm test` | **15/15 lulus** |
| `npm run build` | sukses, 11 route |
| `node scripts/verify-pages.mjs` | **11/11 PASS** (10 route + redirect 307 tanpa sesi) |
| `npm run check` | 12 proyek · 7 on track · 3 berisiko · 2 selesai · health **74,8** |
| `npm run check:planning` | roll-up 75,8% = EV/BAC · dictionary 7/7 · CPM 180 hari · 5/7 kritis · 0 siklus |

Rincian CPM ERP: 7 dependensi, selesai 14 Des 2026 = baseline, governance float 57 hari,
4 aktivitas baseline lewat tanggal tanpa progress 100%.

Unit test mencakup: PV linear, EV, SPI/CPI/EAC/VAC/TCPI, 5 level health, aturan "MOM tidak menaikkan",
MOM index + sinyal keras, CPM FS, CPM SS/FF + lag, deteksi siklus, roll-up berbobot (bobot 0 diabaikan),
status aktivitas, durasi aktivitas.

**Belum diuji otomatis:** server action WBS/aktivitas/dependensi lewat browser sungguhan. Aksi sudah
lolos typecheck, build, dan render halaman; uji klik manual masih diperlukan (lihat checklist migrasi).

---

## 9. Batasan & utang teknis

| # | Utang | Dampak | Prioritas |
| --- | --- | --- | --- |
| 1 | Belum ada test integrasi/e2e untuk server action | regresi mutasi tidak terdeteksi | Tinggi |
| 2 | Auth demo: password sama, tanpa reset, tanpa throttle, cookie belum `secure` | tidak layak produksi | Tinggi (Fase 8) |
| 3 | Semua user login bisa melihat semua proyek | kebocoran data antar proyek | Tinggi (Fase 8) |
| 4 | e-sign Tier 1 (klik + re-auth + hash), belum PSrE | nilai legal terbatas | Sedang (Fase 7) |
| 5 | Revisi/supersede MOM belum ada UI-nya | skema siap, alur belum | Sedang (Fase 7) |
| 6 | Tidak ada input timesheet | AC/CPI hanya dari seed | Tinggi (Fase 4) |
| 7 | Risiko/isu hanya tampil, belum CRUD | register tidak bisa dipelihara | Sedang (Fase 5) |
| 8 | BAC dan total anggaran aktivitas bisa berbeda; hanya peringatan | %complete bisa >100% | Sedang |
| 9 | SQLite + `Float` untuk uang, tanpa riwayat migrasi | tidak cocok produksi | Tinggi (Fase 8) |
| 10 | Gantt read-only, ubah dependensi = hapus + tambah | UX terbatas | Rendah |
| 11 | Belum ada kalender kerja/resource leveling | CPM memakai hari kalender | Rendah |
| 12 | Seed destruktif dan bergantung tanggal berjalan | risiko salah jalankan | Sedang (beri konfirmasi/env guard) |

---

## 10. Backlog Fase 4–8 (berurutan, dengan acceptance criteria)

### Fase 4 — Timesheet & Cost/EVM (disarankan berikutnya)

**4.1 Input timesheet**
- Form per aktivitas: tanggal, jam, tarif, catatan; validasi jam > 0, tarif ≥ 0.
- `AC` dihitung dari timesheet; CPI/EAC/VAC/TCPI langsung berubah di hub, portfolio, scope.
- Daftar timesheet per aktivitas + total jam/biaya; audit log `TIMESHEET_CREATED/DELETED`.
- **AC:** menambah 8 jam × tarif mengubah AC sebesar itu, CPI turun, dan angka bertahan setelah reload.

**4.2 Tab Cost & EVM**
- Kurva S PV/EV/AC per minggu/bulan, tabel biaya per work package, kartu EAC/ETC/VAC/TCPI.
- Penanda over-alokasi anggaran dan kontingensi.
- **AC:** kurva memakai angka yang sama dengan `npm run check`; tidak ada perhitungan duplikat di UI.

**4.3 Baseline & change control**
- Aksi "set baseline" menyimpan snapshot (`Baseline.snapshot` sudah ada) dan versi.
- Perubahan BAC wajib lewat Change Request yang disetujui.
- **AC:** baseline lama tetap bisa dibandingkan; perubahan tanpa CR ditolak.

### Fase 5 — Risk & Issue
- CRUD risiko/isu, skor P×I, EMV, heatmap 5×5, owner + due date, tautan ke MOM.
- **AC:** risiko baru dari MOM berstatus usulan sampai MOM disahkan; heatmap berubah otomatis.

### Fase 6 — Team, RACI, Stakeholder
- Matriks RACI editable, alokasi %, histogram resource, grid power/interest, rencana komunikasi.
- **AC:** konflik alokasi >100% ditandai; stakeholder prioritas tinggi muncul di hub.

### Fase 7 — Laporan & e-sign lanjutan
- Ekspor PDF/Excel: portofolio, WBS dictionary, jadwal CPM, MOM.
- Revisi MOM (versi +1, `SUPERSEDED`), penolakan, verifikasi hash, pengingat ttd.
- **AC:** MOM lama berstatus digantikan dan tidak lagi dihitung; hash MOM bisa diverifikasi ulang.

### Fase 8 — Produksi
- PostgreSQL + `prisma migrate`, uang `Decimal`, index, unique dependency.
- Auth nyata (OIDC/SSO), ACL per proyek, rate limit, cookie `secure`, audit append-only.
- CI (tsc + test + build), observability, backup, deployment.
- **AC:** dua akun tidak bisa saling melihat proyek yang bukan haknya; migrasi DB punya riwayat.

---

## 11. Keputusan desain (ADR ringkas)

| Keputusan | Alasan | Konsekuensi |
| --- | --- | --- |
| Status dihitung, bukan disimpan | menghindari skor basi | setiap request menghitung ulang (ok untuk skala demo) |
| MOM hanya menurunkan status | leading indicator tidak boleh menutupi EVM buruk | MOM bagus tidak "menyelamatkan" proyek |
| Dampak MOM digating tanda tangan | keputusan resmi butuh otorisasi | alur action/risiko tertahan sampai disahkan |
| WBS roll-up berbobot, bobot 0 diizinkan | governance tidak menggeser progres lingkup | bobot 0 harus dijelaskan di UI (sudah) |
| Durasi & status aktivitas diturunkan | satu sumber kebenaran | tidak bisa override manual (belum dibutuhkan) |
| e-sign Tier 1 dulu | cepat, tanpa vendor | bukan tanda tangan tersertifikasi |
| SQLite + Float | demo cepat | wajib Postgres + Decimal sebelum produksi |
| Seed destruktif | data demo konsisten | jangan dijalankan pada data nyata |

---

## 12. Orientasi 30 menit untuk melanjutkan

1. Baca `AGENTS.md` (aturan kerja) lalu dokumen ini.
2. Jalankan `npm ci && npx prisma db push && npm run db:seed && npm test` — pastikan 15/15.
3. Buka `/portfolio`, lalu `/projects` → ERP.
4. Buka tab **Scope & WBS**, edit work package "Implementasi", buka panel aktivitas, ubah progress
   67,9% → 80%, simpan. Cek: roll-up naik, EV/SPI naik, verdict bisa berubah.
5. Buka tab **Schedule**, lihat float governance 57 hari dan 5 aktivitas kritis.
6. Baca `src/lib/pmbok/project-data.ts` dan `planning-data.ts` untuk melihat aliran data.
7. Baru mulai Fase 4 dari `Timesheet` (model sudah ada, belum ada UI/action).

### Definition of Done untuk setiap perubahan

- [ ] `npx tsc --noEmit` bersih
- [ ] `npm test` lulus (tambah test untuk logika murni baru)
- [ ] `npm run build` sukses
- [ ] `node scripts/verify-pages.mjs` lulus saat dev server hidup
- [ ] Mutasi baru: guard peran + validasi + audit log + `revalidatePath`
- [ ] Dokumen status/backlog diperbarui bila cakupan berubah
