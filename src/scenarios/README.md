# scenarios/ — Measurement Orchestration

## Purpose

Orchestrates the full measurement sequence for each URL across all configured scenarios. Manages browser lifecycle, request blocking, coverage collection, and delta calculation.

## Three Scenarios

| Scenario | Blocking | Measures |
|---|---|---|
| `full` | None — real user experience | Baseline metrics |
| `no-third-party` | All external domains blocked via `page.route()` | Total third-party impact |
| `no-tracking-only` | Only tracking & pixels blocked | Pure tracking impact |

## Run Sequence Per Scenario

1. **Cold run** — Fresh browser context (no cache), JS + CSS coverage enabled → `RunMetrics`
2. **Warm runs** (default: 3) — Same browser context (cache active), configurable wait between runs → averaged into `warmAvg`
3. **Lighthouse** — Separate Chrome process, cold + warm audits

## Key Exports

- **`runURL(url, config)`** — Full pipeline for one URL: runs all scenarios, calculates deltas, returns `URLResult`
- **`runScenario(url, scenario, config)`** — Playwright measurements for one scenario, returns `PlaywrightScenarioResult`
- **`shouldBlockRequest(url, patterns)`** — Tests a request URL against blocklist glob patterns
- **`calculateDeltas(scenarios)`** — Computes `full_vs_noThirdParty` and `full_vs_noTrackingOnly` deltas

## Request Blocking

Uses `page.route('**/*', ...)` to intercept all requests. Blocklist patterns from `config.yaml` are converted to regex and matched against each request URL. Matched requests are aborted.

## Dependencies

- **`analyzer/`** — `analyzePageMetrics()` for collecting page metrics
- **`lighthouse/`** — `runLighthouse()` for independent audits
- **`types/`** — All scenario and result types
