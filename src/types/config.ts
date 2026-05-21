export type Scenario = "full" | "no-third-party" | "no-tracking-only";
export type RunType = "cold" | "warm";
export type ThrottleProfileName = "4g" | "cable-10" | "cable-5" | "3g";

export interface Config {
  warmRuns: number;
  waitBetweenRuns: number;
  timeout: number;
  headless: boolean;
  scenarios: Scenario[];
  lighthouse: {
    enabled: boolean;
    runs?: number;
    flags: string[];
  };
  httpTiming: {
    enabled: boolean;
    runs: number;
    waitBetweenRuns: number;
  };
  network?: {
    throttle: boolean;
    profile: ThrottleProfileName;
  };
  blocklists: {
    thirdParty: string[];
    trackingOnly: string[];
    criticalThirdParty: string[];
  };
}

export interface DomainInput {
  name: string;
  urls: string[];
}
