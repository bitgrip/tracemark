import * as fs from "fs/promises";
import * as path from "path";
import { loadReport } from "../reporter/index.js";
import { generateHTML } from "../visualizer/index.js";

function parseArgs(argv: string[]): { report: string } {
  let report = "";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--report" && argv[i + 1]) {
      report = argv[++i];
    }
  }
  return { report };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.report) {
    console.error(
      "Usage: pnpm run visualize -- --report <path-to-report.json>",
    );
    process.exit(1);
  }

  console.log("🎨 Tracemark - Report Visualization");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const report = await loadReport(args.report);
  const domainNames = report.measurements.map((m) => m.domain.name).join(", ");
  console.log(`Report: ${args.report}`);
  console.log(
    `Domains: ${domainNames} (${report.measurements.length} measurements)`,
  );
  console.log("");

  const html = generateHTML(report);

  const outputPath = args.report.replace(/\.json$/, ".html");
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, html, "utf-8");

  console.log("✅ HTML report generated!");
  console.log(`  → ${outputPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
