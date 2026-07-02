import {
  loadMeasurement,
  generateReport,
  saveReport,
} from "../reporter/index.js";
import { generateHTML } from "../visualizer/index.js";
import * as fs from "fs/promises";
import * as path from "path";

async function main(): Promise<void> {
  const measurementPaths = process.argv.slice(2);
  if (measurementPaths.length === 0) {
    console.error(
      "Usage: tsx src/cli/report-from-measurements.ts <measurement1.json> [measurement2.json] ...",
    );
    process.exit(1);
  }

  console.log("📊 Generating report from measurements...");
  const measurements = [];
  for (const p of measurementPaths) {
    const m = await loadMeasurement(p);
    console.log(`  ✓ ${m.domain.name} (${p})`);
    measurements.push(m);
  }

  const report = generateReport(measurements);
  const reportPath = await saveReport(report);
  console.log(`\n✅ Report saved: ${reportPath}`);

  const html = generateHTML(report);
  const htmlPath = reportPath.replace(/\.json$/, ".html");
  const outputDir = path.dirname(htmlPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(htmlPath, html, "utf-8");
  console.log(`✅ HTML report: ${htmlPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
