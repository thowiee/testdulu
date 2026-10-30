import assert from "node:assert/strict";
import test from "node:test";
import { computeCriticalPath, computeEvm, earnedValueAt, plannedValueAt } from "./evm";
import { combineHealth, evmHealth, worseOf } from "./health";
import { computeMomHealth, type MomHealthInput } from "./mom";
import { activityDurationDays, deriveActivityStatus } from "./activity";
import { computeSchedule } from "./schedule";
import { buildWbsTree, type ScopeActivity, type ScopeElement } from "./wbs";

const DAY = 86_400_000;
const today = new Date(Date.UTC(2026, 9, 29));

function daysAgo(days: number): Date {
  return new Date(today.getTime() - days * DAY);
}

test("plannedValueAt linear dan dijepit pada batas", () => {
  const activity = {
    budget: 100,
    startBaseline: daysAgo(10),
    finishBaseline: new Date(today.getTime() + 10 * DAY),
  };
  assert.equal(plannedValueAt(activity, daysAgo(20)), 0);
  assert.equal(plannedValueAt(activity, new Date(today.getTime() + 20 * DAY)), 100);
  assert.equal(plannedValueAt(activity, today), 50);
});

test("earnedValueAt memakai persentase fisik", () => {
  assert.equal(earnedValueAt({ budget: 1_000, percentComplete: 76 }), 760);
});

test("computeEvm menghasilkan SPI, CPI, EAC, VAC, TCPI", () => {
  const evm = computeEvm({ bac: 1_000, pv: 800, ev: 900, ac: 1_000 });
  assert.equal(evm.spi, 1.125);
  assert.equal(evm.cpi, 0.9);
  assert.equal(evm.sv, 100);
  assert.equal(evm.cv, -100);
  assert.equal(evm.eac, 1111);
  assert.equal(evm.vac, -111);
  assert.equal(evm.percentComplete, 90);
});

test("evmHealth memberi Critical saat indeks di bawah 0,85", () => {
  const evm = computeEvm({ bac: 1_000, pv: 1_000, ev: 830, ac: 1_000 });
  const health = evmHealth({ evm, openHighRisks: 0, maxMilestoneSlipDays: 0 });
  assert.equal(health.level, "CRITICAL");
  assert.ok(health.reasons.length > 0);
});

test("evmHealth memberi At Risk saat milestone bergeser", () => {
  const evm = computeEvm({ bac: 1_000, pv: 700, ev: 730, ac: 720 });
  const health = evmHealth({ evm, openHighRisks: 0, maxMilestoneSlipDays: 9 });
  assert.equal(health.level, "AT_RISK");
});

test("sinyal MOM tidak boleh menaikkan EVM yang buruk", () => {
  const evm = computeEvm({ bac: 1_000, pv: 1_000, ev: 880, ac: 960 });
  const evmLevel = evmHealth({ evm, openHighRisks: 0, maxMilestoneSlipDays: 0 }).level;
  assert.equal(evmLevel, "AT_RISK");

  const combined = combineHealth({
    evmLevel,
    evmReasons: [],
    momIndex: 95,
    momReasons: [],
    hardSignals: [],
  });
  assert.equal(combined.level, "AT_RISK");
  assert.equal(combined.verdict, "Berisiko");
});

test("sinyal keras dan MOM rendah menurunkan status ke Tidak lancar", () => {
  const combined = combineHealth({
    evmLevel: "ON_TRACK",
    evmReasons: ["SPI 1,02"],
    momIndex: 56,
    momReasons: ["Disiplin action item rendah"],
    hardSignals: [
      { code: "OVERDUE_ACTIONS", label: "3 action item terlambat lebih dari 14 hari" },
      { code: "CHRONIC_ISSUE", label: "Isu integrasi API muncul di 4 rapat" },
    ],
  });
  assert.equal(combined.level, "CRITICAL");
  assert.equal(combined.verdict, "Tidak lancar");
});

test("worseOf memilih level terburuk", () => {
  assert.equal(worseOf("ON_TRACK", "AT_RISK"), "AT_RISK");
  assert.equal(worseOf("EXCELLENT", "NEEDS_ATTENTION"), "NEEDS_ATTENTION");
});

test("computeMomHealth menghitung komponen dan sinyal keras", () => {
  const input: MomHealthInput = {
    approvedMeetingCount: 3,
    actions: [
      { text: "a1", status: "DONE", dueDate: daysAgo(10), completedAt: daysAgo(12) },
      { text: "a2", status: "DONE", dueDate: daysAgo(10), completedAt: daysAgo(2) },
      { text: "a3", status: "OPEN", dueDate: daysAgo(20), completedAt: null },
      { text: "a4", status: "OPEN", dueDate: daysAgo(19), completedAt: null },
      { text: "a5", status: "OPEN", dueDate: daysAgo(18), completedAt: null },
    ],
    decisions: [
      { text: "d1", impactLevel: "MAJOR", status: "OPEN", createdAt: daysAgo(20), hasChange: false },
      { text: "d2", impactLevel: "MINOR", status: "FOLLOWED_UP", createdAt: daysAgo(20), hasChange: false },
    ],
    risks: [
      { title: "r1", score: 20, status: "OPEN", createdAt: daysAgo(5) },
      { title: "r2", score: 16, status: "OPEN", createdAt: daysAgo(9) },
    ],
    issues: [{ title: "Integrasi API", occurrences: 4, status: "OPEN" }],
    engagement: { quorumRate: 0.9, sponsorAttendanceRate: 0.5, ackRate: 0.8 },
    negativeTone: 0.35,
    unsigned: [{ momNo: "MOM-X", title: "Gate review", daysWaiting: 5 }],
    today,
  };

  const result = computeMomHealth(input);
  const codes = result.hardSignals.map((signal) => signal.code);

  assert.ok(result.index < 70, `index ${result.index} harus di bawah 70`);
  assert.ok(codes.includes("OVERDUE_ACTIONS"));
  assert.ok(codes.includes("DECISION_NO_CHANGE"));
  assert.ok(codes.includes("CHRONIC_ISSUE"));
  assert.ok(codes.includes("UNSIGNED_MOM"));
  assert.equal(result.components.length, 5);
  assert.ok(Math.abs(result.components.reduce((sum, item) => sum + item.weight, 0) - 1) < 1e-9);
});

