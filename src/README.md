# src/ — Source Code Overview

## Module Map

| Module | Purpose | Key Exports |
|---|---|---|
| `cli/` | CLI entry points | `analyze.ts` (main), `visualize.ts` |
| `scenarios/` | Orchestrates measurement runs | `runURL()`, `runScenario()` |
| `analyzer/` | Collects page metrics via Playwright | `analyzePageMetrics()` |
| `classifier/` | URL pattern matching for bundles & third-party | `classifyBundle()`, `classifyThirdParty()` |
| `lighthouse/` | Runs Lighthouse audits | `runLighthouse()` |
| `reporter/` | JSON report generation & file I/O | `generateReport()`, `saveReport()`, `loadReport()` |
| `visualizer/` | HTML report generation | `generateHTML()` |
| `types/` | Shared TypeScript interfaces | `Report`, `RunMetrics`, `Config`, etc. |

## Dependencies Between Modules

```
cli/analyze    → scenarios → analyzer → classifier
                           → lighthouse
               → reporter

cli/visualize  → reporter (loadReport)
               → visualizer

All modules    → types
```

## Entry Points

- **`cli/analyze.ts`** — Reads config + URL YAML, runs all scenarios per URL, saves JSON reports
- **`cli/visualize.ts`** — Reads JSON reports, merges domains, generates HTML visualization

Both are invoked via `tsx` (see `package.json` scripts).
