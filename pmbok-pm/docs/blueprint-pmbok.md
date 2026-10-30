# Blueprint PMBOK — PMBOK-PM

Dasar acuan: **PMBOK 6th Ed.** (49 proses, 10 knowledge area) untuk taksonomi modul, dan
**PMBOK 7th Ed.** (12 prinsip, 8 performance domain, tailoring) untuk dashboard dan pendekatan.

## 1. Arsitektur modul

| Lapisan | Modul | Route | Fungsi PMBOK |
| --- | --- | --- | --- |
| Portofolio | Dashboard | `/portfolio` | Measurement, Delivery |
| Portofolio | Daftar proyek | `/projects` | Registri portofolio |
| Tata kelola | Governance | `/governance` | Integrated change control, pengesahan MOM |
| Proyek | Project Hub | `/projects/[id]` | Ringkasan 8 domain |
| Proyek | Meetings & MOM | `/projects/[id]/meetings` | Komunikasi & knowledge |
| Personal | Login/role | `/login` | Peran PM, sponsor, anggota, stakeholder |

## 2. Pemetaan proses PMBOK 6

Legenda: **●** didukung penuh · **◐** dicatat, keputusan di luar sistem · **○** di luar cakupan.

| Proses | Modul | Status |
| --- | --- | --- |
| 4.1 Develop Project Charter | Project Hub | ● |
| 4.2 Develop PM Plan | Project Hub | ● |
| 4.3 Direct and Manage Project Work | MOM action item | ● |
| 4.4 Manage Project Knowledge | Lessons learned (rencana) | ◐ |
| 4.5 Monitor and Control Project Work | Dashboard + health engine | ● |
| 4.6 Perform Integrated Change Control | Change request + keputusan MOM | ● |
| 4.7 Close Project or Phase | Gate review / closure MOM | ◐ |
| 5.1–5.6 Scope (plan, collect, define, WBS, validate, control) | Scope & WBS | ◐ |
| 6.1–6.6 Schedule (activities, sequence, duration, develop, control) | CPM + milestone + EVM | ● |
| 7.1–7.4 Cost (plan, estimate, budget, control) | EVM | ● |
| 8.1–8.3 Quality | Quality metric (rencana) | ◐ |
| 9.1 Plan Resource / 9.2–9.3 / 9.4 / 9.5–9.6 | RACI, timesheet, histogram | ◐ |
| 10.1–10.3 Communications | Matriks komunikasi + MOM | ● |
| 11.1–11.7 Risk | Risk register + skor P×I + EMV | ● |
| 12.1–12.3 Procurement | Make-or-buy log (rencana) | ◐ |
| 13.1–13.4 Stakeholder | Register, power/interest, engagement | ● |

Rekap target akhir: **±33 proses penuh (67%) · 14 parsial (29%) · 2 di luar (4%)** — 96% tercakup.
Pada fase 0–3 yang sudah berjalan, proses yang sudah punya mesin dan UI: 4.5, 4.6, 5.1–5.4,
6.1–6.5 (durasi & urutan), 7.4, 9.6, 10.2–10.3, 11.2–11.3, 13.1–13.3. Proses 5.5–5.6 (validasi &
kontrol lingkup formal) dan 6.6 (kontrol jadwal) masih parsial; Fase 4 akan menutup 7.1–7.4 lewat
timesheet dan tab Cost/EVM.

## 3. Performance domain PMBOK 7 → widget

| Domain | Widget yang sudah ada | Rencana |
| --- | --- | --- |
| Stakeholders | Register (data), engagement | Grafik current vs desired |
| Team | Assignment RACI (data) | Resource histogram |
| Development approach & lifecycle | Label tipe proyek di kartu | Tailoring matrix |
| Planning | Checklist kelengkapan baseline | Skor kelengkapan |
| Project work | Action item MOM | Board aktivitas |
| Delivery | Milestone done vs baseline | Deliverable acceptance |
| Measurement | KPI portofolio, SPI/CPI, EAC/VAC, gauge | Kurva S |
| Uncertainty | Risk register + heatmap (rencana) | Risk burndown |

## 4. Katalog artefak

| Artefak | Jenis | Modul | Approver |
| --- | --- | --- | --- |
| Project charter | Dokumen | Hub | Sponsor |
| WBS & WBS dictionary | Baseline | Scope | PM |
| Schedule & cost baseline | Baseline | Cost/Schedule | Sponsor |
| Risk register | Register | Risk | PM |
| Issue log | Register | MOM/Governance | PM |
| Change request log | Register | Governance | CCB/Sponsor |
| Stakeholder register | Register | Stakeholder | PM |
| Timesheet (AC) | Data | Cost | PM |
| **MOM + tanda tangan** | Dokumen resmi | Meetings | PM + Sponsor |
| Deliverable register | Register | Quality | Sponsor |
| Lessons learned | Register | Hub | PMO |

## 5. Aturan perhitungan

```text
PV = Σ planned value s/d cut-off       EV = Σ (budget × % complete)
AC = Σ (jam × tarif)                  SPI = EV/PV     CPI = EV/AC
EAC = BAC/CPI    ETC = EAC − AC    VAC = BAC − EAC    TCPI = (BAC − EV)/(BAC − AC)
% complete = EV/BAC                    forecast selesai = hari ini + (sisa durasi / SPI)
CPM: EF = ES + durasi, LF = min(LS successor), float = LS − ES, kritis bila float ≤ 0
Risk score = P × I (5×5)   EMV = probability × cost impact
```

Health berurutan:

| Level | Kondisi |
| --- | --- |
| Excellent | SPI & CPI ≥ 1, tanpa risiko tinggi, tanpa slip |
| On Track | SPI & CPI ≥ 0,95 |
| Perlu Perhatian | 0,90–0,95 |
| At Risk | 0,85–0,90, atau risiko skor ≥ 15, atau milestone bergeser |
| Critical | < 0,85 atau slip > 14 hari |

Status akhir = gabungan EVM (bobot 60%) dan MOM Index (40%), dilantai oleh sinyal keras MOM.
Sinyal MOM tidak boleh menaikkan status EVM yang buruk (aturan `worseOf`).

## 6. Tailoring

| Artefak | Predictive | Hybrid | Agile |
| --- | --- | --- | --- |
| Charter | Wajib | Wajib | Wajib ringkas |
| Scope + WBS | Wajib | Wajib | Backlog + epic |
| Baseline + CPM | Wajib | Wajib | Roadmap + sprint |
| EVM | Wajib | Wajib | Burn-up |
| Risk register | Wajib | Wajib | Wajib ringkas |
| Stage gate | Wajib | Wajib | Review increment |

## 7. RBAC

| Aksi | Admin/PMO | PM | Sponsor | Member | Stakeholder |
| --- | --- | --- | --- | --- | --- |
| Lihat portofolio | ✓ | ✓ | ✓ | terbatas | terbatas |
| Isi/ubah proyek | ✓ | ✓ | – | – | – |
| Tanda tangan MOM | – | ✓ | ✓ | – | – |
| Approve baseline/CR | ✓ | usul | ✓ | – | – |
| Input timesheet | – | ✓ | – | ✓ | – |

## 8. Batasan versi ini

Editor WBS/Gantt interaktif, input timesheet, CRUD risiko, laporan PDF/Excel, notifikasi email,
procurement, dan analisis risiko kuantitatif (Monte Carlo) belum dibuka.
