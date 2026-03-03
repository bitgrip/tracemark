import type { Page } from 'playwright';
import type { JavaScriptMetrics, BundleInfo } from '../types/index.js';
import { classifyBundle, isLazyChunk } from '../classifier/bundles.js';

interface CoverageEntry {
  url: string;
  ranges: Array<{ start: number; end: number }>;
  text: string;
}

function computeUsedBytes(entry: CoverageEntry): number {
  let used = 0;
  for (const range of entry.ranges) {
    used += range.end - range.start;
  }
  return used;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function analyzeJavaScript(
  page: Page,
  coverageEntries: CoverageEntry[],
): Promise<JavaScriptMetrics> {
  // Get transfer sizes from performance entries
  const perfMap = await page.evaluate<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    for (const e of navEntries) {
      map[e.name] = e.transferSize;
    }
    const resEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const e of resEntries) {
      if (e.initiatorType === 'script') {
        map[e.name] = e.transferSize;
      }
    }
    return map;
  });

  const bundles: BundleInfo[] = [];
  let totalResourceSize = 0;
  let totalTransferSize = 0;
  let totalUnusedBytes = 0;

  for (const entry of coverageEntries) {
    const resourceSize = entry.text.length;
    const usedBytes = computeUsedBytes(entry);
    const unusedBytes = resourceSize - usedBytes;
    const unusedRatio = resourceSize > 0 ? unusedBytes / resourceSize : 0;
    // Estimate transfer size as ~1/3 of resource size if not in perf entries
    const transferSize = perfMap[entry.url] ?? Math.round(resourceSize / 3);

    totalResourceSize += resourceSize;
    totalTransferSize += transferSize;
    totalUnusedBytes += unusedBytes;

    bundles.push({
      url: entry.url,
      classification: classifyBundle(entry.url),
      resourceSize,
      transferSize,
      unusedBytes,
      unusedRatio: Math.round(unusedRatio * 1000) / 1000,
      isLazy: isLazyChunk(entry.url),
    });
  }

  const sizes = bundles.map((b) => b.resourceSize);
  const lazyCount = bundles.filter((b) => b.isLazy).length;

  return {
    transferSize: totalTransferSize,
    resourceSize: totalResourceSize,
    unusedBytes: totalUnusedBytes,
    unusedRatio: totalResourceSize > 0
      ? Math.round((totalUnusedBytes / totalResourceSize) * 1000) / 1000
      : 0,
    chunks: {
      total: bundles.length,
      initialCount: bundles.length - lazyCount,
      lazyCount,
      medianSize: median(sizes),
      maxSize: sizes.length > 0 ? Math.max(...sizes) : 0,
    },
    bundles,
  };
}
