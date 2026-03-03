# Tracemark — AI Agent Guide

## Repository Structure

```
tracemark/
├── src/
│   ├── cli/            # CLI entry points (analyze.ts, visualize.ts)
│   ├── scenarios/      # Scenario orchestration (cold/warm runs, request blocking)
│   ├── analyzer/       # Page metric collection (html, js, css, third-party)
│   ├── classifier/     # URL pattern matching (bundle types, third-party providers)
│   ├── lighthouse/     # Independent Lighthouse audits
│   ├── reporter/       # JSON report generation and file I/O
│   ├── visualizer/     # HTML report generation (ECharts + Alpine.js)
│   └── types/          # Shared TypeScript interfaces
├── urls/               # YAML files defining domains + URLs to analyze
├── reports/            # Generated output (gitignored JSON + HTML)
├── config.yaml         # Runtime configuration (scenarios, timeouts, blocklists)
├── package.json        # Scripts: analyze, visualize, typecheck, lint
└── docs/               # Requirements specification
```

## Module Interaction

```
                    ┌──────────────┐
                    │ cli/analyze  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  scenarios   │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼──┐  ┌─▼──────────┐
              │  analyzer  │  │ lighthouse  │
              └────┬───────┘  └────────────┘
                   │
              ┌────▼───────┐
              │ classifier  │
              └────────────┘
                           │
                    ┌──────▼───────┐
                    │   reporter   │
                    └──────────────┘

                    ┌──────────────┐
                    │cli/visualize │
                    └──────┬───────┘
                           │
              ┌────────────▼───┐
              │   visualizer   │
              └────────────────┘
```

## Key Entry Points

- **`src/cli/analyze.ts`** — Main analysis pipeline. Parses `--config` and `--urls` args, iterates domains/URLs, calls `runURL()`, saves reports.
- **`src/cli/visualize.ts`** — Report visualization. Parses `--reports` args, loads JSON, merges multi-domain reports, writes HTML.

## Data Flow

```
YAML URL file → parse → for each URL:
  → for each scenario (full, no-third-party, no-tracking-only):
    → Playwright: launch browser → block requests → cold run → warm runs → collect metrics
    → Lighthouse: run CLI with blocked patterns → extract audit results
  → calculate deltas between scenarios
→ assemble Report object → write JSON to reports/<domain-slug>/<timestamp>/
→ (optional) visualize: load JSON → generate self-contained HTML
```

## Where to Find Logic

| Task | File |
|---|---|
| CLI argument parsing | `src/cli/analyze.ts`, `src/cli/visualize.ts` |
| Request blocking per scenario | `src/scenarios/index.ts` (`shouldBlockRequest`, `getBlockPatterns`) |
| Page metric collection | `src/analyzer/index.ts` (orchestrator), `src/analyzer/html.ts`, `javascript.ts`, `css.ts`, `thirdParty.ts` |
| Bundle classification (Next.js, Vite, CRA) | `src/classifier/bundles.ts` |
| Third-party provider detection | `src/classifier/thirdParty.ts` |
| Lighthouse audit list | `src/lighthouse/audits.ts` |
| Lighthouse execution | `src/lighthouse/index.ts` |
| Report assembly and save | `src/reporter/index.ts` |
| HTML visualization | `src/visualizer/index.ts` |
| All type definitions | `src/types/index.ts` |
| Blocklist configuration | `config.yaml` |

## Build / Lint / Typecheck

```bash
pnpm run typecheck   # TypeScript strict check, no output
pnpm run lint        # ESLint on src/
pnpm run analyze     # Run full analysis pipeline
pnpm run visualize -- --reports <path>  # Generate HTML from JSON
```

No build step — source runs directly via `tsx`.