test("computeCriticalPath menemukan jalur kritis", () => {
  const result = computeCriticalPath([
    { id: "A", durationDays: 5, predecessors: [] },
    { id: "B", durationDays: 3, predecessors: [{ predId: "A", type: "FS", lagDays: 0 }] },
    { id: "C", durationDays: 1, predecessors: [] },
  ]);
  assert.equal(result.get("A")?.critical, true);
  assert.equal(result.get("B")?.critical, true);
  assert.equal(result.get("C")?.critical, false);
  assert.equal(result.get("B")?.es, 5);
});

test("roll-up WBS berbobot mengabaikan anak berbobot nol", () => {
  const date = new Date(Date.UTC(2026, 0, 1));
  const dictionary = {
    description: "deskripsi",
    acceptanceCriteria: "kriteria",
    responsible: "PM",
  };
  const elements: ScopeElement[] = [
    { id: "root", parentId: null, code: "1", name: "Root", kind: "DELIVERABLE", weight: 100, ...dictionary },
    { id: "a", parentId: "root", code: "1.1", name: "A", kind: "WORK_PACKAGE", weight: 30, ...dictionary },
    { id: "b", parentId: "root", code: "1.2", name: "B", kind: "WORK_PACKAGE", weight: 70, ...dictionary },
    { id: "g", parentId: "root", code: "1.3", name: "Governance", kind: "WORK_PACKAGE", weight: 0, ...dictionary },
  ];
  const activity = (
    id: string,
    wbsId: string | null,
    budget: number,
    percentComplete: number
  ): ScopeActivity => ({
    id,
    wbsId,
    name: id,
    budget,
    percentComplete,
    status: "ONGOING",
    durationDays: 5,
    startBaseline: date,
    finishBaseline: date,
  });

  const tree = buildWbsTree(elements, [
    activity("a1", "a", 100, 100),
    activity("b1", "b", 300, 0),
    activity("g1", "g", 0, 100),
    activity("x1", null, 50, 50),
  ]);

  const root = tree.byId.get("root")!;
  assert.equal(root.progress, 30);
  assert.equal(root.activityCount, 3);
  assert.equal(tree.stats.unmappedActivityCount, 1);
  assert.equal(tree.stats.dictionaryRate, 100);
  assert.equal(tree.stats.emptyLeafCount, 0);
});

test("CPM menghormati relasi SS dan FF beserta lag", () => {
  const result = computeSchedule(
    [
      { id: "A", durationDays: 5 },
      { id: "B", durationDays: 3 },
      { id: "C", durationDays: 4 },
    ],
    [
      { predId: "A", succId: "B", type: "SS", lagDays: 2 },
      { predId: "B", succId: "C", type: "FF", lagDays: 1 },
    ]
  );

  assert.equal(result.nodes.get("B")?.es, 2);
  assert.equal(result.nodes.get("B")?.ef, 5);
  assert.equal(result.nodes.get("C")?.es, 2);
  assert.equal(result.nodes.get("C")?.ef, 6);
  assert.equal(result.durationDays, 6);
  assert.equal(result.nodes.get("C")?.critical, true);
});

test("CPM mendeteksi siklus dan mengabaikannya", () => {
  const result = computeSchedule(
    [
      { id: "A", durationDays: 2 },
      { id: "B", durationDays: 2 },
    ],
    [
      { predId: "A", succId: "B", type: "FS", lagDays: 0 },
      { predId: "B", succId: "A", type: "FS", lagDays: 0 },
    ]
  );

  assert.ok(result.cycles.length > 0);
  assert.ok(result.ignoredDependencies >= 1);
});

test("status aktivitas diturunkan dari progress", () => {
  assert.equal(deriveActivityStatus(0), "TODO");
  assert.equal(deriveActivityStatus(37.5), "ONGOING");
  assert.equal(deriveActivityStatus(100), "DONE");
  assert.equal(deriveActivityStatus(140), "DONE");
});

test("durasi aktivitas diturunkan dari tanggal dan tidak negatif", () => {
  assert.equal(
    activityDurationDays(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 0, 11))),
    10
  );
  assert.equal(
    activityDurationDays(new Date(Date.UTC(2026, 0, 11)), new Date(Date.UTC(2026, 0, 1))),
    0
  );
});
