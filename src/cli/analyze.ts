import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import type { Config, DomainInput, DomainResult, URLResult } from '../types/index.js';
import { runURL } from '../scenarios/index.js';
import { generateReport, saveReport } from '../reporter/index.js';

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

async function main(): Promise<void> {
  const startTime = Date.now();
  const args = parseArgs(process.argv);

  console.log('🚀 Tracemark - Performance Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Config: ${args.config}`);
  console.log(`URLs: ${args.urls}`);

  const config = await loadYamlFile<Config>(args.config, 'Config');
  const domainInputs = await loadYamlFile<DomainInput[]>(args.urls, 'URLs');

  console.log(`Scenarios: ${config.scenarios.join(', ')}`);
  console.log(`Warm runs: ${config.warmRuns}`);
  console.log('');

  // Validate URL inputs
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

  const elapsed = Date.now() - startTime;
  console.log('');
  console.log('✅ Analysis complete!');
  console.log(`  Domains: ${domainResults.length}`);
  console.log(`  URLs: ${totalUrls}`);
  console.log(`  Duration: ${formatDuration(elapsed)}`);
  console.log('  Reports saved to:');
  for (const p of savedPaths) {
    console.log(`    ${p}`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Fatal error: ${message}`);
  process.exit(1);
});
