import { chromium } from 'playwright';
import type { Request } from 'playwright';
import type {
  Config, Scenario, RunMetrics, PlaywrightScenarioResult,
  ScenarioResult, URLResult, DeltaMetrics, LighthouseScenarioResult,
} from '../types/index.js';
import { analyzePageMetrics } from '../analyzer/index.js';
import { runLighthouse } from '../lighthouse/index.js';

interface SimpleCoverageEntry {
  url: string;
  ranges: Array<{ start: number; end: number }>;
  text: string;
}

interface V8CoverageEntry {
  url: string;
  scriptId: string;
  source?: string;
  functions: Array<{
    functionName: string;
    isBlockCoverage: boolean;
    ranges: Array<{ count: number; startOffset: number; endOffset: number }>;
  }>;
}

function convertJsCoverage(entries: V8CoverageEntry[]): SimpleCoverageEntry[] {
  return entries.map(entry => {
    const text = entry.source ?? '';
    const ranges: Array<{ start: number; end: number }> = [];
    for (const fn of entry.functions) {
      for (const range of fn.ranges) {
        if (range.count > 0) {
          ranges.push({ start: range.startOffset, end: range.endOffset });
        }
      }
    }
    return { url: entry.url, ranges, text };
  });
}

// --- Helpers ---

export function shouldBlockRequest(requestUrl: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^(https?://)?(.*\\.)?${escaped}(/.*)?$`, 'i');
    if (regex.test(requestUrl)) return true;
  }
  return false;
}

function getBlockPatterns(scenario: Scenario, config: Config): string[] {
  switch (scenario) {
    case 'full':
      return [];
    case 'no-third-party':
      return config.blocklists.thirdParty;
    case 'no-tracking-only':
      return config.blocklists.trackingOnly;
  }
}

