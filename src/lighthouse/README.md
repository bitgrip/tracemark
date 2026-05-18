# lighthouse/ — Lighthouse Integration

## Purpose

Runs Lighthouse performance audits independently from Playwright, using Lighthouse's own Chrome process to avoid interference with page measurements.

## Files

| File | Responsibility |
|---|---|
| `index.ts` | Executes the Lighthouse CLI, extracts results, runs repeated cold + warm audits per scenario, and averages them |
| `audits.ts` | Defines the list of captured Lighthouse audit IDs |

## Input

- **`url`** — Page URL to audit
- **`scenario`** — `full`, `no-third-party`, or `no-tracking-only`
- **`config`** — App config (blocklists, Lighthouse flags, repeat count)

## Output

Returns `LighthouseScenarioResult` containing averaged `cold` and `warm` `LighthouseResult` objects plus the underlying `coldRuns[]` and `warmRuns[]` samples.

## How It Works

1. Resolves the `lighthouse` binary from `node_modules/.bin/`
2. Constructs CLI args: `--output=json`, `--only-categories=performance`, `--chrome-flags=--headless`
3. For non-`full` scenarios, adds `--blocked-url-patterns` for each blocklist entry
4. Executes via `child_process.execFile` (separate Chrome process)
5. Parses JSON stdout and extracts scores + audit numeric values
6. Runs Lighthouse multiple times per state (`config.lighthouse.runs`, default fallback `1`)
7. Averages all cold runs into `cold` and all warm runs into `warm`

## Captured Audits

FCP, LCP, TBT, CLS, TTI, TTFB, total-byte-weight, unused-javascript, unused-css-rules, render-blocking-resources, bootup-time, mainthread-work-breakdown, uses-optimized-images.

## Error Handling

If Lighthouse fails, returns a default result with zero scores so the pipeline continues.
