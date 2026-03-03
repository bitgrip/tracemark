# Tracemark

A Playwright-based CLI tool that automatically collects performance and bundle metrics for a list of URLs, enabling quick and reproducible comparisons of different domains and their technical implementation.

## Key Features

- **Three scenarios** per URL: `full`, `no-third-party`, `no-tracking-only` — isolates third-party and tracking impact
- **Lighthouse integration** — independent performance audits (Web Vitals, byte weight, unused code)
- **Bundle & CSS analysis** — JS chunk classification, unused code ratios, CSS framework detection
- **Interactive HTML reports** — self-contained visualization with ECharts + Alpine.js

## Quick Start

```bash
pnpm install
npx playwright install chromium

# Run analysis (uses config.yaml + urls/example.yaml by default)
pnpm run analyze

# Generate HTML report from JSON output
pnpm run visualize -- --reports reports/example-site/2026-01-01T12-00-00/report.json
```

## Commands

| Command | Description |
|---|---|
| `pnpm run analyze` | Run analysis with default config and URL list |
| `pnpm run analyze -- --config config.yaml --urls urls/shop.yaml` | Run with explicit paths |
| `pnpm run visualize -- --reports <path1> [path2]` | Generate HTML report (supports multi-domain comparison) |
| `pnpm run typecheck` | TypeScript type checking (no build output) |
| `pnpm run lint` | ESLint on `src/` |

## CLI Flags

### analyze

| Flag | Default | Description |
|---|---|---|
| `--config` | `config.yaml` | Path to YAML config file |
| `--urls` | `urls/example.yaml` | Path to YAML URL list |

### visualize

| Flag | Description |
|---|---|
| `--reports` | One or more JSON report paths (up to 3 for comparison) |

## Architecture

```
src/
├── cli/          # Entry points: analyze.ts, visualize.ts
├── scenarios/    # Orchestrates cold/warm runs per URL & scenario
├── analyzer/     # Collects metrics via Playwright (HTML, JS, CSS, third-party)
├── classifier/   # Classifies bundles and third-party requests by URL patterns
├── lighthouse/   # Runs Lighthouse audits independently
├── reporter/     # Generates and saves JSON reports
├── visualizer/   # Generates self-contained HTML reports
└── types/        # Shared TypeScript type definitions
```

Data flow: **YAML URLs → Scenarios → Playwright + Lighthouse → JSON Report → HTML Visualization**

## Further Reading

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development setup and guidelines
- [docs/requirements.md](./docs/requirements.md) — Full requirements specification
