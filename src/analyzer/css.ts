import type { Page } from 'playwright';
import type { CSSMetrics, CSSFrameworkHint } from '../types/index.js';

interface CoverageEntry {
  url: string;
  ranges: Array<{ start: number; end: number }>;
  text: string;
}

interface InlineStyleInfo {
  count: number;
  totalSize: number;
}

interface FrameworkSignals {
  tailwindMatches: number;
  totalClasses: number;
  scPrefixCount: number;
  dynamicStyleTags: number;
  modulePatternCount: number;
}

function computeUsedBytes(entry: CoverageEntry): number {
  let used = 0;
  for (const range of entry.ranges) {
    used += range.end - range.start;
  }
  return used;
}

export async function analyzeCSS(
  page: Page,
  coverageEntries: CoverageEntry[],
): Promise<CSSMetrics> {
  // Get transfer sizes from performance entries
  const perfMap = await page.evaluate<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    const resEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const e of resEntries) {
      if (e.initiatorType === 'link' || e.initiatorType === 'css') {
        map[e.name] = e.transferSize;
      }
    }
    return map;
  });

  let totalResourceSize = 0;
  let totalTransferSize = 0;
  let totalUnusedBytes = 0;

  for (const entry of coverageEntries) {
    const resourceSize = entry.text.length;
    const usedBytes = computeUsedBytes(entry);
    totalResourceSize += resourceSize;
    totalTransferSize += perfMap[entry.url] ?? Math.round(resourceSize / 3);
    totalUnusedBytes += resourceSize - usedBytes;
  }

  const [inlineStyles, frameworkSignals] = await Promise.all([
    page.evaluate<InlineStyleInfo>(() => {
      const styles = Array.from(document.querySelectorAll('style'));
      let totalSize = 0;
      for (const s of styles) {
        totalSize += (s.textContent ?? '').length;
      }
      return { count: styles.length, totalSize };
    }),
    page.evaluate<FrameworkSignals>(() => {
      const TAILWIND_RE =
        /\b(flex|grid|block|inline|hidden|static|fixed|absolute|relative|sticky|m[trblxy]?-\d|p[trblxy]?-\d|text-(xs|sm|base|lg|xl|\d?xl)|font-(thin|light|normal|medium|semibold|bold|extrabold|black)|bg-|border-|rounded|shadow|w-|h-|min-|max-|gap-|space-|overflow-|z-|opacity-|transition|duration-|ease-|animate-|cursor-|select-|placeholder-|ring-|divide-|sr-only|not-sr-only)\b/;

      const allElements = document.querySelectorAll('[class]');
      let tailwindMatches = 0;
      let totalClasses = 0;
      let scPrefixCount = 0;
      let modulePatternCount = 0;
      const MODULE_RE = /^[A-Z][a-zA-Z]+_[a-z][a-zA-Z]+__[a-zA-Z0-9]{5}/;
      const SC_RE = /^sc-/;

      for (const el of allElements) {
        const classes = el.className;
        if (typeof classes !== 'string') continue;
        const classList = classes.split(/\s+/).filter(Boolean);
        totalClasses += classList.length;
        for (const cls of classList) {
          if (TAILWIND_RE.test(cls)) tailwindMatches++;
          if (SC_RE.test(cls)) scPrefixCount++;
          if (MODULE_RE.test(cls)) modulePatternCount++;
        }
      }

      const dynamicStyleTags = document.querySelectorAll('style[data-styled], style[data-emotion], style[data-jss]').length;

      return { tailwindMatches, totalClasses, scPrefixCount, dynamicStyleTags, modulePatternCount };
    }),
  ]);

  const frameworkHints: CSSFrameworkHint[] = [];

  // Tailwind detection
  if (frameworkSignals.totalClasses > 0 && frameworkSignals.tailwindMatches > 0) {
    const ratio = frameworkSignals.tailwindMatches / frameworkSignals.totalClasses;
    if (ratio > 0.05) {
      frameworkHints.push({
        framework: 'tailwind',
        confidence: Math.min(1, Math.round(ratio * 2 * 1000) / 1000),
      });
    }
  }

  // Styled Components detection
  if (frameworkSignals.scPrefixCount > 0 || frameworkSignals.dynamicStyleTags > 0) {
    const signal = frameworkSignals.scPrefixCount + frameworkSignals.dynamicStyleTags * 5;
    frameworkHints.push({
      framework: 'styled-components',
      confidence: Math.min(1, Math.round((signal / 20) * 1000) / 1000),
    });
  }

  // CSS Modules detection
  if (frameworkSignals.modulePatternCount > 0) {
    const signal = frameworkSignals.modulePatternCount;
    frameworkHints.push({
      framework: 'css-modules',
      confidence: Math.min(1, Math.round((signal / 20) * 1000) / 1000),
    });
  }

  return {
    transferSize: totalTransferSize,
    resourceSize: totalResourceSize,
    unusedBytes: totalUnusedBytes,
    unusedRatio: totalResourceSize > 0
      ? Math.round((totalUnusedBytes / totalResourceSize) * 1000) / 1000
      : 0,
    inline: inlineStyles,
    frameworkHints,
  };
}
