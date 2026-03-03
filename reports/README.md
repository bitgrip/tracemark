# reports/ — Generated Output

## Auto-Generated

This folder contains analysis output. It is populated automatically by `pnpm run analyze` and `pnpm run visualize`.

## Structure

```
reports/
├── shop-a/
│   ├── 2026-03-03T14-00-00/
│   │   ├── report.json     # Raw analysis data
│   │   └── report.html     # Interactive visualization
│   └── 2026-03-03T18-00-00/
│       ├── report.json
│       └── report.html
└── shop-b/
    └── 2026-03-03T14-00-00/
        ├── report.json
        └── report.html
```

- **Domain folder** — Slug derived from the `name` field in the URL YAML (e.g., "Shop A" → `shop-a`)
- **Timestamp subfolder** — ISO 8601-style per run, matching across domains for the same analysis
- **report.json** — Full analysis data (all scenarios, metrics, deltas)
- **report.html** — Self-contained interactive visualization

## Git

Report files (`report.json`, `report.html`) are excluded via `.gitignore`. Only this README is tracked.

## Viewing Reports

Open `report.html` directly in a browser — no server required. The JSON data is embedded inline in the HTML.

To generate an HTML report from an existing JSON file:

```bash
pnpm run visualize -- --reports reports/shop-a/2026-03-03T14-00-00/report.json
```

To compare multiple domains:

```bash
pnpm run visualize -- --reports reports/shop-a/.../report.json reports/shop-b/.../report.json
```
