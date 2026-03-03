import type { Page } from 'playwright';
import type { HTMLMetrics } from '../types/index.js';

interface NavEntry {
  transferSize: number;
  decodedBodySize: number;
}

interface InlineScriptInfo {
  count: number;
  totalSize: number;
}

interface LinkHints {
  preload: Record<string, number>;
  prefetch: Record<string, number>;
}

export async function analyzeHTML(page: Page): Promise<HTMLMetrics> {
  const [navEntry, ssrCheck, rscCheck, nextDataCheck, inlineScripts, linkHints] =
    await Promise.all([
      page.evaluate<NavEntry>(() => {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        const entry = entries[0];
        return {
          transferSize: entry?.transferSize ?? 0,
          decodedBodySize: entry?.decodedBodySize ?? 0,
        };
      }),
      page.evaluate<boolean>(() => {
        const body = document.body;
        if (!body) return false;
        const html = body.innerHTML;
        const text = body.textContent ?? '';
        return html.length > 100 && text.trim().length > 0;
      }),
      page.evaluate<boolean>(() => {
        return document.documentElement.innerHTML.includes('__RSC_PAYLOAD__');
      }),
      page.evaluate<boolean>(() => {
        const scriptTag = document.querySelector('script#__NEXT_DATA__');
        if (scriptTag) return true;
        return '__NEXT_DATA__' in window;
      }),
      page.evaluate<InlineScriptInfo>(() => {
        const scripts = Array.from(document.querySelectorAll('script:not([src])'));
        let totalSize = 0;
        for (const s of scripts) {
          totalSize += (s.textContent ?? '').length;
        }
        return { count: scripts.length, totalSize };
      }),
      page.evaluate<LinkHints>(() => {
        const preload: Record<string, number> = {};
        const prefetch: Record<string, number> = {};
        const links = document.querySelectorAll('link');
        for (const link of links) {
          const rel = link.getAttribute('rel') ?? '';
          const asAttr = link.getAttribute('as') ?? 'other';
          if (rel === 'preload') {
            preload[asAttr] = (preload[asAttr] ?? 0) + 1;
          } else if (rel === 'prefetch') {
            prefetch[asAttr] = (prefetch[asAttr] ?? 0) + 1;
          }
        }
        return { preload, prefetch };
      }),
    ]);

  return {
    transferSize: navEntry.transferSize,
    resourceSize: navEntry.decodedBodySize,
    isSSR: ssrCheck,
    hasRSC: rscCheck,
    hasNextData: nextDataCheck,
    inlineScripts,
    preloadHints: linkHints.preload,
    prefetchHints: linkHints.prefetch,
  };
}
