# Migrasi Pengerjaan ke Antigravity

Runbook memindahkan **`pmbok-pm/`** dari workspace ini ke komputer lokal dan melanjutkannya di
Antigravity. Kondisi repo saat ini: kode ada di subfolder `pmbok-pm/` dan sudah di-commit pada
branch **`feat/pmbok-pm`**.

> Ringkas: pilih salah satu jalur (§2), siapkan Node + `.env` (§3), pindahkan data bila perlu (§4),
> verifikasi dengan angka yang sudah diketahui (§5), lalu buka folder `pmbok-pm` di Antigravity (§6).

---

## 1. Prasyarat

| Kebutuhan | Versi / catatan |
| --- | --- |
| Node.js | **20.18+ atau 22 LTS** (Next 15 mensyaratkan ≥18.18). Hindari Node 23/24 untuk produksi. |
| npm | 10+ (repo memakai `package-lock.json`, gunakan `npm ci`) |
| Git | untuk jalur clone; opsional bila menyalin folder |
| Antigravity | versi terbaru; buka **folder aplikasi**, bukan root repo |
| SQLite | tidak perlu install — Prisma membawa driver; `prisma/dev.db` dibuat otomatis |

Cek cepat:

```bash
node -v && npm -v
```

Bila memakai `nvm`: `nvm install 22 && nvm use 22`.

---

## 2. Memindahkan kode

### Opsi A — lewat Git (disarankan)

Repo: `https://github.com/thowiee/testdulu` (branch awal `master`).

Commit aplikasi sudah dibuat di branch **`feat/pmbok-pm`**; yang tersisa hanya push. Dari root
repo:

```bash
git switch feat/pmbok-pm
git status                     # harus bersih
git log --oneline -1           # commit "feat(pmbok-pm): aplikasi ..."
git push -u origin feat/pmbok-pm
```

Lalu di komputer lokal:

```bash
git clone https://github.com/thowiee/testdulu.git
cd testdulu
git checkout feat/pmbok-pm
```

Jika tidak ingin memakai branch baru, commit langsung ke branch yang Anda kelola. Jangan
memaksa-push branch yang sedang dipakai orang lain.

### Opsi B — salin folder (tanpa Git)

Salin folder `pmbok-pm/` **tanpa** isi berikut:

```text
node_modules/   .next/   prisma/dev.db   prisma/dev.db-journal   .env   *.tsbuildinfo
```

Cara aman (dari root repo):

```bash
rsync -av --exclude node_modules --exclude .next --exclude 'prisma/dev.db*' \
      --exclude .env pmbok-pm/ /tujuan/pmbok-pm/
```

Zip juga boleh, asalkan item di atas tidak ikut. **Jangan** menyalin `.env` berisi rahasia ke
mesin lain lewat chat/email; buat ulang di sana.

> Catatan: root repo juga berisi `index.php` dan `biodata.html` yang tidak berhubungan dengan
> aplikasi ini. Di Antigravity, buka folder **`pmbok-pm`** agar agent tidak bingung.

---

## 3. Setup di komputer baru

```bash
cd pmbok-pm
npm ci                                  # memakai package-lock.json, jangan upgrade dependency
cp .env.example .env
```

Isi `.env`:

```dotenv
DATABASE_URL="file:./dev.db"
SESSION_SECRET="<32-byte hex acak>"
```

Buat nilai acak:

