# lighthouse/ — Lighthouse Integration

## Purpose

Runs Lighthouse performance audits independently from Playwright, using Lighthouse's own Chrome process to avoid interference with page measurements.

## Files

| File | Responsibility |
|---|---|
| `index.ts` | Executes the Lighthouse CLI, extracts results, runs cold + warm audits per scenario |
| `audits.ts` | Defines the list of captured Lighthouse audit IDs |

## Input

- **`url`** — Page URL to audit
- **`scenario`** — `full`, `no-third-party`, or `no-tracking-only`
- **`config`** — App config (blocklists, Lighthouse flags)

## Output

Returns `LighthouseScenarioResult` containing `cold` and `warm` `LighthouseResult` objects, each with a `performanceScore` and audit map.

## How It Works

1. Resolves the `lighthouse` binary from `node_modules/.bin/`
2. Constructs CLI args: `--output=json`, `--only-categories=performance`, `--chrome-flags=--headless`
3. For non-`full` scenarios, adds `--blocked-url-patterns` for each blocklist entry
4. Executes via `child_process.execFile` (separate Chrome process)
5. Parses JSON stdout and extracts scores + audit numeric values
6. Runs twice per scenario: once cold, once warm

## Captured Audits

FCP, LCP, TBT, CLS, TTI, TTFB, total-byte-weight, unused-javascript, unused-css-rules, render-blocking-resources, bootup-time, mainthread-work-breakdown, uses-optimized-images.

## Error Handling

If Lighthouse fails, returns a default result with zero scores so the pipeline continues.
