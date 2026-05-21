import * as fs from "fs/promises";
import * as path from "path";
import type {
  Config,
  RunMetrics,
  HttpTimingResult,
  LighthouseResult,
} from "../types/index.js";
import { THROTTLE_PROFILES } from "../scenarios/index.js";

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function line(indent: number, text: string): string {
  return "│ ".repeat(indent) + text;
}

export class Protocol {
  private lines: string[] = [];
  private filePath?: string;

  header(): void {
    this.lines.push(
      "═══════════════════════════════════════════════════════════════════",
    );
    this.lines.push(" TRACEMARK RUN PROTOCOL");
    this.lines.push(
      "═══════════════════════════════════════════════════════════════════",
    );
    this.lines.push(`Started: ${new Date().toISOString()}`);
    this.lines.push("");
  }

  config(config: Config): void {
    this.lines.push(
      "┌─ CONFIGURATION ──────────────────────────────────────────────────",
    );
    this.lines.push(`│ Scenarios:       ${config.scenarios.join(", ")}`);
    this.lines.push(`│ Warm Runs:       ${config.warmRuns}`);
    this.lines.push(`│ Wait Between:    ${config.waitBetweenRuns}ms`);
    this.lines.push(`│ Timeout:         ${config.timeout}ms`);
    this.lines.push(`│ Headless:        ${config.headless}`);
    this.lines.push("│");

    if (config.network?.throttle) {
      const profile = THROTTLE_PROFILES[config.network.profile];
      this.lines.push(`│ Network Throttle: ${config.network.profile}`);
      if (profile) {
        this.lines.push(
          `│   Download:      ${formatBytes(profile.downloadThroughput)}/s`,
        );
        this.lines.push(
          `│   Upload:        ${formatBytes(profile.uploadThroughput)}/s`,
        );
        this.lines.push(`│   Latency:       ${profile.latency}ms`);
      }
    } else {
      this.lines.push("│ Network Throttle: disabled");
    }
    this.lines.push("│");

    this.lines.push(
      `│ Lighthouse:      ${config.lighthouse.enabled ? "enabled" : "disabled"}`,
    );
    if (config.lighthouse.enabled) {
      this.lines.push(`│   Runs/State:    ${config.lighthouse.runs ?? 1}`);
    }
    if (config.lighthouse.enabled && config.lighthouse.flags.length > 0) {
      this.lines.push(
        `│   Flags:         ${config.lighthouse.flags.join(" ")}`,
      );
    }
    this.lines.push("│");

    this.lines.push(
      `│ HTTP-Timing:     ${config.httpTiming?.enabled ? "enabled" : "disabled"}`,
    );
    if (config.httpTiming?.enabled) {
      this.lines.push(`│   Runs:          ${config.httpTiming.runs}`);
      this.lines.push(
        `│   Wait Between:  ${config.httpTiming.waitBetweenRuns}ms`,
      );
    }
    this.lines.push("│");

    this.lines.push(`│ Blocklists:`);
    this.lines.push(
      `│   Third-Party (${config.blocklists.thirdParty.length}):`,
    );
    for (const p of config.blocklists.thirdParty) {
      this.lines.push(`│     ${p}`);
    }
    this.lines.push(
      `│   Tracking-Only (${config.blocklists.trackingOnly.length}):`,
    );
    for (const p of config.blocklists.trackingOnly) {
      this.lines.push(`│     ${p}`);
    }
    this.lines.push(
      `│   Critical Third-Party (${config.blocklists.criticalThirdParty.length}) [not blocked]:`,
    );
    for (const p of config.blocklists.criticalThirdParty) {
      this.lines.push(`│     ${p}`);
    }
    this.lines.push(
      "└──────────────────────────────────────────────────────────────────",
    );
    this.lines.push("");
  }

  domainStart(name: string, index: number, total: number): void {
    this.lines.push(
      `┌─ DOMAIN: ${name} (${index}/${total}) ─────────────────────────────────`,
    );
  }

  domainEnd(): void {
    this.lines.push(
      "└──────────────────────────────────────────────────────────────────",
    );
    this.lines.push("");
  }

  urlStart(url: string, index: number, total: number): void {
    this.lines.push(line(1, `┌─ URL: ${url} (${index}/${total})`));
    this.lines.push(line(1, "│"));
  }

  urlEnd(): void {
    this.lines.push(
      line(1, "└──────────────────────────────────────────────────────────"),
    );
  }

  playwrightColdStart(scenario: string): void {
    this.lines.push(line(1, `[${ts()}] PLAYWRIGHT › ${scenario} › cold run`));
  }

  playwrightColdResult(
    scenario: string,
    metrics: RunMetrics,
    durationMs: number,
  ): void {
    this.lines.push(line(1, `  Duration: ${formatMs(durationMs)}`));
    this.lines.push(
      line(
        1,
        `  HTML: ${formatBytes(metrics.html.transferSize)} transfer | SSR: ${metrics.html.isSSR ? "yes" : "no"}`,
      ),
    );
    this.lines.push(
      line(
        1,
        `  JS:   ${formatBytes(metrics.javascript.transferSize)} transfer | ${Math.round(metrics.javascript.unusedRatio * 100)}% unused | ${metrics.javascript.chunks.total} chunks`,
      ),
    );
    this.lines.push(
      line(
        1,
        `  CSS:  ${formatBytes(metrics.css.transferSize)} transfer | ${Math.round(metrics.css.unusedRatio * 100)}% unused`,
      ),
    );
    this.lines.push(
      line(
        1,
        `  3P:   ${formatBytes(metrics.thirdParty.totalTransferSize)} | ${metrics.thirdParty.totalRequests} requests`,
      ),
    );
    this.lines.push(line(1, ""));
  }

