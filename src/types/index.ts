// Scenario and RunType
export type Scenario = 'full' | 'no-third-party' | 'no-tracking-only';
export type RunType = 'cold' | 'warm';

// Config
export interface Config {
  warmRuns: number;
  waitBetweenRuns: number;
  timeout: number;
  headless: boolean;
  scenarios: Scenario[];
  lighthouse: {
    enabled: boolean;
    flags: string[];
  };
  blocklists: {
    thirdParty: string[];
    trackingOnly: string[];
  };
}

// URL Input
export interface DomainInput {
  name: string;
  urls: string[];
}

// HTML Metrics
export interface HTMLMetrics {
  transferSize: number;
  resourceSize: number;
  isSSR: boolean;
  hasRSC: boolean;
  hasNextData: boolean;
  inlineScripts: {
    count: number;
    totalSize: number;
  };
  preloadHints: Record<string, number>;
  prefetchHints: Record<string, number>;
}

// Bundle info
export type BundleClassification = 'framework' | 'internal-page' | 'internal-shell' | 'internal' | 'vendor' | 'external' | 'unknown';

export interface BundleInfo {
  url: string;
  classification: BundleClassification;
  transferSize: number;
  resourceSize: number;
  unusedBytes: number;
  unusedRatio: number;
  isLazy: boolean;
}

// JavaScript Metrics
export interface JavaScriptMetrics {
  transferSize: number;
  resourceSize: number;
  unusedBytes: number;
  unusedRatio: number;
  chunks: {
    total: number;
    initialCount: number;
    lazyCount: number;
    medianSize: number;
    maxSize: number;
  };
  bundles: BundleInfo[];
}

// CSS Framework Hint
export interface CSSFrameworkHint {
  framework: string;
  confidence: number;
}

// CSS Metrics
export interface CSSMetrics {
  transferSize: number;
  resourceSize: number;
  unusedBytes: number;
  unusedRatio: number;
  inline: {
    count: number;
    totalSize: number;
  };
  frameworkHints: CSSFrameworkHint[];
}

// Third-party category
export type ThirdPartyCategory = 'cmp' | 'tagManager' | 'analytics' | 'tracking' | 'other';

export interface ThirdPartyCategoryData {
  transferSize: number;
  requests: number;
  providers: string[];
}

// Third-party Metrics
export interface ThirdPartyMetrics {
  totalTransferSize: number;
  totalRequests: number;
  beacons: number;
  renderBlockingCount: number;
  byCategory: Record<ThirdPartyCategory, ThirdPartyCategoryData>;
}

// Run Metrics (one complete measurement)
export interface RunMetrics {
  html: HTMLMetrics;
  javascript: JavaScriptMetrics;
  css: CSSMetrics;
  thirdParty: ThirdPartyMetrics;
}

// Lighthouse audit
export interface LighthouseAudit {
  numericValue: number;
  displayValue?: string;
}

// Lighthouse run result
export interface LighthouseResult {
  performanceScore: number;
  audits: Record<string, LighthouseAudit>;
}

// Playwright scenario result
export interface PlaywrightScenarioResult {
  cold: RunMetrics;
  warmRuns: RunMetrics[];
  warmAvg: Partial<RunMetrics>;
}

// Lighthouse scenario result
export interface LighthouseScenarioResult {
  cold: LighthouseResult;
  warm: LighthouseResult;
}

// Full scenario result
export interface ScenarioResult {
  playwright: PlaywrightScenarioResult;
  lighthouse: LighthouseScenarioResult;
}

// Deltas
export interface DeltaMetrics {
  javascript?: Partial<JavaScriptMetrics>;
  thirdParty?: Partial<ThirdPartyMetrics>;
  lighthouse?: {
    cold?: Record<string, number>;
  };
}

// URL result
export interface URLResult {
  url: string;
  status: 'ok' | 'error';
  error?: string;
  scenarios: Record<Scenario, ScenarioResult>;
  deltas: {
    full_vs_noThirdParty: DeltaMetrics;
    full_vs_noTrackingOnly: DeltaMetrics;
  };
}

// Domain result
export interface DomainResult {
  name: string;
  urls: URLResult[];
}

// Report meta
export interface ReportMeta {
  timestamp: string;
  version: string;
  config: {
    warmRuns: number;
    waitBetweenRuns: number;
    scenarios: Scenario[];
  };
}

// Full report
export interface Report {
  meta: ReportMeta;
  domains: DomainResult[];
}
