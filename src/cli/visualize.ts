import * as fs from 'fs/promises';
import * as path from 'path';
import type { Report } from '../types/index.js';
import { loadReport } from '../reporter/index.js';
import { generateHTML } from '../visualizer/index.js';

function parseArgs(argv: string[]): { reports: string[] } {
  const reports: string[] = [];
  let i = 2;
  while (i < argv.length) {
    if (argv[i] === '--reports') {
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        reports.push(argv[i]);
        i++;
      }
    } else {
      i++;
    }
  }
  return { reports };
}

function mergeReports(reports: Report[]): Report {
  const base = reports[0];
  if (reports.length === 1) return base;

  const allDomains = reports.flatMap(r => r.domains);
  return {
    meta: base.meta,
    domains: allDomains,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.reports.length === 0) {
    console.error('Usage: pnpm run visualize -- --reports <path1> [path2] [path3]');
    process.exit(1);
  }

  console.log('🎨 Tracemark - Report Visualization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const reports: Report[] = [];
  for (const filePath of args.reports) {
    try {
      const report = await loadReport(filePath);
      reports.push(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${message}`);
      process.exit(1);
    }
  }

  console.log(`Reports: ${reports.length} file${reports.length > 1 ? 's' : ''} loaded`);

  const merged = mergeReports(reports);
  const domainNames = merged.domains.map(d => d.name).join(', ');
  console.log(`Domains: ${domainNames}`);
  console.log('');

  const html = generateHTML(merged);

  const outputPath = args.reports[0].replace(/\.json$/, '.html');
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, html, 'utf-8');

  console.log('✅ HTML report generated!');
  console.log(`  → ${outputPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
