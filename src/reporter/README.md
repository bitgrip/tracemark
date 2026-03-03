# reporter/ — JSON Report Generation

## Purpose

Assembles domain results into a `Report` object with metadata, saves it as JSON, and provides a loader for the visualization step.

## Key Exports

- **`generateReport(domains, config)`** — Creates a `Report` with timestamp, version, config summary, and domain results
- **`saveReport(report, outputDir?)`** — Writes `report.json` to `reports/<domain-slug>/<timestamp>/`
- **`loadReport(filePath)`** — Reads and parses a JSON report file
- **`createDomainSlug(name)`** — Converts domain name to a filesystem-safe slug (e.g., "Shop A" → `shop-a`)
- **`createTimestamp()`** — Generates an ISO 8601-style timestamp for folder names (e.g., `2026-03-03T14-00-00`)

## Report Structure

```
Report
├── meta: { timestamp, version, config: { warmRuns, waitBetweenRuns, scenarios } }
└── domains[]
    ├── name
    └── urls[]
        ├── url, status
        ├── scenarios: { full, no-third-party, no-tracking-only }
        │   ├── playwright: { cold: RunMetrics, warmRuns[], warmAvg }
        │   └── lighthouse: { cold: LighthouseResult, warm: LighthouseResult }
        └── deltas: { full_vs_noThirdParty, full_vs_noTrackingOnly }
```

## File Output

Reports are saved to `reports/<domain-slug>/<timestamp>/report.json`. The directory is created automatically. All size values are in bytes (integers).

## Dependencies

- **`types/`** — `Report`, `DomainResult`, `Config`
