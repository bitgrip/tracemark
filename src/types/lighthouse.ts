export interface LighthouseAudit {
  numericValue: number;
  displayValue?: string;
}

export interface LighthouseResult {
  performanceScore: number;
  audits: Record<string, LighthouseAudit>;
}

export interface LighthouseScenarioResult {
  cold: LighthouseResult;
  warm: LighthouseResult;
}
