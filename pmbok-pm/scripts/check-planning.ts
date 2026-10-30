/**
 * Verifikasi Fase 3: roll-up WBS, kelengkapan dictionary, dan jadwal CPM.
 * Jalankan: npx tsx scripts/check-planning.ts
 */
import { prisma } from "../src/lib/db";
import { getProjectSchedule, getProjectScope } from "../src/lib/pmbok/planning-data";

async function main() {
  const project = await prisma.project.findFirst({ where: { code: "PRJ-01" } });
  if (!project) throw new Error("Data seed tidak ditemukan. Jalankan npm run db:seed.");

  const scope = await getProjectScope(project.id);
  if (!scope) throw new Error("Scope tidak ditemukan.");

  console.log("\n=== SCOPE / WBS ===");
  console.log("proyek:", scope.project.code, scope.project.name);
  console.log("elemen:", scope.stats.elementCount, "| work package:", scope.stats.workPackageCount);
  console.log("roll-up progress:", scope.stats.rootProgress, "% | EV/BAC:", scope.evmPercent, "%");
  console.log(
    "dictionary lengkap:",
    `${scope.stats.dictionaryCompleteCount}/${scope.stats.elementCount}`,
    `(${scope.stats.dictionaryRate}%)`
  );
  console.log(
    "cakupan anggaran:",
    scope.stats.mappedBudget,
    "dari BAC",
    scope.project.bac,
    "| aktivitas tanpa WBS:",
    scope.stats.unmappedActivityCount
  );
  console.log("\nwork package:");
  for (const node of scope.leafNodes) {
    console.log(
      `  ${node.code.padEnd(5)} ${node.name.padEnd(30).slice(0, 30)} bobot ${String(node.share).padStart(5)}% ` +
        `progress ${String(node.progress).padStart(5)}% budget ${node.budget}`
    );
  }

  const schedule = await getProjectSchedule(project.id);
  if (!schedule) throw new Error("Schedule tidak ditemukan.");
  const plan = schedule.plan;

  console.log("\n=== SCHEDULE / CPM ===");
  console.log(
    "durasi jaringan:",
    plan.durationDays,
    "hari | selesai:",
    plan.finish.toISOString().slice(0, 10),
    "| baseline:",
    plan.baselineFinish.toISOString().slice(0, 10),
    "| selisih:",
    plan.finishVarianceDays,
    "hari"
  );
  console.log("relasi:", plan.dependencyCount, "| aktivitas kritis:", plan.criticalCount, "/", schedule.rows.length);
  console.log("aktivitas terlambat:", plan.lateCount, "| siklus:", plan.cycles.length);

  console.log("\naktivitas (ES/EF/float):");
  for (const row of schedule.rows) {
    console.log(
      `  ${row.wbsCode.padEnd(5)} ${row.name.padEnd(30).slice(0, 30)} ` +
        `${String(row.durationDays).padStart(3)}h ES ${String(row.es).padStart(3)} EF ${String(row.ef).padStart(3)} ` +
        `float ${String(row.totalFloat).padStart(4)} ${row.critical ? "KRITIS" : ""}`
    );
  }

  console.log("\ndependensi:");
  for (const dependency of schedule.dependencies) {
    console.log(
      `  ${dependency.predCode} ${dependency.predName} -> ${dependency.succCode} ${dependency.succName} ` +
        `[${dependency.type}${dependency.lagDays !== 0 ? ` ${dependency.lagDays}h` : ""}]`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
