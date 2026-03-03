# types/ — Shared Type Definitions

## Purpose

Central TypeScript type definitions used by all modules. Defines the complete data model from configuration to final report output.

## Key Types

| Type | Description |
|---|---|
| `Config` | Runtime configuration: scenarios, warm runs, timeouts, blocklists, Lighthouse flags |
| `DomainInput` | Input format: `{ name, urls[] }` |
| `RunMetrics` | One complete measurement: `{ html, javascript, css, thirdParty }` |
| `HTMLMetrics` | Transfer/resource size, SSR/RSC flags, inline scripts, preload/prefetch hints |
| `JavaScriptMetrics` | JS sizes, unused ratio, chunk stats, individual `BundleInfo[]` |
| `CSSMetrics` | CSS sizes, unused ratio, inline styles, `CSSFrameworkHint[]` |
| `ThirdPartyMetrics` | Third-party totals, beacons, render-blocking count, breakdown by category |
| `BundleClassification` | `'framework' \| 'internal-page' \| 'internal-shell' \| 'internal' \| 'vendor' \| 'external' \| 'unknown'` |
| `ThirdPartyCategory` | `'cmp' \| 'tagManager' \| 'analytics' \| 'tracking' \| 'other'` |
| `ScenarioResult` | Combined Playwright + Lighthouse result for one scenario |
| `URLResult` | All scenarios + deltas for one URL |
| `DomainResult` | `{ name, urls: URLResult[] }` |
| `Report` | Top-level: `{ meta, domains: DomainResult[] }` |

## Usage

All modules import types from `../types/index.js`. No runtime code — types only.
