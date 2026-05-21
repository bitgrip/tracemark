import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Config, DomainInput, DomainResult, URLResult, Measurement } from '../types/index.js';
import { runURL } from '../scenarios/index.js';
import { createMeasurement, generateReport, saveMeasurement, saveReport, loadReport } from '../reporter/index.js';
import { generateHTML } from '../visualizer/index.js';
import { Protocol } from '../protocol/index.js';

function parseArgs(argv: string[]): { config: string; urls: string[] } {
  let config = 'config.yaml';
  const urls: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) {
      config = argv[++i];
    } else if (argv[i] === '--urls' && argv[i + 1]) {
      urls.push(argv[++i]);
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



async function resolveUrlFiles(urlArgs: string[]): Promise<string[]> {
  if (urlArgs.length > 0) return urlArgs;
  const entries = await fs.readdir('urls');
  const yamlFiles = entries
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .filter(f => f !== 'README.md')
    .map(f => path.join('urls', f));
  if (yamlFiles.length === 0) throw new Error('No YAML files found in urls/ directory.');
  return yamlFiles;
}

async function runAnalysis(args: { config: string; urls: string[] }): Promise<string> {
  console.log('🚀 Tracemark - Performance Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Config: ${args.config}`);

  const urlFiles = await resolveUrlFiles(args.urls);
  console.log(`URLs: ${urlFiles.join(', ')}`);

  const config = await loadYamlFile<Config>(args.config, 'Config');
  const domainInputs: DomainInput[] = [];
  for (const urlFile of urlFiles) {
    const entries = await loadYamlFile<DomainInput[]>(urlFile, 'URLs');
    domainInputs.push(...entries);
  }

  console.log(`Scenarios: ${config.scenarios.join(', ')}`);
  console.log(`Warm runs: ${config.warmRuns}`);
  console.log(`Lighthouse runs/state: ${config.lighthouse.runs ?? 1}`);
  console.log('');

  // Initialize protocol logger
  const protocol = new Protocol();
  protocol.header();
  protocol.config(config);

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
    protocol.domainStart(domainInput.name, di + 1, totalDomains);

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
      protocol.urlStart(url, ui + 1, domainUrlCount);

      try {
        const urlResult = await runURL(url, config, protocol);
        urlResults.push(urlResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        protocol.error('FATAL', message);
        console.error(`  ❌ Error analyzing ${url}: ${message}`);
        urlResults.push({
          url,
          status: 'error',
          error: message,
          scenarios: {} as URLResult['scenarios'],
          deltas: { full_vs_noThirdParty: {}, full_vs_noTrackingOnly: {} },
        });
      }

      protocol.urlEnd();
    }

    protocol.domainEnd();
    domainResults.push({ name: domainInput.name, urls: urlResults });
  }

  // Save individual measurements per domain
  const measurements: Measurement[] = [];
  for (const domainResult of domainResults) {
    const measurement = createMeasurement(domainResult, config);
    measurements.push(measurement);
    const mPath = await saveMeasurement(measurement);
    console.log(`  Measurement: ${mPath}`);
  }

  // Save aggregated report
  const report = generateReport(measurements);
  const reportPath = await saveReport(report);

  // Save protocol alongside the report
  const reportDir = reportPath.replace(/\/report\.json$/, '');
  const protocolPath = await protocol.save(reportDir);
  console.log(`  Protocol: ${protocolPath}`);

  console.log('');
  console.log('✅ Analysis complete!');
  console.log(`  Domains: ${domainResults.length}`);
  console.log(`  URLs: ${totalUrls}`);
  console.log(`  Report: ${reportPath}`);

  return reportPath;
}

async function runVisualization(reportPath: string): Promise<void> {
  console.log('');
  console.log('🎨 Tracemark - Report Visualization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const report = await loadReport(reportPath);
  const domainNames = report.measurements.map(m => m.domain.name).join(', ');
  console.log(`Report: ${reportPath}`);
  console.log(`Domains: ${domainNames}`);
  console.log('');

  const html = generateHTML(report);

  const outputPath = reportPath.replace(/\.json$/, '.html');
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, html, 'utf-8');

  console.log('✅ HTML report generated!');
  console.log(`  → ${outputPath}`);
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const args = parseArgs(process.argv);

  const reportPath = await runAnalysis(args);
  await runVisualization(reportPath);

  const elapsed = Date.now() - startTime;
  console.log('');
  console.log(`⏱️  Total duration: ${formatDuration(elapsed)}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
