export interface HttpTimingPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface HttpTimingResult {
  url: string;
  runs: number;
  dns: HttpTimingPercentiles;
  tls: HttpTimingPercentiles;
  ttfb: HttpTimingPercentiles;
  download: HttpTimingPercentiles;
  total: HttpTimingPercentiles;
  responseSize: number;
  statusCode: number;
  protocol: string;
  cacheStatus?: string;
  server?: string;
}

export interface HttpTimingConfig {
  enabled: boolean;
  runs: number;
  waitBetweenRuns: number;
}
