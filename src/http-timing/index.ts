import { performance } from 'perf_hooks';
import { computePercentiles } from './percentiles.js';
import type { HttpTimingResult, HttpTimingConfig } from '../types/http-timing.js';

interface TimingSample {
  dns: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
  responseSize: number;
  statusCode: number;
  protocol: string;
  cacheStatus?: string;
  server?: string;
}

const DEFAULT_RUNS = 20;
const DEFAULT_WAIT_BETWEEN = 500;

async function measureSingle(url: string): Promise<TimingSample> {
  const start = performance.now();

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Tracemark/1.0 (HTTP-Timing)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });

  const ttfbEnd = performance.now();
  const body = await response.arrayBuffer();
  const end = performance.now();

  const total = end - start;
  const ttfb = ttfbEnd - start;
  const download = end - ttfbEnd;

  // Node's fetch doesn't expose DNS/TLS breakdown directly.
  // We report ttfb as the combined DNS+TLS+server-processing time.
  // DNS and TLS are reported as 0 — they are included in ttfb.
  return {
    dns: 0,
    tls: 0,
    ttfb,
    download,
    total,
    responseSize: body.byteLength,
    statusCode: response.status,
    protocol: response.headers.get('alt-svc')?.includes('h3') ? 'h3' : 'h2',
    cacheStatus: response.headers.get('x-cache') ?? response.headers.get('cf-cache-status') ?? undefined,
    server: response.headers.get('server') ?? undefined,
  };
}

export async function runHttpTiming(url: string, config?: HttpTimingConfig): Promise<HttpTimingResult> {
  const runs = config?.runs ?? DEFAULT_RUNS;
  const waitBetween = config?.waitBetweenRuns ?? DEFAULT_WAIT_BETWEEN;

  console.log(`  [HTTP-Timing] ${runs} requests to ${url}...`);

  const samples: TimingSample[] = [];

  for (let i = 0; i < runs; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, waitBetween));
    }
    try {
      const sample = await measureSingle(url);
      samples.push(sample);
    } catch (err) {
      console.warn(`  [HTTP-Timing] Request ${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (samples.length === 0) {
    throw new Error(`All ${runs} HTTP-Timing requests failed for ${url}`);
  }

  const lastSample = samples[samples.length - 1];

  return {
    url,
    runs: samples.length,
    dns: computePercentiles(samples.map(s => s.dns)),
    tls: computePercentiles(samples.map(s => s.tls)),
    ttfb: computePercentiles(samples.map(s => s.ttfb)),
    download: computePercentiles(samples.map(s => s.download)),
    total: computePercentiles(samples.map(s => s.total)),
    responseSize: lastSample.responseSize,
    statusCode: lastSample.statusCode,
    protocol: lastSample.protocol,
    cacheStatus: lastSample.cacheStatus,
    server: lastSample.server,
  };
}
