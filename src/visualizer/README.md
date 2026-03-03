# visualizer/ — HTML Report Generation

## Purpose

Generates a self-contained, interactive HTML report from a `Report` object. The HTML file can be opened directly in any browser — no server or build step required.

## Technology

- **ECharts** (via CDN) — All chart types: grouped bar, stacked bar, gauge, donut, horizontal bar
- **Alpine.js** (via CDN) — Reactive UI: domain tabs, URL drilldown, cold/warm toggle
- Report JSON is embedded inline in the HTML

## Key Export

- **`generateHTML(report)`** — Returns a complete HTML string

## Chart Types Used

| Section | Chart |
|---|---|
| Performance scores | Gauge |
| Web Vitals (FCP, LCP, TTI, TBT, CLS) | Grouped bar |
| JS total size | Bar |
| Unused JS/CSS ratio | Donut |
| Bundle breakdown (framework/vendor/internal) | Stacked bar |
| Individual bundles drilldown | Horizontal bar |
| CSS framework confidence | Horizontal bar |

## Interactive Features

- **Domain tabs** — Switch between domains and aggregate comparison
- **URL drilldown** — Click a URL to see bundle-level detail
- **Cold vs. warm toggle** — Switch time-based metrics between cold and warm runs

## Output

The HTML file is written by `cli/visualize.ts` alongside the source JSON (e.g., `report.html` next to `report.json`).

## Dependencies

- **`types/`** — `Report` and all nested types
