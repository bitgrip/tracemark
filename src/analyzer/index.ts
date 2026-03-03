import type { Page, Request } from 'playwright';
import type { RunMetrics, HTMLMetrics, JavaScriptMetrics, CSSMetrics, ThirdPartyMetrics } from '../types/index.js';
import { analyzeHTML } from './html.js';
import { analyzeJavaScript } from './javascript.js';
import { analyzeCSS } from './css.js';
import { analyzeThirdParty } from './thirdParty.js';

interface CoverageEntry {
  url: string;
  ranges: Array<{ start: number; end: number }>;
  text: string;
}

function defaultHTML(): HTMLMetrics {
  return {
    transferSize: 0,
    resourceSize: 0,
    isSSR: false,
    hasRSC: false,
    hasNextData: false,
    inlineScripts: { count: 0, totalSize: 0 },
    preloadHints: {},
    prefetchHints: {},
  };
}

function defaultJavaScript(): JavaScriptMetrics {
  return {
    transferSize: 0,
    resourceSize: 0,
    unusedBytes: 0,
    unusedRatio: 0,
    chunks: { total: 0, initialCount: 0, lazyCount: 0, medianSize: 0, maxSize: 0 },
    bundles: [],
  };
}

function defaultCSS(): CSSMetrics {
  return {
    transferSize: 0,
    resourceSize: 0,
    unusedBytes: 0,
    unusedRatio: 0,
    inline: { count: 0, totalSize: 0 },
    frameworkHints: [],
  };
}

function defaultThirdParty(): ThirdPartyMetrics {
  return {
    totalTransferSize: 0,
    totalRequests: 0,
    beacons: 0,
    renderBlockingCount: 0,
    byCategory: {
      cmp: { transferSize: 0, requests: 0, providers: [] },
      tagManager: { transferSize: 0, requests: 0, providers: [] },
      analytics: { transferSize: 0, requests: 0, providers: [] },
      tracking: { transferSize: 0, requests: 0, providers: [] },
      other: { transferSize: 0, requests: 0, providers: [] },
    },
  };
}

export async function analyzePageMetrics(
  page: Page,
  requests: Request[],
  pageUrl: string,
  jsCoverage: CoverageEntry[],
  cssCoverage: CoverageEntry[],
): Promise<RunMetrics> {
  const [html, javascript, css, thirdParty] = await Promise.all([
    analyzeHTML(page).catch((): HTMLMetrics => defaultHTML()),
    analyzeJavaScript(page, jsCoverage).catch((): JavaScriptMetrics => defaultJavaScript()),
    analyzeCSS(page, cssCoverage).catch((): CSSMetrics => defaultCSS()),
    analyzeThirdParty(page, requests, pageUrl).catch((): ThirdPartyMetrics => defaultThirdParty()),
  ]);

  return { html, javascript, css, thirdParty };
}
