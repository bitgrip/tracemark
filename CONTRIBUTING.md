# Contributing to Tracemark

## Prerequisites

- **Node.js** >= 20
- **pnpm** (package manager)
- Chromium (installed via Playwright)

## Setup

```bash
git clone <repo-url>
cd tracemark
pnpm install
npx playwright install chromium
```

## Development Workflow

1. Edit source files in `src/`
2. Run type checking: `pnpm run typecheck`
3. Run linting: `pnpm run lint`
4. Test with a real URL list: `pnpm run analyze -- --urls urls/example.yaml`
5. Verify HTML output: `pnpm run visualize -- --reports reports/<domain>/<timestamp>/report.json`

## Architecture

```
cli/analyze.ts ──→ scenarios/index.ts ──→ analyzer/index.ts ──→ classifier/*
                                      ──→ lighthouse/index.ts
                ──→ reporter/index.ts

cli/visualize.ts ──→ reporter/index.ts (loadReport)
                 ──→ visualizer/index.ts
```

- **scenarios** launches Playwright browsers, handles request blocking, runs cold + warm measurements
- **analyzer** collects metrics from a loaded page (HTML, JS, CSS, third-party)
- **classifier** determines bundle types and third-party providers via URL pattern matching
- **lighthouse** runs the Lighthouse CLI in a separate Chrome process
- **reporter** assembles the `Report` object and writes JSON to disk
- **visualizer** generates a self-contained HTML file with embedded JSON data

## Adding a New Analyzer

1. Create `src/analyzer/<name>.ts` exporting an `async function analyze<Name>(page: Page): Promise<YourMetrics>`
2. Add the metrics type to `src/types/index.ts`
3. Add the field to `RunMetrics` in `src/types/index.ts`
4. Call the new analyzer from `src/analyzer/index.ts` inside `analyzePageMetrics()`

## Adding a New Classifier

1. Add patterns to `src/classifier/bundles.ts` (for JS bundles) or `src/classifier/thirdParty.ts` (for third-party providers)
2. If adding a new category, update the `ThirdPartyCategory` or `BundleClassification` type in `src/types/index.ts`

## Code Style

- **TypeScript strict mode** — no `any`, explicit return types on exports
- **ESLint** — run `pnpm run lint` before committing
- **ES Modules** — all imports use `.js` extensions
- No build step — source is executed directly via `tsx`

## Testing

There is no automated test suite yet. Verify changes by running the full analysis pipeline against a URL list and inspecting the JSON/HTML output.
