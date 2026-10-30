# PMBOK-PM

Aplikasi manajemen portofolio proyek yang disusun mengikuti **PMBOK Guide** (6th & 7th Edition).
Status proyek tidak diketik manual: dihitung dari **Earned Value (EVM)** dan dari **disiplin rapat (MOM)**
yang sudah ditandatangani.

## Menjalankan

```bash
npm install
npx prisma db push      # membuat database SQLite (prisma/dev.db)
npm run db:seed         # 12 proyek, 84 aktivitas, 84 dependensi, 8 MOM, 10 tanda tangan
npm run dev             # http://localhost:3000
```

Akun demo (password semua akun: `demo1234`):

| Email | Peran |
| --- | --- |
| `admin@pmbok.test` | PMO / Admin |
| `pm@pmbok.test` | Project Manager (ERP Implementation) |
| `sari@pmbok.test` | Project Manager (proyek lain) |
| `sponsor@pmbok.test` | Sponsor — penandatangan MOM |
| `member@pmbok.test` | Team Member |
| `qa@pmbok.test`, `dian@pmbok.test` | Team Member |
| `vendor@pmbok.test` | Stakeholder eksternal |

Perintah lain: `npm test` (unit test mesin PMBOK), `npm run check` (cetak angka portofolio hasil hitungan),
`npm run db:reset` (reset + seed ulang), `npm run build`.

## Yang sudah jadi (Fase 0–3 + inti modul MOM)

- **Fase 0** — Next.js 15 + TypeScript + Tailwind 4, shell sidebar, login 5 peran, sesi cookie HMAC.
- **Fase 1** — skema PMBOK 26 tabel: proyek, WBS, aktivitas, dependensi, milestone, timesheet,
  baseline, risiko, isu, change request, deliverable, stakeholder, RACI, rapat, MOM, tanda tangan, audit log.
- **Fase 2** — dashboard portofolio: KPI, donut RAG, bar departemen, gauge health berbobot BAC,
  milestone baseline-vs-forecast, highlights otomatis, tabel proyek dengan SPI/CPI/MOM.
- **Modul MOM** — daftar rapat, detail notulen, agenda, keputusan, action item, snapshot EVM,
  panel tanda tangan berurutan dengan re-autentikasi, gating dampak, dan MOM Health Index.
- **Fase 3 — Scope & WBS** — WBS editor 4 level, WBS dictionary (deskripsi, kriteria penerimaan,
  penanggung jawab), bobot elemen, dan roll-up progress berbobot dari aktivitas level terendah.
  PMBOK control: elemen kosong, dictionary belum lengkap, dan aktivitas tanpa WBS ditandai.
- **Fase 3 — Aktivitas & progress** — aktivitas dibuat/diubah per work package (nama, tanggal,
  anggaran, progress). Durasi CPM diturunkan dari tanggal dan status mengikuti progress, sehingga
  perubahan langsung mengalir ke roll-up WBS, EVM, health proyek, dan jaringan jadwal. Aktivitas
  yang sudah punya timesheet tidak dapat dihapus agar jejak biaya tetap utuh.
- **Fase 3 — Schedule** — dependensi FS/SS/FF/SF dengan lag, CPM (forward/backward pass),
  early/late dates, total float, jalur kritis, deteksi siklus, Gantt baseline-vs-CPM, dan milestone.

Belum dibuka (bertahap): tab Cost & EVM interaktif, input timesheet, CRUD risiko, Team & RACI,
laporan PDF/Excel.

## Aturan inti

```text
PV = Σ planned value s/d cut-off        EV = Σ (budget × % selesai)
AC = Σ timesheet (jam × tarif)          SPI = EV/PV     CPI = EV/AC
EAC = BAC/CPI   VAC = BAC − EAC   TCPI = (BAC − EV) / (BAC − AC)

MOM Index = 0,30·disiplin action + 0,20·tindak lanjut keputusan
          + 0,20·tren risiko/isu + 0,15·keterlibatan + 0,15·nada notulen
```

Health 5 level: `Excellent → On Track → Perlu Perhatian → At Risk → Critical`.
Sinyal MOM hanya **menurunkan** status, tidak pernah menaikkan EVM yang buruk. Sinyal keras
(action terlambat > 14 hari, isu berulang ≥ 3 rapat, keputusan mayor tanpa CR, MOM > 3 hari
belum ditandatangani, sponsor absen) memaksa status minimal *Berisiko*.

## Struktur

```
prisma/schema.prisma   model data PMBOK + MOM
prisma/seed.ts         data demo yang bercerita (1 proyek sengaja "tidak lancar")
src/lib/pmbok/         evm.ts, health.ts, mom.ts, wbs.ts, schedule.ts,
                       project-data.ts, planning-data.ts (fungsi murni + loader)
src/lib/session.ts     login demo (scrypt + cookie HMAC)
src/app/(app)/         portfolio, projects (+ scope, schedule), governance, MOM
docs/                  blueprint PMBOK, alur MOM e-sign, status handoff, runbook migrasi
AGENTS.md              aturan kerja agent/AI untuk repo ini
.env.example           template environment (salin ke .env)
```

## Dokumentasi

- [docs/blueprint-pmbok.md](docs/blueprint-pmbok.md) — pemetaan proses & artefak PMBOK ke modul.
- [docs/flow-mom-esign.md](docs/flow-mom-esign.md) — alur MOM, state machine, dan e-sign.
- [docs/progress-handoff.md](docs/progress-handoff.md) — status rinci, angka acuan, backlog Fase 4–8.
- [docs/migrasi-antigravity.md](docs/migrasi-antigravity.md) — runbook pindah lingkungan + verifikasi.
- [AGENTS.md](AGENTS.md) — aturan kerja untuk agent/AI dan konvensi kode.