```bash
# macOS/Linux
openssl rand -hex 32
# atau tanpa openssl
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`DATABASE_URL` relatif terhadap folder `prisma/`, jadi `file:./dev.db` menghasilkan
`pmbok-pm/prisma/dev.db`.

Lalu siapkan database dan jalankan:

```bash
npx prisma generate
npx prisma db push          # membuat skema di SQLite
npm run db:seed             # 12 proyek, 84 aktivitas, 84 dependensi, 8 MOM, 10 ttd
npm run dev                 # http://localhost:3000
```

Login: `pm@pmbok.test` / `demo1234`.

> **Peringatan:** `npm run db:seed` dan `npm run db:reset` **menghapus seluruh tabel**. Jangan
> jalankan pada database yang berisi data yang ingin dipertahankan.

---

## 4. Memindahkan data (pilih salah satu)

### 4.1 Reseed — paling mudah (default)

Data demo dibuat ulang oleh seed. Cukup jalankan `npm run db:reset`. Angka portofolio akan sama,
tetapi ID record baru dan tanggal bergeser mengikuti hari seed dijalankan.

### 4.2 Pertahankan database SQLite dari workspace ini

Cocok bila Anda sudah mengubah data lewat UI dan ingin melanjutkan tepat dari kondisi itu.

1. Hentikan dev server di kedua sisi.
2. Salin `pmbok-pm/prisma/dev.db` ke lokasi yang sama di komputer baru.
3. `npx prisma generate` (client harus cocok dengan skema).
4. `npm run dev`.

Catatan:

- `dev.db` **tidak** masuk Git (di-ignore) dan berisi hash password demo; jangan commit.
- Skema sudah sama, jadi `db push` tidak diperlukan; kalau dijalankan pun aman (no-op).
- Jangan menyalin `dev.db` saat server masih menulis (risiko file terkunci/korup).

### 4.3 Ekspor/impor SQLite (opsional)

```bash
sqlite3 prisma/dev.db ".dump" > pmbok-dump.sql
# di mesin baru setelah db push
sqlite3 prisma/dev.db < pmbok-dump.sql
```

Cocok untuk selektif, tetapi versi SQLite harus kompatibel. Untuk demo, §4.1 lebih sederhana.

### 4.4 Pindah ke PostgreSQL (untuk produksi, bukan syarat melanjutkan)

1. Ubah `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set `DATABASE_URL="postgresql://user:pass@host:5432/pmbok"`.
3. Buat migrasi awal:

   ```bash
   npx prisma migrate dev --name init
   ```

   Untuk database yang sudah berisi data (baseline), buat migrasi kosong lalu tandai applied:

   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql
   npx prisma migrate resolve --applied <migration_name>
   ```

4. Isi data demo dengan `npm run db:seed`, atau migrasikan data nyata (pgloader/CSV).
5. Sebelum produksi, ubah uang dari `Float` ke `Decimal`, tambah index dan constraint:

   ```prisma
   @@unique([predId, succId])                 // Dependency
   @@index([projectId, wbsId])                // Activity
   @@index([projectId, date])                 // Timesheet
   @@index([projectId, startAt])              // Meeting
   @@index([projectId, at])                   // AuditLog
   @@index([projectId, status])               // Risk, Issue
   ```

6. Gunakan `prisma migrate deploy` di CI/produksi, **bukan** `db push`.

---

## 5. Verifikasi setelah migrasi

Jalankan berurutan; semua harus sesuai angka ini.

```bash
npx tsc --noEmit                 # tanpa output, exit 0
npm test                         # 15 pass, 0 fail
npm run build                    # sukses, 11 route
npm run check                    # 12 proyek; 7 on track; 3 berisiko; 2 selesai; health 74,8
npm run check:planning           # roll-up 75,8% = EV/BAC; CPM 180 hari; 5/7 kritis
```

Lalu dengan dev server hidup:

```bash
node scripts/verify-pages.mjs    # 11/11 PASS, termasuk redirect 307 tanpa sesi
```

Angka kunci yang harus muncul (seed baru):

| Pemeriksaan | Nilai |
| --- | --- |
| Total / aktif / on track / berisiko / selesai | 12 / 10 / 7 / 3 / 2 |
| Portfolio health | 74,8 |
| Rata-rata SPI | 0,98 |
| Rata-rata MOM | 84,3 |
| ERP: SPI / CPI / MOM | 1,018 / 1,047 / 58 |
| ERP: roll-up WBS vs EV/BAC | 75,8% = 75,8% |
| ERP: durasi CPM | 180 hari, 5/7 kritis, float governance 57 |

Uji manual minimum (5 menit):

1. Login `pm@pmbok.test`, buka ERP → Scope & WBS → Edit "Implementasi".
2. Ubah progress 67,9 → 80, simpan. Roll-up work package dan EV harus naik.
3. Kembali ke hub: SPI/CPI dan verdict berubah; buka portfolio, health ikut berubah.
4. Schedule: tambah relasi FS antar dua aktivitas, pastikan float/kritis berubah; hapus lagi.
5. Governance: buka MOM-2026-0004, tanda tangani sebagai PM lalu Sponsor; status jadi disahkan dan
   dampak aktif.

Jika langkah 2–3 tidak mengubah angka, jangan lanjut — periksa log dev server dan jalankan
`npx prisma generate`.

---

## 6. Membuka di Antigravity

1. **Open Folder** → pilih `.../testdulu/pmbok-pm` (bukan root repo). Terminal default harus di
   folder itu.
2. Pastikan `AGENTS.md` ada di root folder yang dibuka. Agent Antigravity memakai berkas ini sebagai
   instruksi proyek. Jika versi Antigravity Anda memakai lokasi rules sendiri (mis. pengaturan
   *Project Instructions*), salin isi `AGENTS.md` ke sana agar aturan tetap terbaca.
3. Jalankan `npm run dev` di terminal Antigravity, buka `http://localhost:3000`.
4. Beri agent konteks awal dengan prompt:

   ```text
   Baca AGENTS.md, docs/progress-handoff.md, dan docs/migrasi-antigravity.md.
   Jalankan npx tsc --noEmit, npm test, dan npm run build; laporkan hasilnya.
   Jangan mengubah skema atau menjalankan seed tanpa menjelaskan dampaknya lebih dulu.
   Setelah itu ringkas arsitektur di 10 baris dan tunggu instruksi.
   ```

