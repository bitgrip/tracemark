import type { Scenario } from './config.js';
import type { RunMetrics, JavaScriptMetrics, ThirdPartyMetrics } from './metrics.js';
import type { LighthouseScenarioResult } from './lighthouse.js';
import type { ScriptInventory, InventoryComparison } from './inventory.js';
import type { HttpTimingResult } from './http-timing.js';

export interface PlaywrightScenarioResult {
  cold: RunMetrics;
  warmRuns: RunMetrics[];
  warmAvg: Partial<RunMetrics>;
}

export interface ScenarioResult {
  playwright: PlaywrightScenarioResult;
  lighthouse: LighthouseScenarioResult;
}

export interface DeltaMetrics {
  javascript?: Partial<JavaScriptMetrics>;
  thirdParty?: Partial<ThirdPartyMetrics>;
  lighthouse?: {
    cold?: Record<string, number>;
  };
}

export interface URLResult {
  url: string;
  status: 'ok' | 'error';
  error?: string;
  scenarios: Record<Scenario, ScenarioResult>;
  deltas: {
    full_vs_noThirdParty: DeltaMetrics;
    full_vs_noTrackingOnly: DeltaMetrics;
  };
  httpTiming?: HttpTimingResult;
}

export interface DomainResult {
  name: string;
  urls: URLResult[];
  inventory?: ScriptInventory;
}

// --- Measurement: atomic per-domain result ---

export interface MeasurementMeta {
  timestamp: string;
  version: string;
  config: {
    warmRuns: number;
    waitBetweenRuns: number;
    lighthouseRuns?: number;
    httpTimingRuns?: number;
    scenarios: Scenario[];
    network?: {
      throttle: boolean;
      profile: string;
    };
  };
}

export interface Measurement {
  meta: MeasurementMeta;
  domain: DomainResult;
}

// --- Report: self-contained aggregation of N measurements ---

export interface ReportMeta {
  timestamp: string;
  version: string;
  config: {
    warmRuns: number;
    waitBetweenRuns: number;
    lighthouseRuns?: number;
    httpTimingRuns?: number;
    scenarios: Scenario[];
    network?: {
      throttle: boolean;
      profile: string;
    };
  };
}

export interface Report {
  meta: ReportMeta;
  measurements: Measurement[];
  inventoryComparison?: InventoryComparison;
}

/** @deprecated Use Report.measurements[].domain instead */
export type ReportLegacy = {
  meta: ReportMeta;
  domains: DomainResult[];
  inventoryComparison?: InventoryComparison;
}
