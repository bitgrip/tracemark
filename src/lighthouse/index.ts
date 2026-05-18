import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config, Scenario, LighthouseScenarioResult, LighthouseResult, LighthouseAudit } from '../types/index.js';
import { LIGHTHOUSE_AUDITS } from './audits.js';
import { THROTTLE_PROFILES } from '../scenarios/index.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIGHTHOUSE_BIN = path.resolve(__dirname, '../../node_modules/.bin/lighthouse');

function getBlockedPatterns(scenario: Scenario, config: Config): string[] {
  switch (scenario) {
    case 'full':
      return [];
    case 'no-third-party':
      return config.blocklists.thirdParty;
    case 'no-tracking-only':
      return config.blocklists.trackingOnly;
  }
}

function defaultLighthouseResult(): LighthouseResult {
  const audits: Record<string, LighthouseAudit> = {};
  for (const id of LIGHTHOUSE_AUDITS) {
    audits[id] = { numericValue: 0 };
  }
  return { performanceScore: 0, audits };
}

function averageLighthouseResults(results: LighthouseResult[]): LighthouseResult {
  if (results.length === 0) {
    return defaultLighthouseResult();
  }

  const audits: Record<string, LighthouseAudit> = {};
  for (const id of LIGHTHOUSE_AUDITS) {
    const total = results.reduce((sum, result) => sum + (result.audits[id]?.numericValue ?? 0), 0);
    audits[id] = { numericValue: total / results.length };
  }

  const performanceScore = results.reduce((sum, result) => sum + result.performanceScore, 0) / results.length;
  return { performanceScore, audits };
}

export function extractLighthouseResult(lhr: Record<string, unknown>): LighthouseResult {
  const categories = lhr['categories'] as Record<string, { score?: number }> | undefined;
  const performanceScore = categories?.['performance']?.score ?? 0;

  const lhrAudits = lhr['audits'] as Record<string, { numericValue?: number; displayValue?: string; score?: number }> | undefined;
  const audits: Record<string, LighthouseAudit> = {};

  // Ensure all core audits are present (default to 0 if missing)
  for (const id of LIGHTHOUSE_AUDITS) {
    const audit = lhrAudits?.[id];
    if (audit) {
      audits[id] = {
        numericValue: audit.numericValue ?? 0,
        ...(audit.displayValue ? { displayValue: audit.displayValue } : {}),
      };
    } else {
      audits[id] = { numericValue: 0 };
    }
  }

  // Capture all remaining audits that have a numericValue (optimization opportunities, diagnostics)
  if (lhrAudits) {
    for (const [id, audit] of Object.entries(lhrAudits)) {
      if (audits[id]) continue; // already captured above
      if (audit.numericValue != null) {
        audits[id] = {
          numericValue: audit.numericValue,
          ...(audit.displayValue ? { displayValue: audit.displayValue } : {}),
        };
      }
    }
  }

  return { performanceScore, audits };
}

async function runLighthouseCLI(url: string, blockedPatterns: string[], flags: string[]): Promise<LighthouseResult> {
  const args = [
    url,
    '--output=json',
    '--quiet',
    '--only-categories=performance',
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
    ...flags,
  ];

  for (const pattern of blockedPatterns) {
    args.push(`--blocked-url-patterns=${pattern}`);
  }

  try {
    const { stdout } = await execFileAsync(LIGHTHOUSE_BIN, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    const lhr = JSON.parse(stdout) as Record<string, unknown>;
    return extractLighthouseResult(lhr);
  } catch (err) {
    console.error(`  Lighthouse CLI error: ${err instanceof Error ? err.message : String(err)}`);
    return defaultLighthouseResult();
  }
}

export async function runLighthouse(url: string, scenario: Scenario, config: Config): Promise<LighthouseScenarioResult> {
  const blockedPatterns = getBlockedPatterns(scenario, config);
  const extraFlags = config.lighthouse.flags.filter(f => !f.startsWith('--chrome-flags'));
  const runs = Math.max(config.lighthouse.runs ?? 1, 1);

  if (config.network?.throttle) {
    const profile = THROTTLE_PROFILES[config.network.profile];
    const throughputKbps = Math.round(profile.downloadThroughput * 8 / 1000);
    extraFlags.push(
      '--throttling-method=devtools',
      `--throttling.throughputKbps=${throughputKbps}`,
      `--throttling.rttMs=${profile.latency}`,
      `--throttling.downloadThroughputKbps=${throughputKbps}`,
      `--throttling.uploadThroughputKbps=${Math.round(profile.uploadThroughput * 8 / 1000)}`,
    );
  }

  const coldRuns: LighthouseResult[] = [];
  for (let i = 0; i < runs; i++) {
    console.log(`  [Lighthouse] ${scenario} cold run ${i + 1}/${runs}...`);
    coldRuns.push(await runLighthouseCLI(url, blockedPatterns, extraFlags));
  }

  const warmRuns: LighthouseResult[] = [];
  for (let i = 0; i < runs; i++) {
    console.log(`  [Lighthouse] ${scenario} warm run ${i + 1}/${runs}...`);
    warmRuns.push(await runLighthouseCLI(url, blockedPatterns, extraFlags));
  }

  return {
    cold: averageLighthouseResults(coldRuns),
    warm: averageLighthouseResults(warmRuns),
    coldRuns,
    warmRuns,
  };
}
