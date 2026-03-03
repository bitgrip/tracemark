# analyzer/ — Page Metric Collection

## Purpose

Collects performance and bundle metrics from a loaded Playwright page. Runs four analyses in parallel and returns a combined `RunMetrics` object.

## Files

| File | Responsibility |
|---|---|
| `index.ts` | Orchestrator — calls all analyzers in parallel via `analyzePageMetrics()` |
| `html.ts` | HTML payload: transfer/resource size, SSR/RSC detection, inline scripts, preload/prefetch hints |
| `javascript.ts` | JS bundles: sizes, unused bytes (Coverage API), chunk splitting, bundle classification |
| `css.ts` | CSS: sizes, unused bytes, inline styles, framework detection (Tailwind, Styled Components, CSS Modules) |
| `thirdParty.ts` | Third-party requests: categorization, transfer sizes, beacon detection, render-blocking scripts |

## Input

- **`page`** — Playwright `Page` object (already navigated)
- **`requests`** — Array of intercepted `Request` objects
- **`pageUrl`** — The URL of the page being analyzed
- **`jsCoverage`** / **`cssCoverage`** — Coverage entries from Playwright Coverage API

## Output

Returns `RunMetrics` containing `html`, `javascript`, `css`, and `thirdParty` sub-objects.

## Dependencies

- **`types/`** — `RunMetrics`, `HTMLMetrics`, `JavaScriptMetrics`, `CSSMetrics`, `ThirdPartyMetrics`
- **`classifier/bundles.ts`** — Used by `javascript.ts` for bundle classification
- **`classifier/thirdParty.ts`** — Used by `thirdParty.ts` for provider/category detection

## Error Handling

Each analyzer is wrapped in `.catch()` — if one fails, it returns a default (zero) metrics object so the other analyzers still complete.
