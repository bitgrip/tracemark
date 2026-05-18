import type { ThirdPartyCategory } from './metrics.js';

export type ScriptLoadMethod = 'sync' | 'async' | 'defer' | 'dynamic';

export interface ExternalScript {
  provider: string;
  category: ThirdPartyCategory;
  requestUrls: string[];
  transferSize: number;
  isRenderBlocking: boolean;
  loadMethod: ScriptLoadMethod;
}

export interface URLInventory {
  url: string;
  externalScripts: ExternalScript[];
}

export interface ScriptInventory {
  domain: string;
  urls: URLInventory[];
}

export type ComparisonStatus = 'both' | 'only-a' | 'only-b';

export interface ProviderComparison {
  provider: string;
  category: ThirdPartyCategory;
  inDomainA: boolean;
  inDomainB: boolean;
  status: ComparisonStatus;
  transferSizeA?: number;
  transferSizeB?: number;
}

export interface InventoryComparison {
  domainA: string;
  domainB: string;
  providers: ProviderComparison[];
}