function avgNumericFields(objs: Record<string, unknown>[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const first = objs[0];
  for (const key of Object.keys(first)) {
    const vals = objs.map(o => o[key]);
    if (typeof vals[0] === 'number') {
      result[key] = vals.reduce((s: number, v) => s + (v as number), 0) / vals.length;
    }
  }
  return result;
}

export function averageRunMetrics(runs: RunMetrics[]): Partial<RunMetrics> {
  if (runs.length === 0) return {};

  const result = {
    html: avgNumericFields(runs.map(r => r.html) as unknown as Record<string, unknown>[]),
    javascript: avgNumericFields(runs.map(r => r.javascript) as unknown as Record<string, unknown>[]),
    css: avgNumericFields(runs.map(r => r.css) as unknown as Record<string, unknown>[]),
    thirdParty: avgNumericFields(runs.map(r => r.thirdParty) as unknown as Record<string, unknown>[]),
  };
  return result as unknown as Partial<RunMetrics>;
}

export function calculateDeltas(scenarios: Record<Scenario, ScenarioResult>): URLResult['deltas'] {
  const computeDelta = (full: ScenarioResult, other: ScenarioResult): DeltaMetrics => {
    const delta: DeltaMetrics = {};

    const fJs = full.playwright.cold.javascript;
    const oJs = other.playwright.cold.javascript;
    delta.javascript = {
      transferSize: fJs.transferSize - oJs.transferSize,
    };

    const fTp = full.playwright.cold.thirdParty;
    const oTp = other.playwright.cold.thirdParty;
    delta.thirdParty = {
      totalTransferSize: fTp.totalTransferSize - oTp.totalTransferSize,
      totalRequests: fTp.totalRequests - oTp.totalRequests,
    };

    const fLh = full.lighthouse.cold;
    const oLh = other.lighthouse.cold;
    const lhDelta: Record<string, number> = {};
    for (const key of Object.keys(fLh.audits)) {
      lhDelta[key] = fLh.audits[key].numericValue - (oLh.audits[key]?.numericValue ?? 0);
    }
    lhDelta['performanceScore'] = fLh.performanceScore - oLh.performanceScore;
    delta.lighthouse = { cold: lhDelta };

    return delta;
  };

  const full = scenarios['full'];
  return {
    full_vs_noThirdParty: full && scenarios['no-third-party']
      ? computeDelta(full, scenarios['no-third-party'])
      : {},
    full_vs_noTrackingOnly: full && scenarios['no-tracking-only']
      ? computeDelta(full, scenarios['no-tracking-only'])
      : {},
  };
}

// --- Core ---

export async function runScenario(url: string, scenario: Scenario, config: Config): Promise<PlaywrightScenarioResult> {
  const blockPatterns = getBlockPatterns(scenario, config);
  const browser = await chromium.launch({ headless: config.headless });

  try {
    // --- Cold run ---
    console.log(`  [Playwright] ${scenario} cold run...`);
    const coldContext = await browser.newContext();
    const coldPage = await coldContext.newPage();

    if (blockPatterns.length > 0) {
      await coldPage.route('**/*', (route) => {
        if (shouldBlockRequest(route.request().url(), blockPatterns)) {
          return route.abort();
        }
        return route.continue();
      });
    }

    const coldRequests: Request[] = [];
    coldPage.on('request', (req) => coldRequests.push(req));

    await coldPage.coverage.startJSCoverage();
    await coldPage.coverage.startCSSCoverage();
    await coldPage.goto(url, { waitUntil: 'networkidle', timeout: config.timeout });

    const jsCoverageRaw = await coldPage.coverage.stopJSCoverage();
    const cssCoverage = await coldPage.coverage.stopCSSCoverage();

    const jsCoverage = convertJsCoverage(jsCoverageRaw as unknown as V8CoverageEntry[]);
    const cold = await analyzePageMetrics(
      coldPage, coldRequests, url,
      jsCoverage as Parameters<typeof analyzePageMetrics>[3],
      cssCoverage as Parameters<typeof analyzePageMetrics>[4],
    );
    await coldContext.close();

    // --- Warm runs ---
    const warmContext = await browser.newContext();
    const warmRuns: RunMetrics[] = [];

    for (let i = 0; i < config.warmRuns; i++) {
      console.log(`  [Playwright] ${scenario} warm run ${i + 1}/${config.warmRuns}...`);

      if (i > 0) {
        await new Promise(r => setTimeout(r, config.waitBetweenRuns));
      }

      const warmPage = await warmContext.newPage();

      if (blockPatterns.length > 0) {
        await warmPage.route('**/*', (route) => {
          if (shouldBlockRequest(route.request().url(), blockPatterns)) {
            return route.abort();
          }
          return route.continue();
        });
      }

      const warmRequests: Request[] = [];
      warmPage.on('request', (req) => warmRequests.push(req));

      await warmPage.goto(url, { waitUntil: 'networkidle', timeout: config.timeout });

      const metrics = await analyzePageMetrics(warmPage, warmRequests, url, [], []);
      warmRuns.push(metrics);
      await warmPage.close();
    }

    await warmContext.close();

    const warmAvg = averageRunMetrics(warmRuns);

    return { cold, warmRuns, warmAvg };
  } finally {
    await browser.close();
  }
}

export async function runURL(url: string, config: Config): Promise<URLResult> {
  console.log(`\n=== ${url} ===`);

  const scenarios = {} as Record<Scenario, ScenarioResult>;

  try {
    for (const scenario of config.scenarios) {
      console.log(`\n--- Scenario: ${scenario} ---`);

      let playwright: PlaywrightScenarioResult;
      try {
        playwright = await runScenario(url, scenario, config);
      } catch (err) {
        console.error(`  Playwright error for ${scenario}: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }

      let lighthouse: LighthouseScenarioResult;
      if (config.lighthouse.enabled) {
        try {
          lighthouse = await runLighthouse(url, scenario, config);
        } catch (err) {
          console.error(`  Lighthouse error for ${scenario}: ${err instanceof Error ? err.message : String(err)}`);
          lighthouse = {
            cold: { performanceScore: 0, audits: {} },
            warm: { performanceScore: 0, audits: {} },
          };
        }
      } else {
        lighthouse = {
          cold: { performanceScore: 0, audits: {} },
          warm: { performanceScore: 0, audits: {} },
        };
      }

      scenarios[scenario] = { playwright, lighthouse };
    }

    const deltas = calculateDeltas(scenarios);

    return { url, status: 'ok', scenarios, deltas };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error processing ${url}: ${message}`);
    return {
      url,
      status: 'error',
      error: message,
      scenarios,
      deltas: { full_vs_noThirdParty: {}, full_vs_noTrackingOnly: {} },
    };
  }
}
