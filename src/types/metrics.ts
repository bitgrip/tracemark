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

export type BundleClassification =
  | 'framework'
  | 'internal-page'
  | 'internal-shell'
  | 'internal'
  | 'vendor'
  | 'external'
  | 'cmp'
  | 'analytics'
  | 'tag-manager'
  | 'document'
  | 'unknown';

export interface BundleInfo {
  url: string;
  classification: BundleClassification;
  transferSize: number;
  resourceSize: number;
  unusedBytes: number;
  unusedRatio: number;
  isLazy: boolean;
}

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

export interface CSSFrameworkHint {
  framework: string;
  confidence: number;
}

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

export type ThirdPartyCategory = 'cmp' | 'tagManager' | 'analytics' | 'tracking' | 'other';

export interface ThirdPartyCategoryData {
  transferSize: number;
  requests: number;
  providers: string[];
}

export interface ThirdPartyMetrics {
  totalTransferSize: number;
  totalRequests: number;
  beacons: number;
  renderBlockingCount: number;
  byCategory: Record<ThirdPartyCategory, ThirdPartyCategoryData>;
}

export interface RunMetrics {
  html: HTMLMetrics;
  javascript: JavaScriptMetrics;
  css: CSSMetrics;
  thirdParty: ThirdPartyMetrics;
}