  playwrightWarmStart(scenario: string, run: number, total: number): void {
    this.lines.push(
      line(1, `[${ts()}] PLAYWRIGHT › ${scenario} › warm run ${run}/${total}`),
    );
  }

  playwrightWarmResult(
    scenario: string,
    run: number,
    metrics: RunMetrics,
    durationMs: number,
  ): void {
    this.lines.push(line(1, `  Duration: ${formatMs(durationMs)}`));
    this.lines.push(
      line(
        1,
        `  JS: ${formatBytes(metrics.javascript.transferSize)} | 3P: ${formatBytes(metrics.thirdParty.totalTransferSize)}`,
      ),
    );
    this.lines.push(line(1, ""));
  }

  lighthouseStart(scenario: string, runType: "cold" | "warm"): void {
    this.lines.push(
      line(1, `[${ts()}] LIGHTHOUSE › ${scenario} › ${runType} run`),
    );
  }

  lighthouseResult(
    scenario: string,
    runType: "cold" | "warm",
    result: LighthouseResult,
  ): void {
    this.lines.push(
      line(
        1,
        `  Performance Score: ${(result.performanceScore * 100).toFixed(0)}/100`,
      ),
    );
    const fcp = result.audits["first-contentful-paint"]?.numericValue;
    const lcp = result.audits["largest-contentful-paint"]?.numericValue;
    const tbt = result.audits["total-blocking-time"]?.numericValue;
    const cls = result.audits["cumulative-layout-shift"]?.numericValue;
    const parts: string[] = [];
    if (fcp) parts.push(`FCP: ${formatMs(fcp)}`);
    if (lcp) parts.push(`LCP: ${formatMs(lcp)}`);
    if (tbt) parts.push(`TBT: ${formatMs(tbt)}`);
    if (cls !== undefined) parts.push(`CLS: ${cls.toFixed(3)}`);
    if (parts.length > 0) {
      this.lines.push(line(1, `  ${parts.join(" | ")}`));
    }
    this.lines.push(line(1, ""));
  }

  httpTimingStart(url: string, runs: number): void {
    this.lines.push(line(1, `[${ts()}] HTTP-TIMING › ${runs} runs`));
  }

  httpTimingResult(result: HttpTimingResult): void {
    this.lines.push(
      line(
        1,
        `  TTFB    p50: ${formatMs(result.ttfb.p50)} | p95: ${formatMs(result.ttfb.p95)} | p99: ${formatMs(result.ttfb.p99)}`,
      ),
    );
    this.lines.push(
      line(
        1,
        `  Total   p50: ${formatMs(result.total.p50)} | p95: ${formatMs(result.total.p95)} | p99: ${formatMs(result.total.p99)}`,
      ),
    );
    this.lines.push(
      line(
        1,
        `  Status: ${result.statusCode} | Protocol: ${result.protocol} | Size: ${formatBytes(result.responseSize)}`,
      ),
    );
    if (result.server) {
      this.lines.push(line(1, `  Server: ${result.server}`));
    }
    if (result.cacheStatus) {
      this.lines.push(line(1, `  Cache:  ${result.cacheStatus}`));
    }
    this.lines.push(line(1, ""));
  }

  error(tool: string, message: string): void {
    this.lines.push(line(1, `[${ts()}] ❌ ${tool} ERROR: ${message}`));
    this.lines.push(line(1, ""));
  }

  skip(tool: string, reason: string): void {
    this.lines.push(line(1, `[${ts()}] ⏭ ${tool} skipped: ${reason}`));
    this.lines.push(line(1, ""));
  }

  footer(durationMs: number, domainCount: number, urlCount: number): void {
    this.lines.push(
      "═══════════════════════════════════════════════════════════════════",
    );
    this.lines.push(`Completed: ${new Date().toISOString()}`);
    this.lines.push(`Duration:  ${formatDuration(durationMs)}`);
    this.lines.push(`Domains:   ${domainCount}`);
    this.lines.push(`URLs:      ${urlCount}`);
    this.lines.push(
      "═══════════════════════════════════════════════════════════════════",
    );
  }

  async save(dir: string): Promise<string> {
    const filePath = path.join(dir, "protocol.log");
    this.filePath = filePath;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, this.lines.join("\n") + "\n", "utf-8");
    return filePath;
  }

  async flush(): Promise<void> {
    if (this.filePath) {
      await fs.writeFile(this.filePath, this.lines.join("\n") + "\n", "utf-8");
    }
  }

  setOutputPath(dir: string): void {
    this.filePath = path.join(dir, "protocol.log");
  }

  toString(): string {
    return this.lines.join("\n");
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
