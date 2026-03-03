import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config, Scenario, LighthouseScenarioResult, LighthouseResult, LighthouseAudit } from '../types/index.js';
import { LIGHTHOUSE_AUDITS } from './audits.js';

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

export function extractLighthouseResult(lhr: Record<string, unknown>): LighthouseResult {
  const categories = lhr['categories'] as Record<string, { score?: number }> | undefined;
  const performanceScore = categories?.['performance']?.score ?? 0;

  const lhrAudits = lhr['audits'] as Record<string, { numericValue?: number; displayValue?: string }> | undefined;
  const audits: Record<string, LighthouseAudit> = {};

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

  console.log(`  [Lighthouse] ${scenario} cold run...`);
  const cold = await runLighthouseCLI(url, blockedPatterns, extraFlags);

  console.log(`  [Lighthouse] ${scenario} warm run...`);
  const warm = await runLighthouseCLI(url, blockedPatterns, extraFlags);

  return { cold, warm };
}
