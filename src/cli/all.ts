import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Config, DomainInput, DomainResult, URLResult, Report } from '../types/index.js';
import { runURL } from '../scenarios/index.js';
import { generateReport, saveReport, loadReport } from '../reporter/index.js';
import { generateHTML } from '../visualizer/index.js';

function parseArgs(argv: string[]): { config: string; urls: string } {
  let config = 'config.yaml';
  let urls = 'urls/example.yaml';
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) {
      config = argv[++i];
    } else if (argv[i] === '--urls' && argv[i + 1]) {
      urls = argv[++i];
    }
  }
  return { config, urls };
}

async function loadYamlFile<T>(filePath: string, label: string): Promise<T> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    throw new Error(`${label} file not found: "${filePath}". Make sure the file exists.`);
  }
  try {
    return yaml.load(content) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML from "${filePath}": ${message}`);
  }
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
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

async function runAnalysis(args: { config: string; urls: string }): Promise<string[]> {
  console.log('🚀 Tracemark - Performance Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Config: ${args.config}`);
  console.log(`URLs: ${args.urls}`);

  const config = await loadYamlFile<Config>(args.config, 'Config');
  const domainInputs = await loadYamlFile<DomainInput[]>(args.urls, 'URLs');

  console.log(`Scenarios: ${config.scenarios.join(', ')}`);
  console.log(`Warm runs: ${config.warmRuns}`);
  console.log('');

  for (const domain of domainInputs) {
    for (const url of domain.urls) {
      if (!validateUrl(url)) {
        console.warn(`⚠️  Invalid URL "${url}" in domain "${domain.name}", skipping.`);
      }
    }
  }

  const domainResults: DomainResult[] = [];
  const totalDomains = domainInputs.length;
  let totalUrls = 0;

  for (let di = 0; di < totalDomains; di++) {
    const domainInput = domainInputs[di];
    console.log(`📊 Analyzing ${domainInput.name} (${di + 1}/${totalDomains})`);

    const urlResults: URLResult[] = [];
    const domainUrlCount = domainInput.urls.length;

    for (let ui = 0; ui < domainUrlCount; ui++) {
      const url = domainInput.urls[ui];
      totalUrls++;

      if (!validateUrl(url)) {
        urlResults.push({
          url,
          status: 'error',
          error: 'Invalid URL format',
          scenarios: {} as URLResult['scenarios'],
          deltas: { full_vs_noThirdParty: {}, full_vs_noTrackingOnly: {} },
        });
        continue;
      }

      console.log(`  → ${url} (${ui + 1}/${domainUrlCount})`);

      try {
        const urlResult = await runURL(url, config);
        urlResults.push(urlResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Error analyzing ${url}: ${message}`);
        urlResults.push({
          url,
          status: 'error',
          error: message,
          scenarios: {} as URLResult['scenarios'],
          deltas: { full_vs_noThirdParty: {}, full_vs_noTrackingOnly: {} },
        });
      }
    }

    domainResults.push({ name: domainInput.name, urls: urlResults });
  }

  const report = generateReport(domainResults, config);
  const savedPaths = await saveReport(report);

  console.log('');
  console.log('✅ Analysis complete!');
  console.log(`  Domains: ${domainResults.length}`);
  console.log(`  URLs: ${totalUrls}`);
  console.log('  Reports saved to:');
  for (const p of savedPaths) {
    console.log(`    ${p}`);
  }

  return savedPaths;
}

async function runVisualization(reportPaths: string[]): Promise<void> {
  console.log('');
  console.log('🎨 Tracemark - Report Visualization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const reports: Report[] = [];
  for (const filePath of reportPaths) {
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

  const outputPath = reportPaths[0].replace(/\.json$/, '.html');
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, html, 'utf-8');

  console.log('✅ HTML report generated!');
  console.log(`  → ${outputPath}`);
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const args = parseArgs(process.argv);

  const savedPaths = await runAnalysis(args);
  await runVisualization(savedPaths);

  const elapsed = Date.now() - startTime;
  console.log('');
  console.log(`⏱️  Total duration: ${formatDuration(elapsed)}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
