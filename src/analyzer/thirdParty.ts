import type { Page, Request } from 'playwright';
import type { ThirdPartyMetrics, ThirdPartyCategoryData, ThirdPartyCategory } from '../types/index.js';
import { classifyThirdParty, isThirdParty } from '../classifier/thirdParty.js';

const BEACON_PATTERNS = [
  /\/collect\b/i,
  /\/tr\b/i,
  /\/pixel/i,
  /\/beacon/i,
  /\/log\b/i,
  /\/event\b/i,
  /\/adsct\b/i,
];

function emptyCategory(): ThirdPartyCategoryData {
  return { transferSize: 0, requests: 0, providers: [] };
}

export async function analyzeThirdParty(
  page: Page,
  requests: Request[],
  pageUrl: string,
): Promise<ThirdPartyMetrics> {
  const byCategory: Record<ThirdPartyCategory, ThirdPartyCategoryData> = {
    cmp: emptyCategory(),
    tagManager: emptyCategory(),
    analytics: emptyCategory(),
    tracking: emptyCategory(),
    other: emptyCategory(),
  };

  // Get transfer sizes from performance resource entries
  const perfMap = await page.evaluate<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const e of entries) {
      map[e.name] = e.transferSize;
    }
    return map;
  });

  let totalTransferSize = 0;
  let totalRequests = 0;
  let beacons = 0;

  // Collect render-blocking third-party script URLs from the DOM
  const blockingScripts = await page.evaluate<string[]>(() => {
    const scripts = document.querySelectorAll('head script[src]');
    const blocking: string[] = [];
    for (const s of scripts) {
      const script = s as HTMLScriptElement;
      if (!script.async && !script.defer && script.getAttribute('type') !== 'module') {
        blocking.push(script.src);
      }
    }
    return blocking;
  });

  const blockingSet = new Set(blockingScripts);
  let renderBlockingCount = 0;

  for (const request of requests) {
    const url = request.url();
    if (!isThirdParty(url, pageUrl)) continue;

    totalRequests++;

    const classification = classifyThirdParty(url);
    const category: ThirdPartyCategory = classification?.category ?? 'other';
    const provider = classification?.provider ?? 'unknown';
    const catData = byCategory[category];

    // Transfer size from perf entries or content-length header
    let transferSize = perfMap[url] ?? 0;
    if (transferSize === 0) {
      try {
        const response = request.response ? await request.response() : null;
        const contentLength = response?.headers()['content-length'];
        if (contentLength) {
          transferSize = parseInt(contentLength, 10) || 0;
        }
      } catch {
        // Response may not be available
      }
    }

    totalTransferSize += transferSize;
    catData.transferSize += transferSize;
    catData.requests++;
    if (!catData.providers.includes(provider)) {
      catData.providers.push(provider);
    }

    // Beacon detection
    const isBeacon = BEACON_PATTERNS.some((p) => p.test(url));
    if (isBeacon) {
      beacons++;
    }

    // Render-blocking detection
    if (request.resourceType() === 'script' && blockingSet.has(url)) {
      renderBlockingCount++;
    }
  }

  return {
    totalTransferSize,
    totalRequests,
    beacons,
    renderBlockingCount,
    byCategory,
  };
}