5. Untuk pekerjaan berikutnya, minta agent bekerja per fase dan selalu menutup dengan Definition of
   Done di `progress-handoff.md` §12.

### Prompt lanjutan yang siap dipakai

```text
Implementasikan Fase 4.1 (input timesheet) sesuai backlog di docs/progress-handoff.md.
Tambahkan action, form per aktivitas, perhitungan AC dari timesheet, audit log, revalidate,
dan unit test untuk roll-up biaya. Jangan ubah rumus EVM yang ada. Tutup dengan tsc, test,
build, dan verify-pages.
```

```text
Tambahkan integration test untuk server action WBS dan aktivitas memakai database SQLite
sementara (reset per test). Uji validasi, izin peran, dan efek ke EVM/roll-up. Jangan
menjalankan seed pada dev.db utama.
```

```text
Siapkan migrasi PostgreSQL: ubah provider, buat migrasi awal, tambahkan index dan unique
constraint dependensi, ubah uang ke Decimal, lalu pastikan seluruh test dan build tetap lulus.
```

---

## 7. Troubleshooting

| Gejala | Penyebab umum | Perbaikan |
| --- | --- | --- |
| `Cannot find module '.prisma/client'` | client belum digenerate setelah `npm ci` | `npx prisma generate` |
| `Environment variable not found: DATABASE_URL` | `.env` belum ada / salah lokasi | buat `pmbok-pm/.env`, Prisma membacanya relatif ke schema |
| Login selalu gagal | `SESSION_SECRET` berubah → cookie lama tidak valid | hapus cookie `pm_session` / mode incognito |
| `npm ci` gagal `EUSAGE` | lockfile tidak sinkron | pakai `npm install` sekali, commit lockfile baru; jangan upgrade dependency tanpa alasan |
| Port 3000 dipakai | proses lain | `npm run dev -- -p 3001` |
| Halaman blank / hydration error | cache `.next` rusak | hentikan server, `rm -rf .next`, jalankan lagi |
| `SQLITE_BUSY` / database locked | dua dev server / seed berjalan bersamaan | hentikan proses lain, ulangi |
| Seed gagal unique constraint | data lama belum bersih | `npm run db:reset` (destruktif) |
| `Only async functions are allowed to be exported` | file `"use server"` mengekspor non-fungsi | pindahkan konstanta/tipe ke file lain |
| Build gagal setelah ubah schema | client Prisma lama | `npx prisma generate && npm run build` |
| Tanggal bergeser 1 hari | input tanggal ditafsirkan lokal | aplikasi memakai UTC; kirim `YYYY-MM-DD` |
| Perubahan tidak terlihat setelah simpan | `revalidatePath` belum dipanggil | tambahkan untuk route terkait di action |

---

## 8. Rollback

- Kode: `git checkout <commit-sebelumnya>` (atau `git revert`), lalu `npm ci`.
- Database: hentikan server, ganti `prisma/dev.db` dengan cadangan, jalankan lagi. Tidak ada riwayat
  migrasi SQLite, jadi rollback = restore file.
- Jika sudah pindah Postgres: `npx prisma migrate resolve` untuk menandai migrasi gagal, atau restore
  backup sebelum menjalankan `migrate deploy`.

---

## 9. Checklist migrasi

- [ ] Node 20/22 terpasang, `node -v` sesuai
- [ ] Folder `pmbok-pm` tersalin/clone (tanpa `node_modules`, `.next`, `dev.db`, `.env`)
- [ ] `npm ci` sukses
- [ ] `.env` dibuat dari `.env.example`, `SESSION_SECRET` diisi acak
- [ ] `npx prisma generate` + `npx prisma db push` sukses
- [ ] `npm run db:seed` (atau `dev.db` lama disalin)
- [ ] `npx tsc --noEmit` bersih
- [ ] `npm test` 15/15
- [ ] `npm run build` sukses
- [ ] `npm run check` dan `npm run check:planning` sesuai angka acuan
- [ ] `node scripts/verify-pages.mjs` 11/11 saat dev server hidup
- [ ] Uji manual progress aktivitas mengubah roll-up + EVM
- [ ] Antigravity membuka folder `pmbok-pm`, membaca `AGENTS.md`
- [ ] Commit awal dibuat di branch kerja Anda (jangan commit `.env`/`dev.db`)
