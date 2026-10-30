/**
 * Seed demo PMBOK-PM.
 *
 * Data dirancang agar dashboard langsung bercerita:
 * - 12 proyek (7 on track, 3 berisiko, 2 selesai)
 * - EVM dihitung dari baseline aktivitas, bukan angka hardcode
 * - 1 proyek (ERP Implementation) punya MOM yang "tidak lancar": action item
 *   menumpuk, 2 isu kronis, keputusan mayor tanpa Change Request, dan 1 MOM
 *   yang belum ditandatangani.
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const DEMO_PASSWORD = "demo1234";
const RATE = 250_000;
const TODAY = startOfDay(new Date());

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

function at(date: Date, hour: number, minute = 0): Date {
  return new Date(date.getTime() + hour * 3_600_000 + minute * 60_000);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString("hex")}`;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const USERS = [
  { key: "admin", name: "Rina Kartika", email: "admin@pmbok.test", role: "ADMIN", jobTitle: "Head of PMO", initials: "RK", color: "#2563eb" },
  { key: "pm", name: "Budi Santoso", email: "pm@pmbok.test", role: "PM", jobTitle: "Project Manager", initials: "BS", color: "#0f766e" },
  { key: "pm2", name: "Sari Dewi", email: "sari@pmbok.test", role: "PM", jobTitle: "Project Manager", initials: "SD", color: "#7c3aed" },
  { key: "sponsor", name: "Hendra Wijaya", email: "sponsor@pmbok.test", role: "SPONSOR", jobTitle: "Direktur Operasi", initials: "HW", color: "#b45309" },
  { key: "member", name: "Agus Pratama", email: "member@pmbok.test", role: "MEMBER", jobTitle: "Business Analyst", initials: "AP", color: "#1d4ed8" },
  { key: "qa", name: "Maya Lestari", email: "maya@pmbok.test", role: "MEMBER", jobTitle: "QA Lead", initials: "ML", color: "#be185d" },
  { key: "dev", name: "Dian Saputra", email: "dian@pmbok.test", role: "MEMBER", jobTitle: "Tech Lead", initials: "DS", color: "#0891b2" },
  { key: "vendor", name: "Yusuf Ali", email: "vendor@pmbok.test", role: "STAKEHOLDER", jobTitle: "Vendor Manager", initials: "YA", color: "#475569" },
] as const;

const ACTIVITY_TEMPLATE = [
  {
    name: "Persiapan & Project Charter",
    weight: 10,
    description:
      "Menyusun project charter, mendaftar stakeholder, dan menetapkan rencana awal proyek.",
    acceptanceCriteria:
      "Charter disetujui sponsor; stakeholder register dan rencana awal lengkap.",
    responsible: "Project Manager",
  },
  {
    name: "Analisis Kebutuhan",
    weight: 20,
    description:
      "Mengumpulkan dan memvalidasi kebutuhan bisnis serta menyusun requirements traceability matrix.",
    acceptanceCriteria:
      "Kebutuhan disetujui business owner dan seluruhnya terpetakan ke desain.",
    responsible: "Business Analyst",
  },
  {
    name: "Desain Solusi",
    weight: 25,
    description: "Merancang arsitektur solusi, proses bisnis target, dan spesifikasi teknis.",
    acceptanceCriteria:
      "Dokumen desain ditinjau arsitek dan disetujui change advisory board.",
    responsible: "Solution Architect",
  },
  {
    name: "Implementasi",
    weight: 30,
    description:
      "Membangun solusi sesuai desain, termasuk konfigurasi, integrasi, dan migrasi data.",
    acceptanceCriteria: "Seluruh modul terpasang di lingkungan uji dan lolos smoke test.",
    responsible: "Tech Lead",
  },
  {
    name: "Pengujian & Go-Live",
    weight: 15,
    description: "UAT, pelatihan pengguna, cut-over, dan serah terima operasional.",
    acceptanceCriteria:
      "UAT sign-off, pelatihan selesai, dan go-live berjalan tanpa isu kritis.",
    responsible: "QA Lead",
  },
];
const DEVIATION = [22, 10, -3, -12, -25];

type RiskSeed = {
  code: string;
  title: string;
  probability: number;
  impact: number;
  response: string;
  status: string;
  category: string;
  costImpact: number;
  createdOffset: number;
};

type ProjectSeed = {
  code: string;
  name: string;
  department: string;
  manager: "pm" | "pm2";
  progress: number;
  bac: number;
  spi: number;
  cpi: number;
  duration: number;
  phase: string;
  lifecycle: string;
  frameworkStatus: "ACTIVE" | "COMPLETED";
  program: "ops" | "fin" | "tech";
  milestones: { name: string; offset: number; slip: number; status: string }[];
  risks: RiskSeed[];
};

const PROJECTS: ProjectSeed[] = [
  {
    code: "PRJ-01", name: "ERP Implementation", department: "IT", manager: "pm",
    progress: 76, bac: 1_200_000_000, spi: 1.02, cpi: 1.05, duration: 180,
    phase: "execution", lifecycle: "predictive", frameworkStatus: "ACTIVE", program: "tech",
    milestones: [
      { name: "Go-Live ERP Implementation", offset: 7, slip: 0, status: "PENDING" },
      { name: "UAT Selesai", offset: -14, slip: 0, status: "DONE" },
    ],
    risks: [
      { code: "R-01", title: "Kesiapan integrasi API vendor belum terverifikasi", probability: 5, impact: 4, response: "MITIGATE", status: "OPEN", category: "Teknis", costImpact: 180_000_000, createdOffset: -25 },
      { code: "R-02", title: "Kekurangan tenaga ahli migrasi data", probability: 4, impact: 4, response: "TRANSFER", status: "OPEN", category: "Sumber Daya", costImpact: 120_000_000, createdOffset: -20 },
      { code: "R-03", title: "Perubahan regulasi pelaporan pajak", probability: 4, impact: 4, response: "MITIGATE", status: "OPEN", category: "Eksternal", costImpact: 90_000_000, createdOffset: -10 },
      { code: "R-04", title: "Ketergantungan pada satu konsultan", probability: 3, impact: 4, response: "ACCEPT", status: "CLOSED", category: "Sumber Daya", costImpact: 40_000_000, createdOffset: -40 },
    ],
  },
  {
    code: "PRJ-02", name: "Financial System Upgrade", department: "Finance", manager: "pm2",
    progress: 48, bac: 850_000_000, spi: 0.88, cpi: 0.91, duration: 150,
    phase: "execution", lifecycle: "predictive", frameworkStatus: "ACTIVE", program: "fin",
    milestones: [{ name: "Migrasi Buku Besar", offset: 21, slip: 9, status: "PENDING" }],
    risks: [
      { code: "R-05", title: "Kehilangan data saat migrasi buku besar", probability: 4, impact: 5, response: "MITIGATE", status: "OPEN", category: "Teknis", costImpact: 210_000_000, createdOffset: -30 },
      { code: "R-06", title: "Tim finance tidak tersedia saat closing", probability: 3, impact: 3, response: "ACCEPT", status: "OPEN", category: "Sumber Daya", costImpact: 30_000_000, createdOffset: -15 },
    ],
  },
  {
    code: "PRJ-03", name: "Supply Chain Optimization", department: "Operations", manager: "pm",
    progress: 67, bac: 640_000_000, spi: 1.04, cpi: 1.01, duration: 210,
    phase: "execution", lifecycle: "hybrid", frameworkStatus: "ACTIVE", program: "ops",
    milestones: [{ name: "Phase 2 – Supply Chain Optimization", offset: 14, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-07", title: "Data stok gudang tidak konsisten", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Data", costImpact: 45_000_000, createdOffset: -22 },
    ],
  },
  {
    code: "PRJ-04", name: "HR Portal", department: "HR", manager: "pm2",
    progress: 42, bac: 310_000_000, spi: 0.96, cpi: 0.98, duration: 240,
    phase: "execution", lifecycle: "hybrid", frameworkStatus: "ACTIVE", program: "ops",
    milestones: [{ name: "User Training – HR Portal", offset: 51, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-08", title: "Adopsi pengguna rendah pada fase pilot", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Adopsi", costImpact: 25_000_000, createdOffset: -18 },
    ],
  },
  {
    code: "PRJ-05", name: "Brand Revamp", department: "Marketing", manager: "pm2",
    progress: 86, bac: 240_000_000, spi: 1.06, cpi: 1.02, duration: 150,
    phase: "execution", lifecycle: "agile", frameworkStatus: "ACTIVE", program: "ops",
    milestones: [{ name: "Peluncuran Identitas Baru", offset: 30, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-09", title: "Reaksi pasar negatif terhadap identitas baru", probability: 2, impact: 4, response: "MITIGATE", status: "OPEN", category: "Pasar", costImpact: 60_000_000, createdOffset: -26 },
    ],
  },
  {
    code: "PRJ-06", name: "Customer Portal", department: "IT", manager: "pm",
    progress: 92, bac: 420_000_000, spi: 1.01, cpi: 1.03, duration: 90,
    phase: "closing", lifecycle: "agile", frameworkStatus: "ACTIVE", program: "tech",
    milestones: [{ name: "Peluncuran Customer Portal", offset: -6, slip: 0, status: "DONE" }],
    risks: [
      { code: "R-10", title: "Beban puncak setelah peluncuran", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Teknis", costImpact: 35_000_000, createdOffset: -12 },
    ],
  },
  {
    code: "PRJ-07", name: "Data Analytics Platform", department: "Finance", manager: "pm2",
    progress: 100, bac: 500_000_000, spi: 1.08, cpi: 1.1, duration: 120,
    phase: "closing", lifecycle: "predictive", frameworkStatus: "COMPLETED", program: "fin",
    milestones: [{ name: "Platform Analytics Live", offset: -40, slip: 0, status: "DONE" }],
    risks: [
      { code: "R-11", title: "Kualitas data sumber rendah", probability: 3, impact: 4, response: "MITIGATE", status: "CLOSED", category: "Data", costImpact: 50_000_000, createdOffset: -80 },
    ],
  },
  {
    code: "PRJ-08", name: "Process Automation", department: "Operations", manager: "pm",
    progress: 60, bac: 380_000_000, spi: 1.0, cpi: 0.99, duration: 270,
    phase: "execution", lifecycle: "hybrid", frameworkStatus: "ACTIVE", program: "ops",
    milestones: [{ name: "Otomasi 5 Proses Kunci", offset: 60, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-12", title: "Proses bisnis berubah saat implementasi", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Proses", costImpact: 40_000_000, createdOffset: -28 },
    ],
  },
  {
    code: "PRJ-09", name: "Vendor Management System", department: "Operations", manager: "pm2",
    progress: 58, bac: 275_000_000, spi: 0.97, cpi: 1.0, duration: 200,
    phase: "execution", lifecycle: "predictive", frameworkStatus: "ACTIVE", program: "ops",
    milestones: [{ name: "Registrasi Vendor Terpadu", offset: 44, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-13", title: "Vendor menolak migrasi data kontrak", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Eksternal", costImpact: 30_000_000, createdOffset: -20 },
    ],
  },
  {
    code: "PRJ-10", name: "Mobile Field Service App", department: "IT", manager: "pm",
    progress: 71, bac: 330_000_000, spi: 1.03, cpi: 0.96, duration: 160,
    phase: "execution", lifecycle: "agile", frameworkStatus: "ACTIVE", program: "tech",
    milestones: [{ name: "Pilot Lapangan 3 Cabang", offset: 25, slip: 0, status: "PENDING" }],
    risks: [
      { code: "R-14", title: "Perangkat lapangan tidak seragam", probability: 3, impact: 3, response: "MITIGATE", status: "OPEN", category: "Teknis", costImpact: 55_000_000, createdOffset: -24 },
    ],
  },
  {
    code: "PRJ-11", name: "Compliance Audit (SOX)", department: "Finance", manager: "pm2",
    progress: 35, bac: 190_000_000, spi: 0.83, cpi: 0.87, duration: 120,
    phase: "execution", lifecycle: "predictive", frameworkStatus: "ACTIVE", program: "fin",
    milestones: [{ name: "Audit Readiness Review", offset: 18, slip: 16, status: "PENDING" }],
    risks: [
      { code: "R-15", title: "Temuan kontrol internal berulang", probability: 5, impact: 5, response: "MITIGATE", status: "OPEN", category: "Kepatuhan", costImpact: 240_000_000, createdOffset: -35 },
    ],
  },
  {
    code: "PRJ-12", name: "Warehouse Expansion", department: "Operations", manager: "pm",
    progress: 100, bac: 720_000_000, spi: 1.05, cpi: 1.12, duration: 210,
    phase: "closing", lifecycle: "predictive", frameworkStatus: "COMPLETED", program: "ops",
    milestones: [{ name: "Gudang Regional Beroperasi", offset: -70, slip: 0, status: "DONE" }],
    risks: [
      { code: "R-16", title: "Keterlambatan perizinan bangunan", probability: 3, impact: 4, response: "MITIGATE", status: "CLOSED", category: "Eksternal", costImpact: 100_000_000, createdOffset: -120 },
    ],
  },
];

async function main() {
  console.log("• membersihkan data lama…");
  await prisma.auditLog.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.signatureRequest.deleteMany();
  await prisma.momVersion.deleteMany();
  await prisma.performanceSnapshot.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.agendaItem.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.resourceAssignment.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.wbsElement.deleteMany();
  await prisma.baseline.deleteMany();
  await prisma.project.deleteMany();
  await prisma.program.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.user.deleteMany();

  console.log("• membuat pengguna…");
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        jobTitle: user.jobTitle,
        initials: user.initials,
        color: user.color,
      },
    });
    userIds.set(user.key, created.id);
  }

  const portfolio = await prisma.portfolio.create({ data: { name: "Portofolio Transformasi Digital" } });
  const programIds = new Map<string, string>();
  for (const [key, name] of [
    ["ops", "Program Operasional"],
    ["fin", "Program Keuangan"],
    ["tech", "Program Teknologi"],
  ] as const) {
    const program = await prisma.program.create({
      data: { name, portfolioId: portfolio.id },
    });
    programIds.set(key, program.id);
  }

  const user = (key: string): string => userIds.get(key)!;
  const projectIds = new Map<string, string>();

  console.log("• membuat 12 proyek, WBS, aktivitas, dan timesheet…");
  for (const spec of PROJECTS) {
    const completed = spec.frameworkStatus === "COMPLETED";
    const start = completed
      ? addDays(TODAY, -spec.duration - 20)
      : addDays(TODAY, -Math.round((spec.duration * spec.progress) / 100 / spec.spi));
    const finish = completed
      ? addDays(TODAY, -20)
      : addDays(start, spec.duration);

    const project = await prisma.project.create({
      data: {
        code: spec.code,
        name: spec.name,
        department: spec.department,
        lifecycleType: spec.lifecycle,
        phase: spec.phase,
        frameworkStatus: spec.frameworkStatus,
        portfolioId: portfolio.id,
        programId: programIds.get(spec.program)!,
        managerId: user(spec.manager),
        sponsorId: user("sponsor"),
        startBaseline: start,
        finishBaseline: finish,
        bac: spec.bac,
        contingency: Math.round(spec.bac * 0.08),
      },
    });
    projectIds.set(spec.code, project.id);

    const rootWbs = await prisma.wbsElement.create({
      data: {
        projectId: project.id,
        code: "1",
        name: `${spec.name} — Deliverable Utama`,
        kind: "DELIVERABLE",
        weight: 100,
        description: `Lingkup total ${spec.name}: seluruh work package yang harus diselesaikan.`,
        acceptanceCriteria:
          "Seluruh work package diterima sponsor dan berita acara serah terima ditandatangani.",
        responsible: "Project Manager",
      },
    });

    const rawAverage = ACTIVITY_TEMPLATE.reduce(
      (sum, template, index) =>
        sum + (template.weight / 100) * clamp(spec.progress + DEVIATION[index], 0, 100),
      0
    );
    const delta = spec.progress - rawAverage;

    let cumulative = 0;
    const activityIds: string[] = [];
    for (let index = 0; index < ACTIVITY_TEMPLATE.length; index += 1) {
      const template = ACTIVITY_TEMPLATE[index];
      const wbs = await prisma.wbsElement.create({
        data: {
          projectId: project.id,
          parentId: rootWbs.id,
          code: `1.${index + 1}`,
          name: template.name,
          kind: "WORK_PACKAGE",
          weight: template.weight,
          description: template.description,
          acceptanceCriteria: template.acceptanceCriteria,
          responsible: template.responsible,
        },
      });

      const weightFraction = template.weight / 100;
      const activityStart = addDays(start, Math.round(spec.duration * cumulative));
      cumulative += weightFraction;
      const activityFinish = addDays(start, Math.round(spec.duration * cumulative));
      const percentComplete = completed
        ? 100
        : Math.round(clamp(spec.progress + DEVIATION[index] + delta, 0, 100) * 10) / 10;
      const budget = Math.round(spec.bac * weightFraction);

      const activity = await prisma.activity.create({
        data: {
          projectId: project.id,
          wbsId: wbs.id,
          name: template.name,
          durationDays: Math.max(1, Math.round(spec.duration * weightFraction)),
          startBaseline: activityStart,
          finishBaseline: activityFinish,
          effortHours: Math.round((budget / RATE) * 1.15),
          budget,
          percentComplete,
          status: percentComplete >= 100 ? "DONE" : percentComplete > 0 ? "ONGOING" : "TODO",
        },
      });
      activityIds.push(activity.id);
    }

    // Governance berjalan paralel. Bobot dan anggaran 0 agar EVM tidak berubah,
    // tetapi tetap masuk jaringan CPM sehingga float-nya bisa dibaca.
    const governanceWbs = await prisma.wbsElement.create({
      data: {
        projectId: project.id,
        parentId: rootWbs.id,
        code: "1.6",
        name: "Manajemen Proyek & Governance",
        kind: "WORK_PACKAGE",
        weight: 0,
        description:
          "Monitoring & controlling, pelaporan status, dan pengelolaan perubahan sepanjang proyek.",
        acceptanceCriteria:
          "Laporan status bulanan diterima sponsor dan seluruh change request diputuskan di CCB.",
        responsible: "Project Manager",
      },
    });

    const monitoringStart = addDays(start, Math.round(spec.duration * 0.3));
    const monitoringDuration = Math.max(5, Math.round(spec.duration * 0.17));
    const monitoringFinish = addDays(monitoringStart, monitoringDuration);
    const reportingDuration = Math.max(3, Math.round(spec.duration * 0.06));
    const reportingFinish = addDays(monitoringFinish, reportingDuration);
    const elapsedPercent = completed
      ? 100
      : Math.round(
          clamp(
            ((TODAY.getTime() - start.getTime()) / (finish.getTime() - start.getTime())) * 100,
            0,
            100
          )
        );

    const monitoring = await prisma.activity.create({
      data: {
        projectId: project.id,
        wbsId: governanceWbs.id,
        name: "Monitoring & Controlling",
        durationDays: monitoringDuration,
        startBaseline: monitoringStart,
        finishBaseline: monitoringFinish,
        effortHours: 0,
        budget: 0,
        percentComplete: elapsedPercent,
        status: elapsedPercent >= 100 ? "DONE" : elapsedPercent > 0 ? "ONGOING" : "TODO",
      },
    });
    const reporting = await prisma.activity.create({
      data: {
        projectId: project.id,
        wbsId: governanceWbs.id,
        name: "Laporan Status & Steering",
        durationDays: reportingDuration,
        startBaseline: monitoringFinish,
        finishBaseline: reportingFinish,
        effortHours: 0,
        budget: 0,
        percentComplete: completed ? 100 : Math.max(0, elapsedPercent - 20),
        status: completed ? "DONE" : elapsedPercent > 0 ? "ONGOING" : "TODO",
      },
    });

    await prisma.dependency.createMany({
      data: [
        { predId: activityIds[0], succId: activityIds[1], type: "FS", lagDays: 0 },
        { predId: activityIds[1], succId: activityIds[2], type: "FS", lagDays: 0 },
        { predId: activityIds[2], succId: activityIds[3], type: "FS", lagDays: 0 },
        { predId: activityIds[3], succId: activityIds[4], type: "FS", lagDays: 0 },
        { predId: activityIds[2], succId: monitoring.id, type: "SS", lagDays: 0 },
        { predId: monitoring.id, succId: reporting.id, type: "FS", lagDays: 0 },
        { predId: reporting.id, succId: activityIds[4], type: "FS", lagDays: 0 },
      ],
    });

    // AC = EV / CPI target, dialokasikan proporsional terhadap anggaran aktivitas.
    const spentRatio = spec.progress / 100 / spec.cpi;
    const timesheets = activityIds.map((activityId, index) => {
      const cost = spec.bac * (ACTIVITY_TEMPLATE[index].weight / 100) * spentRatio;
      return {
        projectId: project.id,
        activityId,
        userId: index % 2 === 0 ? user("member") : user("dev"),
        date: addDays(TODAY, -3 - index),
        hours: Math.round((cost / RATE) * 10) / 10,
        rate: RATE,
        note: `Realisasi biaya ${ACTIVITY_TEMPLATE[index].name}`,
      };
    });
    await prisma.timesheet.createMany({ data: timesheets });

    await prisma.milestone.createMany({
      data: spec.milestones.map((milestone) => {
        const baselineDate = addDays(TODAY, milestone.offset);
        return {
          projectId: project.id,
          name: milestone.name,
          baselineDate,
          forecastDate: addDays(baselineDate, milestone.slip),
          status: milestone.status,
        };
      }),
    });

    await prisma.risk.createMany({
      data: spec.risks.map((risk) => ({
        projectId: project.id,
        code: `${spec.code}-${risk.code}`,
        title: risk.title,
        category: risk.category,
        probability: risk.probability,
        impact: risk.impact,
        costImpact: risk.costImpact,
        response: risk.response,
        status: risk.status,
        ownerId: user("pm"),
        createdAt: addDays(TODAY, risk.createdOffset),
        cause: "Teridentifikasi pada analisis risiko proyek",
        trigger: "Terjadi perubahan pada area terkait",
      })),
    });

    await prisma.resourceAssignment.createMany({
      data: [
        { projectId: project.id, userId: user(spec.manager), raci: "R", allocationPct: 60 },
        { projectId: project.id, userId: user("sponsor"), raci: "A", allocationPct: 10 },
        { projectId: project.id, userId: user("member"), raci: "R", allocationPct: 40 },
        { projectId: project.id, userId: user("qa"), raci: "C", allocationPct: 25 },
      ],
    });

    await prisma.stakeholder.createMany({
      data: [
        {
          projectId: project.id,
          name: "Hendra Wijaya",
          organization: "Direksi",
          power: 5,
          interest: 4,
          engagementCurrent: "SUPPORTIVE",
          engagementDesired: "LEADING",
          channel: "Steering bulanan",
        },
        {
          projectId: project.id,
          name: "Yusuf Ali",
          organization: "Vendor Mitra",
          power: 3,
          interest: 5,
          engagementCurrent: "NEUTRAL",
          engagementDesired: "SUPPORTIVE",
          channel: "Weekly status",
        },
      ],
    });

    await prisma.deliverable.create({
      data: {
        projectId: project.id,
        wbsId: rootWbs.id,
        name: completed ? "Dokumen Serah Terima Final" : "Dokumen Desain Solusi",
        version: completed ? "v2" : "v1",
        acceptanceStatus: completed ? "ACCEPTED" : "SUBMITTED",
        fileUrl: `/dokumen/${spec.code.toLowerCase()}-desain.pdf`,
      },
    });

    await prisma.baseline.create({
      data: {
        projectId: project.id,
        version: 1,
        kind: "COST_SCHEDULE",
        snapshot: JSON.stringify({
          bac: spec.bac,
          start: start.toISOString(),
          finish: finish.toISOString(),
          activities: ACTIVITY_TEMPLATE.length + 2,
        }),
        approvedBy: user("sponsor"),
        approvedAt: addDays(start, 2),
      },
    });
  }

  // Change request awal (untuk proyek yang punya keputusan CCB)
  const erpChange = await prisma.changeRequest.create({
    data: {
      projectId: projectIds.get("PRJ-01")!,
      code: "CR-0003",
      title: "Tambahan modul pelaporan eksekutif",
      description: "Permintaan sponsor pada CCB: dashboard eksekutif di luar lingkup awal.",
      impactDays: 12,
      impactCost: 85_000_000,
      status: "APPROVED",
      decidedAt: addDays(TODAY, -10),
      decidedBy: user("sponsor"),
    },
  });
  await prisma.changeRequest.create({
    data: {
      projectId: projectIds.get("PRJ-01")!,
      code: "CR-0004",
      title: "Perpanjangan lisensi middleware",
      description: "Lisensi middleware perlu diperpanjang 6 bulan karena go-live bergeser.",
      impactDays: 3,
      impactCost: 42_000_000,
      status: "DRAFT",
    },
  });
  await prisma.changeRequest.create({
    data: {
      projectId: projectIds.get("PRJ-02")!,
      code: "CR-0001",
      title: "Penambahan lingkungan uji terpisah",
      description: "Diperlukan environment UAT terpisah agar migrasi buku besar aman.",
      impactDays: 8,
      impactCost: 60_000_000,
      status: "DRAFT",
    },
  });

  console.log("• membuat rapat, notulen (MOM), dan tanda tangan…");

  type SignerSeed = { key: string; role: string; order: number };

  type MeetingSeed = {
    momNo: string;
    projectCode: string;
    type: string;
    title: string;
    startOffset: number;
    hour: number;
    status: "APPROVED" | "REVIEW";
    chair: string;
    secretary: string;
    signers: SignerSeed[];
    signedCount: number;
    attendees: {
      key?: string;
      external?: string;
      organization?: string;
      role?: string;
      presence?: string;
      acknowledged?: boolean;
    }[];
    agenda: { topic: string; summary?: string }[];
    decisions: {
      text: string;
      impactLevel: string;
      status: string;
      decidedBy: string;
      changeId?: string | null;
      createdOffset?: number;
    }[];
    actions: {
      text: string;
      owner: string;
      dueOffset: number;
      status: string;
      completedOffset?: number | null;
      priority?: string;
      linkedType?: string;
      linkedLabel?: string;
    }[];
    negativeTone: number;
    summary: string;
    snapshot: { spi: number; cpi: number; progress: number };
  };

  const meetingIds = new Map<string, string>();

  async function createMeeting(seed: MeetingSeed) {
    const projectId = projectIds.get(seed.projectCode)!;
    const startAt = at(addDays(TODAY, seed.startOffset), seed.hour);
    const endAt = new Date(startAt.getTime() + 90 * 60_000);
    const approved = seed.status === "APPROVED";

    const meeting = await prisma.meeting.create({
      data: {
        momNo: seed.momNo,
        projectId,
        type: seed.type,
        title: seed.title,
        startAt,
        endAt,
        location: "Ruang Rapat Melati / Zoom",
        chairId: user(seed.chair),
        secretaryId: user(seed.secretary),
        status: seed.status,
        currentVersion: 1,
        nextMeetingAt: addDays(startAt, 7),
      },
    });
    meetingIds.set(seed.momNo, meeting.id);

    await prisma.attendee.createMany({
      data: seed.attendees.map((attendee) => ({
        meetingId: meeting.id,
        userId: attendee.key ? user(attendee.key) : null,
        externalName: attendee.external ?? null,
        organization: attendee.organization ?? null,
        role: attendee.role ?? "MEMBER",
        presence: attendee.presence ?? "PRESENT",
        acknowledgedAt: attendee.acknowledged ? addDays(startAt, 1) : null,
      })),
    });

    await prisma.agendaItem.createMany({
      data: seed.agenda.map((item, index) => ({
        meetingId: meeting.id,
        seq: index + 1,
        topic: item.topic,
        summary: item.summary ?? null,
        durationMin: 20,
      })),
    });

    const contentHash = sha(
      `${seed.momNo}|1|${seed.title}|${seed.agenda.map((item) => item.topic).join("|")}|${seed.summary}`
    );
    const version = await prisma.momVersion.create({
      data: {
        meetingId: meeting.id,
        version: 1,
        summary: seed.summary,
        contentHash,
        negativeTone: seed.negativeTone,
        status: approved ? "APPROVED" : "REVIEW",
        lockedAt: approved ? addDays(startAt, 1) : null,
        createdAt: addDays(startAt, 1),
      },
    });

    for (const signer of seed.signers) {
      const signed = seed.signedCount >= signer.order;
      const request = await prisma.signatureRequest.create({
        data: {
          momVersionId: version.id,
          signerId: user(signer.key),
          requiredRole: signer.role,
          orderNo: signer.order,
          status: signed ? "SIGNED" : "PENDING",
          requestedAt: addDays(startAt, 1),
          dueAt: addDays(startAt, 3),
        },
      });
      if (signed) {
        await prisma.signature.create({
          data: {
            signatureRequestId: request.id,
            signerId: user(signer.key),
            method: "click_reath",
            signedAt: addDays(startAt, 1),
            ip: "127.0.0.1",
            userAgent: "seed-script",
            contentHash,
          },
        });
      }
    }

    if (seed.decisions.length > 0) {
      await prisma.decision.createMany({
        data: seed.decisions.map((decision) => ({
          meetingId: meeting.id,
          text: decision.text,
          decidedById: user(decision.decidedBy),
          impactLevel: decision.impactLevel,
          status: decision.status,
          changeId: decision.changeId ?? null,
          createdAt: addDays(startAt, decision.createdOffset ?? 0),
          rationale: "Disepakati dalam rapat",
        })),
      });
    }

    if (seed.actions.length > 0) {
      await prisma.actionItem.createMany({
        data: seed.actions.map((action) => ({
          meetingId: meeting.id,
          text: action.text,
          ownerId: user(action.owner),
          dueDate: addDays(TODAY, action.dueOffset),
          priority: action.priority ?? "MEDIUM",
          status: action.status,
          completedAt:
            action.completedOffset === undefined || action.completedOffset === null
              ? null
              : addDays(TODAY, action.completedOffset),
          linkedType: action.linkedType ?? null,
          linkedLabel: action.linkedLabel ?? null,
        })),
      });
    }

    const spec = PROJECTS.find((project) => project.code === seed.projectCode)!;
    const ev = spec.bac * (seed.snapshot.progress / 100);
    await prisma.performanceSnapshot.create({
      data: {
        meetingId: meeting.id,
        snapshotDate: startAt,
        bac: spec.bac,
        ev: Math.round(ev),
        pv: Math.round(ev / seed.snapshot.spi),
        ac: Math.round(ev / seed.snapshot.cpi),
        spi: seed.snapshot.spi,
        cpi: seed.snapshot.cpi,
        milestonesDone: spec.milestones.filter((milestone) => milestone.status === "DONE").length,
      },
    });

    return meeting.id;
  }

  // --- ERP Implementation: proyek dengan sinyal MOM memburuk -------------
  await createMeeting({
    momNo: "MOM-2026-0001",
    projectCode: "PRJ-01",
    type: "kickoff",
    title: "Kickoff ERP Implementation",
    startOffset: -45,
    hour: 9,
    status: "APPROVED",
    chair: "pm",
    secretary: "member",
    signers: [
      { key: "pm", role: "Prepared & Reviewed", order: 1 },
      { key: "sponsor", role: "Approved", order: 2 },
    ],
    signedCount: 2,
    attendees: [
      { key: "pm", role: "CHAIR" },
      { key: "member", role: "SECRETARY" },
      { key: "sponsor", role: "MEMBER" },
      { key: "qa", role: "MEMBER" },
      { key: "dev", role: "MEMBER" },
    ],
    agenda: [
      { topic: "Konfirmasi charter & tujuan proyek", summary: "Charter disepakati, sponsor menandatangani." },
      { topic: "RACI dan komposisi tim", summary: "RACI awal disetujui, 2 peran masih kosong." },
      { topic: "Baseline jadwal, biaya, dan risiko awal", summary: "Baseline v1 disetujui." },
    ],
    decisions: [
      { text: "Menggunakan pendekatan predictive dengan gate per fase", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "sponsor" },
      { text: "Vendor middleware dipilih melalui tender terbatas", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm" },
    ],
    actions: [
      { text: "Finalisasi project charter dan tanda tangan sponsor", owner: "pm", dueOffset: -30, status: "DONE", completedOffset: -32, priority: "HIGH" },
      { text: "Susun RACI lengkap untuk 5 work package", owner: "member", dueOffset: -28, status: "DONE", completedOffset: -30 },
      { text: "Upload baseline jadwal & biaya ke sistem", owner: "dev", dueOffset: -25, status: "DONE", completedOffset: -27 },
      { text: "Siapkan akses environment development", owner: "dev", dueOffset: 10, status: "OPEN" },
    ],
    negativeTone: 0.2,
    summary:
      "Kickoff berjalan lancar. Charter dan baseline v1 disetujui sponsor. Dua peran tim masih kosong dan perlu dilengkapi sebelum fase desain.",
    snapshot: { spi: 1.0, cpi: 1.02, progress: 8 },
  });

  await createMeeting({
    momNo: "MOM-2026-0002",
    projectCode: "PRJ-01",
    type: "weekly_status",
    title: "Weekly Status #1 ERP Implementation",
    startOffset: -24,
    hour: 10,
    status: "APPROVED",
    chair: "pm",
    secretary: "member",
    signers: [{ key: "pm", role: "Approved", order: 1 }],
    signedCount: 1,
    attendees: [
      { key: "pm", role: "CHAIR", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "qa", role: "MEMBER", acknowledged: false },
      { key: "dev", role: "MEMBER", acknowledged: true },
      { key: "sponsor", role: "MEMBER", presence: "APOLOGY", acknowledged: false },
    ],
    agenda: [
      { topic: "Progres per work package", summary: "Desain 78%, implementasi baru 41%." },
      { topic: "Kendala integrasi API vendor", summary: "Vendor belum memberikan spesifikasi final." },
      { topic: "Rencana dua minggu ke depan", summary: "Fokus penyelesaian desain dan kickoff implementasi." },
    ],
    decisions: [
      { text: "Menunda integrasi API sampai spesifikasi vendor final", impactLevel: "MAJOR", status: "OPEN", decidedBy: "pm" },
    ],
    actions: [
      { text: "Kirim surat resmi permintaan spesifikasi API ke vendor", owner: "member", dueOffset: -20, status: "DONE", completedOffset: -16, priority: "HIGH", linkedType: "risk", linkedLabel: "Risiko R-01 integrasi API" },
      { text: "Susun rencana kerja ulang untuk modul integrasi", owner: "pm", dueOffset: -16, status: "OPEN", priority: "HIGH", linkedType: "activity", linkedLabel: "Aktivitas 1.3 Desain Solusi" },
      { text: "Validasi data master pelanggan", owner: "qa", dueOffset: -18, status: "OPEN", linkedType: "issue", linkedLabel: "Isu kesiapan data master" },
      { text: "Update risk register dengan risiko regulasi pajak", owner: "pm", dueOffset: 5, status: "OPEN" },
    ],
    negativeTone: 0.3,
    summary:
      "Progres desain sesuai rencana, namun implementasi tertinggal karena spesifikasi API vendor belum tersedia. Sponsor tidak hadir dan meminta ringkasan tertulis.",
    snapshot: { spi: 1.01, cpi: 1.03, progress: 55 },
  });

  await createMeeting({
    momNo: "MOM-2026-0003",
    projectCode: "PRJ-01",
    type: "ccb",
    title: "CCB — Tambahan Modul Pelaporan",
    startOffset: -12,
    hour: 14,
    status: "APPROVED",
    chair: "pm",
    secretary: "qa",
    signers: [
      { key: "pm", role: "Reviewed", order: 1 },
      { key: "sponsor", role: "Approved", order: 2 },
    ],
    signedCount: 2,
    attendees: [
      { key: "pm", role: "CHAIR", acknowledged: true },
      { key: "sponsor", role: "MEMBER", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "dev", role: "MEMBER", acknowledged: false },
    ],
    agenda: [
      { topic: "CR-0003 modul pelaporan eksekutif", summary: "Dampak +12 hari dan +Rp85 juta." },
      { topic: "Dampak terhadap baseline v1", summary: "Baseline naik ke v2 setelah approval." },
    ],
    decisions: [
      { text: "Menyetujui CR-0003 dengan perpanjangan 12 hari", impactLevel: "MAJOR", status: "FOLLOWED_UP", decidedBy: "sponsor", changeId: erpChange.id },
      { text: "Menunda CR-0004 sampai harga lisensi final", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm" },
    ],
    actions: [
      { text: "Perbarui baseline biaya & jadwal ke versi 2", owner: "pm", dueOffset: -6, status: "DONE", completedOffset: -8, priority: "HIGH", linkedType: "change", linkedLabel: "CR-0003" },
      { text: "Negosiasi harga lisensi middleware", owner: "member", dueOffset: -25, status: "OPEN", priority: "HIGH" },
      { text: "Finalisasi kontrak vendor integrasi", owner: "pm", dueOffset: -18, status: "OPEN", priority: "HIGH" },
      { text: "Sosialisasi perubahan lingkup ke tim QA", owner: "qa", dueOffset: -5, status: "OPEN" },
    ],
    negativeTone: 0.4,
    summary:
      "CCB menyetujui penambahan modul pelaporan dengan dampak biaya dan jadwal. Tiga komitmen rapat sebelumnya belum selesai dan menghambat implementasi.",
    snapshot: { spi: 0.99, cpi: 1.0, progress: 68 },
  });

  await createMeeting({
    momNo: "MOM-2026-0004",
    projectCode: "PRJ-01",
    type: "gate_review",
    title: "Gate Review Eksekusi ERP Implementation",
    startOffset: -5,
    hour: 9,
    status: "REVIEW",
    chair: "pm",
    secretary: "member",
    signers: [
      { key: "pm", role: "Reviewed", order: 1 },
      { key: "sponsor", role: "Approved", order: 2 },
    ],
    signedCount: 1,
    attendees: [
      { key: "pm", role: "CHAIR", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "qa", role: "MEMBER", acknowledged: false },
    ],
    agenda: [
      { topic: "Kesiapan gate eksekusi", summary: "Kelengkapan artefak 7 dari 9." },
      { topic: "Status isu integrasi API", summary: "Belum ada penyelesaian, sudah 4 rapat." },
      { topic: "Keputusan eskalasi ke sponsor", summary: "Diusulkan eskalasi formal." },
    ],
    decisions: [
      { text: "Eskalasi isu integrasi API ke sponsor dan direksi", impactLevel: "MAJOR", status: "OPEN", decidedBy: "pm" },
    ],
    actions: [
      { text: "Kirim paket eskalasi API ke sponsor", owner: "pm", dueOffset: 3, status: "OPEN", priority: "HIGH" },
      { text: "Lengkapi 2 artefak gate yang belum ada", owner: "qa", dueOffset: 7, status: "OPEN" },
    ],
    negativeTone: 0.45,
    summary:
      "Gate eksekusi belum bisa diloloskan: dua artefak belum lengkap dan isu integrasi API belum terselesaikan. Keputusan eskalasi menunggu pengesahan sponsor.",
    snapshot: { spi: 0.97, cpi: 0.99, progress: 74 },
  });

  // --- Financial System Upgrade: EVM sudah kuning, governance masih tertib
  await createMeeting({
    momNo: "MOM-2026-0005",
    projectCode: "PRJ-02",
    type: "weekly_status",
    title: "Weekly Status #1 Financial System Upgrade",
    startOffset: -18,
    hour: 13,
    status: "APPROVED",
    chair: "pm2",
    secretary: "member",
    signers: [{ key: "pm2", role: "Approved", order: 1 }],
    signedCount: 1,
    attendees: [
      { key: "pm2", role: "CHAIR", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "qa", role: "MEMBER", acknowledged: true },
      { key: "dev", role: "MEMBER", acknowledged: true },
      { key: "sponsor", role: "MEMBER", acknowledged: true },
    ],
    agenda: [
      { topic: "Progres migrasi buku besar", summary: "43% selesai, 9 hari di belakang baseline." },
      { topic: "Rencana catch-up", summary: "Menambah 1 tenaga migrasi data." },
    ],
    decisions: [
      { text: "Menambah satu tenaga migrasi data selama 3 minggu", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm2" },
    ],
    actions: [
      { text: "Ajukan permintaan tenaga migrasi tambahan", owner: "pm2", dueOffset: -12, status: "DONE", completedOffset: -14 },
      { text: "Buat environment UAT terpisah", owner: "dev", dueOffset: -10, status: "DONE", completedOffset: -11 },
      { text: "Rekonsiliasi 3 tabel buku besar", owner: "member", dueOffset: -3, status: "OPEN", priority: "HIGH" },
    ],
    negativeTone: 0.18,
    summary:
      "Migrasi buku besar berjalan lebih lambat dari baseline. Tim menyepakati penambahan tenaga dan environment UAT terpisah untuk menekan risiko data.",
    snapshot: { spi: 0.9, cpi: 0.93, progress: 41 },
  });

  await createMeeting({
    momNo: "MOM-2026-0006",
    projectCode: "PRJ-02",
    type: "weekly_status",
    title: "Weekly Status #2 Financial System Upgrade",
    startOffset: -4,
    hour: 13,
    status: "APPROVED",
    chair: "pm2",
    secretary: "member",
    signers: [{ key: "pm2", role: "Approved", order: 1 }],
    signedCount: 1,
    attendees: [
      { key: "pm2", role: "CHAIR", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "qa", role: "MEMBER", acknowledged: true },
      { key: "dev", role: "MEMBER", acknowledged: true },
      { key: "sponsor", role: "MEMBER", presence: "APOLOGY", acknowledged: false },
    ],
    agenda: [
      { topic: "Status catch-up plan", summary: "Dua tabel sudah terekonsiliasi." },
      { topic: "Risiko kehilangan data", summary: "Backup harian sudah aktif." },
    ],
    decisions: [
      { text: "Menjalankan backup harian sampai migrasi selesai", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm2" },
    ],
    actions: [
      { text: "Aktifkan backup harian database keuangan", owner: "dev", dueOffset: -2, status: "DONE", completedOffset: -3 },
      { text: "Uji restore backup di environment UAT", owner: "qa", dueOffset: -1, status: "DONE", completedOffset: -2 },
      { text: "Finalkan daftar tabel yang dimigrasi", owner: "member", dueOffset: 6, status: "OPEN" },
    ],
    negativeTone: 0.2,
    summary:
      "Catch-up plan berjalan. Dua dari tiga tabel sudah direkonsiliasi dan backup harian aktif. Proyek masih di belakang jadwal namun risiko data terkendali.",
    snapshot: { spi: 0.88, cpi: 0.92, progress: 46 },
  });

  // --- HR Portal & Supply Chain: governance sehat
  await createMeeting({
    momNo: "MOM-2026-0007",
    projectCode: "PRJ-04",
    type: "weekly_status",
    title: "Weekly Status HR Portal",
    startOffset: -10,
    hour: 10,
    status: "APPROVED",
    chair: "pm2",
    secretary: "member",
    signers: [{ key: "pm2", role: "Approved", order: 1 }],
    signedCount: 1,
    attendees: [
      { key: "pm2", role: "CHAIR", acknowledged: true },
      { key: "member", role: "SECRETARY", acknowledged: true },
      { key: "qa", role: "MEMBER", acknowledged: true },
      { key: "dev", role: "MEMBER", acknowledged: false },
    ],
    agenda: [
      { topic: "Progres modul self-service", summary: "Sesuai baseline." },
      { topic: "Rencana user training", summary: "Training dijadwalkan 51 hari lagi." },
    ],
    decisions: [
      { text: "Training pengguna dibagi per departemen", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm2" },
    ],
    actions: [
      { text: "Susun jadwal training per departemen", owner: "member", dueOffset: -4, status: "DONE", completedOffset: -5 },
      { text: "Siapkan materi training self-service", owner: "qa", dueOffset: 8, status: "OPEN" },
    ],
    negativeTone: 0.12,
    summary: "Progres modul self-service sesuai baseline. Rencana training disusun per departemen.",
    snapshot: { spi: 0.97, cpi: 0.99, progress: 40 },
  });

  await createMeeting({
    momNo: "MOM-2026-0008",
    projectCode: "PRJ-03",
    type: "weekly_status",
    title: "Weekly Status Supply Chain Optimization",
    startOffset: -8,
    hour: 15,
    status: "APPROVED",
    chair: "pm",
    secretary: "dev",
    signers: [{ key: "pm", role: "Approved", order: 1 }],
    signedCount: 1,
    attendees: [
      { key: "pm", role: "CHAIR", acknowledged: true },
      { key: "dev", role: "SECRETARY", acknowledged: true },
      { key: "member", role: "MEMBER", acknowledged: true },
      { key: "sponsor", role: "MEMBER", acknowledged: true },
    ],
    agenda: [
      { topic: "Progres Phase 2", summary: "67%, sedikit di atas baseline." },
      { topic: "Konsistensi data stok gudang", summary: "Perlu validasi mingguan." },
    ],
    decisions: [
      { text: "Validasi data stok setiap Senin", impactLevel: "MINOR", status: "FOLLOWED_UP", decidedBy: "pm" },
    ],
    actions: [
      { text: "Buat skrip validasi data stok mingguan", owner: "dev", dueOffset: -2, status: "DONE", completedOffset: -3 },
      { text: "Sosialisasi SOP validasi ke tim gudang", owner: "member", dueOffset: 9, status: "OPEN" },
    ],
    negativeTone: 0.15,
    summary: "Phase 2 berjalan sesuai rencana dengan tambahan kontrol validasi data stok.",
    snapshot: { spi: 1.03, cpi: 1.0, progress: 65 },
  });

  console.log("• membuat issue kronis…");
  const weekly1 = meetingIds.get("MOM-2026-0002")!;
  const weekly2 = meetingIds.get("MOM-2026-0003")!;
  await prisma.issue.createMany({
    data: [
      {
        projectId: projectIds.get("PRJ-01")!,
        title: "Integrasi API vendor belum tersedia",
        impact: "Menahan implementasi modul integrasi dan menggeser go-live",
        occurrences: 4,
        ownerId: user("pm"),
        status: "OPEN",
        sourceMeetingId: weekly1,
        dueDate: addDays(TODAY, -1),
        createdAt: addDays(TODAY, -24),
      },
      {
        projectId: projectIds.get("PRJ-01")!,
        title: "Kesiapan data master belum tervalidasi",
        impact: "Risiko kegagalan UAT dan rework data",
        occurrences: 3,
        ownerId: user("qa"),
        status: "OPEN",
        sourceMeetingId: weekly2,
        dueDate: addDays(TODAY, 2),
        createdAt: addDays(TODAY, -18),
      },
    ],
  });

  // Tautkan risiko yang lahir di rapat ke MOM sumbernya (traceability PMBOK).
  const erpWeekly1 = meetingIds.get("MOM-2026-0002")!;
  const erpCcb = meetingIds.get("MOM-2026-0003")!;
  await prisma.risk.updateMany({
    where: {
      projectId: projectIds.get("PRJ-01")!,
      code: { in: ["PRJ-01-R-01", "PRJ-01-R-02"] },
    },
    data: { sourceMeetingId: erpWeekly1 },
  });
  await prisma.risk.updateMany({
    where: { projectId: projectIds.get("PRJ-01")!, code: "PRJ-01-R-03" },
    data: { sourceMeetingId: erpCcb },
  });
  await prisma.risk.updateMany({
    where: { projectId: projectIds.get("PRJ-02")!, code: "PRJ-02-R-05" },
    data: { sourceMeetingId: meetingIds.get("MOM-2026-0005")! },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        projectId: projectIds.get("PRJ-01")!,
        actorId: user("pm"),
        action: "MOM_SIGNED",
        entity: "SignatureRequest",
        entityId: "seed",
        detail: "MOM-2026-0003 ditandatangani PM dan Sponsor",
        at: addDays(TODAY, -11),
      },
      {
        projectId: projectIds.get("PRJ-01")!,
        actorId: user("sponsor"),
        action: "CHANGE_APPROVED",
        entity: "ChangeRequest",
        entityId: erpChange.id,
        detail: "CR-0003 disetujui; baseline naik ke v2",
        at: addDays(TODAY, -10),
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    activities: await prisma.activity.count(),
    meetings: await prisma.meeting.count(),
    momVersions: await prisma.momVersion.count(),
    signatures: await prisma.signature.count(),
  };
  console.log("✓ seed selesai", counts);
  console.log(`  login demo: pm@pmbok.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
