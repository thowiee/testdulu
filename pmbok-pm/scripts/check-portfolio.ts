/**
 * Skrip verifikasi: cetak angka portofolio hasil perhitungan mesin.
 * Jalankan: npm run check
 */
import { getPortfolioSnapshot } from "../src/lib/pmbok/project-data";
import { prisma } from "../src/lib/db";

async function main() {
  const snapshot = await getPortfolioSnapshot();

  console.log("\n=== KPI PORTOFOLIO ===");
  console.log(snapshot.kpi);
  console.log("health index:", snapshot.healthIndex, "| rata-rata SPI:", snapshot.evmAverage, "| MOM:", snapshot.momAverage);
  console.log("MOM belum disahkan:", snapshot.unsignedMom);

  console.log("\n=== PROYEK ===");
  for (const project of snapshot.projects) {
    console.log(
      [
        project.code,
        project.name.padEnd(28).slice(0, 28),
        project.department.padEnd(11),
        project.health.level.padEnd(15),
        project.health.verdict.padEnd(22),
        `score ${project.health.score}`.padEnd(11),
        `EV ${project.evm.percentComplete}%`.padEnd(10),
        `PV ${project.evm.percentPlanned}%`.padEnd(10),
        `SPI ${project.evm.spi}`.padEnd(9),
        `CPI ${project.evm.cpi}`.padEnd(9),
        project.mom ? `MOM ${project.mom.index}` : "MOM -",
      ].join(" | ")
    );
  }

  console.log("\n=== HIGHLIGHTS ===");
  for (const highlight of snapshot.highlights) console.log("-", highlight);

  console.log("\n=== PERINGATAN DINI ===");
  console.log(snapshot.earlyWarnings);

  console.log("\n=== MILESTONE TERDEKAT ===");
  for (const milestone of snapshot.milestones) {
    console.log(`- ${milestone.date.slice(0, 10)} ${milestone.name} (${milestone.projectCode}) slip ${milestone.slipDays}h`);
  }

  const erp = snapshot.projects.find((project) => project.code === "PRJ-01");
  if (erp?.mom) {
    console.log("\n=== RINCIAN MOM ERP ===");
    console.log("index:", erp.mom.index);
    for (const component of erp.mom.components) {
      console.log(`- ${component.label.padEnd(24)} ${String(component.score).padStart(5)} (bobot ${component.weight}) — ${component.detail}`);
    }
    console.log("sinyal keras:");
    for (const signal of erp.mom.hardSignals) console.log("  •", signal.label);
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
