### 7f. Project Documentation

| File | Content |
|---|---|
| `README.md` | Project overview, purpose, quickstart, scripts |
| `CONTRIBUTING.md` | Setup, development environment, architecture decisions |
| `AGENTS.md` | For AI agents: repo structure, purpose of each folder, module interactions |
| `src/*/README.md` | Purpose of each module, input/output, dependencies on other modules |
| `urls/README.md` | YAML file format, examples |
| `reports/README.md` | Structure of generated reports, note on .gitignore |### 2d. Run Matrix Overview### Display

#### Overview & Scores

| View | Chart type | Rationale |
|---|---|---|
| Overview dashboard | **Metric Cards** | Compact KPIs: performance score, JS total, CSS total, LCP |
| Lighthouse performance score | **Gauge** | Classic for scores 0–100, immediately readable |
| All URLs tabular | **Sortable table** | No chart – a table is superior here |

#### Lighthouse – Web Vitals

| Metric | Chart type | Rationale |
|---|---|---|
| FCP, LCP, TTI, TBT, TTFB | **Grouped bar** | Direct side-by-side comparison across domains |
| CLS | **Grouped bar** | Same as other vitals, axis adapted for small values |
| Cold vs. warm (all vitals) | **Grouped bar** (2 groups per domain) | Cold/warm as group, domains as colors |

#### HTML Payload

| Metric | Chart type | Rationale |
|---|---|---|
| Transfer size compressed vs. uncompressed | **Grouped bar** | Two bars per domain |
| SSR vs. CSR indicator | **Badge / label** | No chart – a text label suffices |
| Inline script size & count | **Grouped bar** | Size + count as separate series |
| Preload / prefetch hints | **Grouped bar** | Count split by resource type |

#### JavaScript – Bundles

| Metric | Chart type | Rationale |
|---|---|---|
| Total JS size | **Bar** | Simple direct comparison |
| Unused JS share | **Donut** per domain | Used/unused ratio intuitively readable |
| Bundle breakdown (framework / vendor / internal / external) | **Stacked bar** | Ideal for composition comparison |
| Lazy-loaded chunks vs. initial | **Stacked bar** | Initial vs. lazy as two segments |
| Chunk count / median & max size | **Grouped bar** | Three series: count, median, max |
| Individual bundles (drilldown) | **Horizontal bar** | Sortable, name + size + classification |

#### CSS – Frameworks & Sizes

| Metric | Chart type | Rationale |
|---|---|---|
| Total CSS size | **Bar** | Direct comparison |
| Unused CSS share | **Donut** per domain | Same as unused JS |
| Inline `<style>` size & count | **Grouped bar** | Size + count as separate series |
| CSS framework hints (confidence) | **Horizontal bar** (0–100%) | Confidence value per detected framework |

#### Interactivity

- **URL drilldown**: clicking a URL shows a detail view with all individual bundle data and CSS framework hints
- **Domain tabs**: switch between domains and aggregate comparison
- **Cold vs. warm toggle**: switch the view for all time-based metrics
This results in the following runs per URL:

| | `full` | `no-third-party` | `no-tracking-only` |
|---|---|---|---|
| Playwright Cold | ✅ | ✅ | ✅ |
| Playwright Warm (3x, averaged) | ✅ | ✅ | ✅ |
| Lighthouse Cold | ✅ | ✅ | ✅ |
| Lighthouse Warm | ✅ | ✅ | ✅ |### 7b. pnpm Kommandos### 2a. Scenarios

Three scenarios are run per URL, differing in how external requests are blocked:

| Scenario | Description |
|---|---|
| `full` | Everything unfiltered – real user experience |
| `no-third-party` | All external domains blocked via `page.route()` – shows the total third-party impact |
| `no-tracking-only` | Only tracking & pixels blocked, CMP and CDN libraries remain active |

- The delta `full` → `no-third-party` shows the **total third-party overhead**
- The delta `full` → `no-tracking-only` isolates the **pure tracking impact**
- `analyze` – Analyse starten, wahlweise mit explizitem Config- und URL-Dateipfad
- `visualize` – HTML-Report generieren, ein oder mehrere JSON-Reports als Eingabe
- `typecheck` – TypeScript Typprüfung ohne Build
- `lint` – Linting# Tracemark

## User Story: Playwright Performance Analysis Setup

**Date:** March 3, 2026
**Status:** Draft

---

## User Story

> As a web developer / analyst, I want to use a Playwright-based CLI tool that automatically collects performance and bundle metrics for a list of URLs, so that I can quickly and reproducibly compare different domains and their technical implementation.

---

## Acceptance Criteria

---

## 1. Input – URL List

- The URL list is passed exclusively via a **YAML file**
- The file can contain **multiple domains**, each with multiple URLs
- URLs are assigned to a domain/group so that reports can be differentiated by domain
- The YAML format is intentionally minimal:

```yaml
- name: Shop A
  urls:
    - https://shop-a.com/
    - https://shop-a.com/produkt/beispiel
    - https://shop-a.com/kategorie/sale
- name: Shop B
  urls:
    - https://shop-b.com/
    - https://shop-b.com/produkt/beispiel
```

---

## 2. Measurement Setup

> Each URL is measured in **three scenarios**. Each scenario runs the same sequence of cold and warm runs. Lighthouse also runs per scenario. The results of all three scenarios are merged in the JSON report and can be directly compared.

### 2a. Szenarien

Pro URL werden drei Szenarien durchlaufen, die sich in der Blockierung externer Requests unterscheiden:

| Szenario | Beschreibung |
|---|---|
| `full` | Alles ungefiltert – reale Nutzererfahrung |
| `no-third-party` | Alle externen Domains geblockt via `page.route()` – zeigt den gesamten Third-Party-Impact |
| `no-tracking-only` | Nur Tracking & Pixel geblockt, CMP und CDN-Libraries bleiben aktiv |

- Die Differenz `full` → `no-third-party` zeigt den **gesamten Third-Party-Overhead**
- Die Differenz `full` → `no-tracking-only` isoliert den **reinen Tracking-Impact**

### 2b. Runs per Scenario

Within each scenario, the following run sequence is executed per URL:

- **Run 1** – Cold request (no cache, no service workers) → stored separately, marked as `cold`
- **Runs 2–4** – Warm requests (browser cache active) → averaged, stored as `warm_avg`
- A configurable **wait time** between runs (default: 2 seconds)
- The number of warm runs is configurable

### 2c. Lighthouse per Scenario

- Lighthouse runs **independently per scenario** – once on the cold request (run 1) and once on run 2
- Blocking external requests for Lighthouse is implemented via Lighthouse's own request-blocking flags (`--blocked-url-patterns`)
- Lighthouse results are stored per scenario in the JSON report and assigned to the corresponding Playwright measurement

### 2d. Gesamtübersicht Messläufe

Pro URL ergeben sich damit folgende Messläufe:

| | `full` | `no-third-party` | `no-tracking-only` |
|---|---|---|---|
| Playwright Cold | ✅ | ✅ | ✅ |
| Playwright Warm (3x, gemittelt) | ✅ | ✅ | ✅ |
| Lighthouse Cold | ✅ | ✅ | ✅ |
| Lighthouse Warm | ✅ | ✅ | ✅ |

---

## 3. Measured Metrics

> Metrics are collected **per scenario** (`full`, `no-third-party`, `no-tracking-only`) and are divided into three areas: Lighthouse metrics (3a), bundle & framework metrics via Playwright (3b), and third-party delta metrics (3c). 3c is not a separate measurement run — it is calculated from the deltas between scenarios.

### 3a. Lighthouse Metrics

#### Web Vitals
- **FCP** – First Contentful Paint
- **LCP** – Largest Contentful Paint
- **TBT** – Total Blocking Time
- **CLS** – Cumulative Layout Shift
- **TTI** – Time to Interactive
- **TTFB** – Time to First Byte
- **Performance Score** (0–100)

#### Lighthouse Audits
- Lighthouse runs **fully independently** – without a Playwright browser connection, to avoid interference
- Lighthouse starts and controls its own Chromium process per measurement
- Results are **merged into the JSON report afterwards** (merge via URL as key)
- Lighthouse runs on the **cold request** (run 1) and once on a warm run (run 2)
- Captured audits:
  - `total-byte-weight`
  - `unused-javascript`
  - `unused-css-rules`
  - `render-blocking-resources`
  - `mainthread-work-breakdown`
  - `bootup-time` (JS execution time)
  - `uses-optimized-images`

---

### 3b. Bundle & Framework Metrics (Playwright)

#### HTML Payload
- Size of the initial HTML response (transfer size, compressed and uncompressed)
- SSR vs. CSR detection: rendered markup vs. empty shell document
- Detection of SSR/RSC indicators: `__NEXT_DATA__`, `__RSC_PAYLOAD__`
- Size and count of **inline `<script>` tags** in the HTML (relevant for hydration payloads)
- Detection of **`<link rel="preload">` and `<link rel="prefetch">`** hints (count + resource type)

#### JavaScript – Bundles
- Total size of all loaded JS files (transfer size + content length)
- Share of **unused JavaScript** via Playwright Coverage API
- Individual listing of all JS files with name, size, classification, and used/unused ratio
- Detection of **dynamically loaded chunks** (lazy loading via `import()`) – reported separately
- **Chunk splitting analysis:** total chunk count, median and max size per chunk
- **Bundle classification** via URL pattern matching + DOM inspection:

**Next.js:**
  - `/_next/static/chunks/framework-*.js` → `framework` (React core)
  - `/_next/static/chunks/pages/**` → `internal-page` (page-specific bundles)
  - `/_next/static/chunks/main-*.js` → `internal-shell` (app shell)
  - `/_next/static/chunks/*.js` (other) → `vendor` (third-party libraries)

**React standalone (Vite / CRA):**
  - `/assets/index-*.js` (Vite) or `static/js/main.*.js` (CRA) → `internal`
  - Empty `<div id="root">` in initial HTML → CSR indicator
  - No `_next` prefix and no RSC payload → classified as React without Next.js

**Third-party detection** (via URL patterns of known services):
  - Analytics: `gtm`, `analytics`, `segment`, `hotjar`
  - Payment: `stripe`, `paypal`
  - Support/Chat: `intercom`, `zendesk`, `crisp`
  - Other external hosts → `external`
  - Not classifiable → `unknown`

#### CSS – Frameworks & Sizes
- Total size of all loaded CSS files
- Share of **unused CSS** via Playwright Coverage API
- Count and size of **inline `<style>` tags** in the DOM
- **Indirect CSS framework detection** based on class patterns in the DOM:
  - **Tailwind CSS:** utility classes like `flex`, `mt-4`, `text-sm`, `px-*` → small or no external CSS file
  - **Styled Components:** hashed class names like `sc-xxxxxx`, many dynamic `<style>` tags, larger JS bundle
  - **CSS Modules:** patterns like `ComponentName_class__hash`
  - Detection confidence is stored as a `hint` with probability (no hard boolean)

---

### 3c. Third-Party Impact – Delta Metrics

> 3c is **not a separate measurement run**. The values are derived from the deltas between the `full`, `no-third-party`, and `no-tracking-only` scenarios already collected in 3a and 3b. 3c defines which deltas are calculated and reported.

#### Classification of External Scripts

**Consent & CMP (Cookie Management Platforms)**
- Usercentrics, OneTrust, CookieBot, Consentmanager
- Particularly relevant: often loaded synchronously and render-blocking

**Tag Managers**
- Google Tag Manager, Tealium
- GTM is often a container for many additional scripts – reported separately

**Analytics**
- eTracker, Matomo, Piano, Google Analytics, Segment

**Tracking Pixels & Beacons**
- Facebook Pixel, Twitter/X Pixel, TikTok Pixel, Optimizely, AB Tasty, VWO

**Other Third-Party**
- Chat widgets: Intercom, Zendesk, Crisp
- A/B testing: VWO, AB Tasty
- CDN-hosted libraries (e.g. jQuery via cdnjs)

#### Measured Delta Metrics

- **External JS size** – how many KB are attributable to external scripts per category
- **Number of external requests** – total and per category
- **Render-blocking external scripts** – which external scripts block the initial render
- **Load time delta** – LCP, TTI, TBT comparing `full` vs. `no-third-party`
- **Outgoing tracking beacons** – count of `navigator.sendBeacon()` and pixel requests
- **Category breakdown** – size and request count per category (CMP, analytics, pixels, etc.)

---

## 4. Output – JSON Report

- The report is saved as a **JSON file**
- One report file contains **all measured domains and URLs** of a single analysis run
- The filename includes a timestamp, e.g. `report_2026-03-03T14-00-00.json`
- All size values in **bytes** (integer), no parallel human-readable string
- The report is valid JSON and can be processed programmatically
- The structure follows established formats: Lighthouse JSON (`transferSize`, `resourceSize`, `numericValue`), WebPageTest (`median`, `runs[]`), and CDP field names

```json
{
  "meta": {
    "timestamp": "2026-03-03T14:00:00Z",
    "version": "1.0.0",
    "config": {
      "warmRuns": 3,
      "waitBetweenRuns": 2000,
      "scenarios": ["full", "no-third-party", "no-tracking-only"]
    }
  },
  "domains": [
    {
      "name": "Shop A",
      "urls": [
        {
          "url": "https://shop-a.com/",
          "status": "ok",
          "scenarios": {
            "full": {
              "playwright": {
                "cold": {
                  "html": {
                    "transferSize": 42300,
                    "resourceSize": 148200,
                    "isSSR": true,
                    "hasRSC": false,
                    "hasNextData": true,
                    "inlineScripts": {
                      "count": 3,
                      "totalSize": 18400
                    },
                    "preloadHints": {
                      "script": 4,
                      "style": 2,
                      "font": 3
                    },
                    "prefetchHints": {
                      "script": 2
                    }
                  },
                  "javascript": {
                    "transferSize": 384200,
                    "resourceSize": 1102400,
                    "unusedBytes": 198400,
                    "unusedRatio": 0.18,
                    "chunks": {
                      "total": 14,
                      "initialCount": 8,
                      "lazyCount": 6,
                      "medianSize": 28400,
                      "maxSize": 142000
                    },
                    "bundles": [
                      {
                        "url": "/_next/static/chunks/framework-abc123.js",
                        "classification": "framework",
                        "transferSize": 142000,
                        "resourceSize": 442000,
                        "unusedBytes": 12000,
                        "unusedRatio": 0.08,
                        "isLazy": false
                      },
                      {
                        "url": "/_next/static/chunks/pages/index-def456.js",
                        "classification": "internal-page",
                        "transferSize": 28400,
                        "resourceSize": 84200,
                        "unusedBytes": 4200,
                        "unusedRatio": 0.15,
                        "isLazy": false
                      }
                    ]
                  },
                  "css": {
                    "transferSize": 28100,
                    "resourceSize": 142000,
                    "unusedBytes": 98400,
                    "unusedRatio": 0.69,
                    "inline": {
                      "count": 4,
                      "totalSize": 8200
                    },
                    "frameworkHints": [
                      { "framework": "tailwind", "confidence": 0.91 },
                      { "framework": "css-modules", "confidence": 0.12 }
                    ]
                  },
                  "thirdParty": {
                    "totalTransferSize": 184200,
                    "totalRequests": 24,
                    "beacons": 6,
                    "renderBlockingCount": 2,
                    "byCategory": {
                      "cmp": {
                        "transferSize": 42000,
                        "requests": 3,
                        "providers": ["usercentrics"]
                      },
                      "tagManager": {
                        "transferSize": 28000,
                        "requests": 1,
                        "providers": ["gtm"]
                      },
                      "analytics": {
                        "transferSize": 38000,
                        "requests": 4,
                        "providers": ["ga4", "etracker"]
                      },
                      "tracking": {
                        "transferSize": 48200,
                        "requests": 12,
                        "providers": ["facebook-pixel", "tiktok-pixel"]
                      },
                      "other": {
                        "transferSize": 28000,
                        "requests": 4,
                        "providers": ["intercom"]
                      }
                    }
                  }
                },
                "warmRuns": [
                  { "html": {}, "javascript": {}, "css": {}, "thirdParty": {} },
                  { "html": {}, "javascript": {}, "css": {}, "thirdParty": {} },
                  { "html": {}, "javascript": {}, "css": {}, "thirdParty": {} }
                ],
                "warmAvg": {
                  "html": { "transferSize": 8200 },
                  "javascript": { "transferSize": 184200 },
                  "css": { "transferSize": 14200 },
                  "thirdParty": { "totalTransferSize": 142000 }
                }
              },
              "lighthouse": {
                "cold": {
                  "performanceScore": 0.61,
                  "audits": {
                    "first-contentful-paint": { "numericValue": 1840, "displayValue": "1.8 s" },
                    "largest-contentful-paint": { "numericValue": 3200, "displayValue": "3.2 s" },
                    "total-blocking-time": { "numericValue": 420, "displayValue": "420 ms" },
                    "cumulative-layout-shift": { "numericValue": 0.04, "displayValue": "0.04" },
                    "interactive": { "numericValue": 4800, "displayValue": "4.8 s" },
                    "server-response-time": { "numericValue": 280, "displayValue": "280 ms" },
                    "total-byte-weight": { "numericValue": 1842400 },
                    "unused-javascript": { "numericValue": 198400 },
                    "unused-css-rules": { "numericValue": 98400 },
                    "render-blocking-resources": { "numericValue": 620 },
                    "bootup-time": { "numericValue": 1840 },
                    "mainthread-work-breakdown": { "numericValue": 3200 }
                  }
                },
                "warm": {
                  "performanceScore": 0.78,
                  "audits": {
                    "first-contentful-paint": { "numericValue": 980 },
                    "largest-contentful-paint": { "numericValue": 1840 },
                    "total-blocking-time": { "numericValue": 180 },
                    "cumulative-layout-shift": { "numericValue": 0.02 },
                    "interactive": { "numericValue": 2400 },
                    "server-response-time": { "numericValue": 120 }
                  }
                }
              }
            },
            "no-third-party": {
              "playwright": { "cold": {}, "warmAvg": {} },
              "lighthouse": { "cold": {}, "warm": {} }
            },
            "no-tracking-only": {
              "playwright": { "cold": {}, "warmAvg": {} },
              "lighthouse": { "cold": {}, "warm": {} }
            }
          },
          "deltas": {
            "full_vs_noThirdParty": {
              "javascript": { "transferSize": -184200 },
              "thirdParty": { "totalTransferSize": -184200, "totalRequests": -24 },
              "lighthouse": {
                "cold": {
                  "largest-contentful-paint": -980,
                  "total-blocking-time": -280,
                  "interactive": -1400,
                  "performanceScore": 0.17
                }
              }
            },
            "full_vs_noTrackingOnly": {
              "javascript": { "transferSize": -76200 },
              "thirdParty": { "totalTransferSize": -76200, "totalRequests": -16 },
              "lighthouse": {
                "cold": {
                  "largest-contentful-paint": -420,
                  "total-blocking-time": -140,
                  "interactive": -620,
                  "performanceScore": 0.08
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

---

## 5. Visualization – HTML Report

> The visualization is a **separate script** that takes one or more JSON reports as input and generates an interactive HTML file.

### Requirements

- Invoked via CLI with one or more JSON report paths as arguments
- The HTML file is **self-contained** (no external server required, all assets inline or via CDN link)
- **2 to 3 domains** can be compared simultaneously
- The visualization runs in the browser without a build step

### Darstellung

#### Übersicht & Scores

| Ansicht | Chart-Typ | Begründung |
|---|---|---|
| Übersichts-Dashboard | **Metric Cards** | Kompakte KPIs: Performance Score, JS total, CSS total, LCP |
| Lighthouse Performance Score | **Gauge** | Klassisch für Scores 0–100, sofort lesbar |
| Alle URLs tabellarisch | **Sortierbare Tabelle** | Kein Chart – Tabelle ist hier überlegen |

#### Lighthouse – Web Vitals

| Metrik | Chart-Typ | Begründung |
|---|---|---|
| FCP, LCP, TTI, TBT, TTFB | **Grouped Bar** | Direkter Vergleich mehrerer Domains nebeneinander |
| CLS | **Grouped Bar** | Analog zu den anderen Vitals, Achse an kleine Werte angepasst |
| Cold vs. Warm (alle Vitals) | **Grouped Bar** (2 Gruppen pro Domain) | Cold/Warm als Gruppe, Domains als Farben |

#### HTML Payload

| Metrik | Chart-Typ | Begründung |
|---|---|---|
| Transfer-Size komprimiert vs. unkomprimiert | **Grouped Bar** | Zwei Balken pro Domain |
| SSR vs. CSR Indikator | **Badge / Label** | Kein Chart – Textlabel reicht |
| Inline Script Größe & Anzahl | **Grouped Bar** | Größe + Anzahl als separate Serien |
| Preload / Prefetch Hints | **Grouped Bar** | Anzahl nach Ressourcentyp aufgeteilt |

#### JavaScript – Bundles

| Metrik | Chart-Typ | Begründung |
|---|---|---|
| JS Gesamtgröße | **Bar** | Einfacher Direktvergleich |
| Unused JS Anteil | **Donut** pro Domain | Used/Unused Verhältnis intuitiv lesbar |
| Bundle-Gliederung (framework / vendor / internal / external) | **Stacked Bar** | Ideal für Zusammensetzung im Vergleich |
| Lazy-geladene Chunks vs. initial | **Stacked Bar** | Initial vs. lazy als zwei Segmente |
| Chunk-Anzahl / Median- & Max-Größe | **Grouped Bar** | Drei Serien: count, median, max |
| Einzelne Bundles (Drilldown) | **Horizontal Bar** | Sortierbar, Name + Größe + Klassifizierung |

#### CSS – Frameworks & Größen

| Metrik | Chart-Typ | Begründung |
|---|---|---|
| CSS Gesamtgröße | **Bar** | Direkter Vergleich |
| Unused CSS Anteil | **Donut** pro Domain | Analog zu Unused JS |
| Inline `<style>` Größe & Anzahl | **Grouped Bar** | Größe + Anzahl als separate Serien |
| CSS Framework Hints (Konfidenz) | **Horizontal Bar** (0–100%) | Konfidenz-Wert pro erkanntem Framework |

#### Interaktivität

- **URL-Drilldown**: Klick auf eine URL zeigt Detailansicht mit allen Bundle-Einzeldaten und CSS-Framework-Hints
- **Domain-Tabs**: Umschalten zwischen Domains und Gesamtvergleich
- **Cold vs. Warm Toggle**: Umschalten der Ansicht für alle Zeitmetriken

---

---

## 6. Non-Functional Requirements

- The tool runs on **macOS and Linux** via CLI
- Dependencies are resolved via `pnpm install`
- Configuration (number of runs, timeouts, Lighthouse flags) is handled via a **config.yaml**
- Errors on individual URLs (timeout, 404, etc.) do not abort the entire run – failed URLs are marked as `"status": "error"` in the report
- The tool runs **headless** (no visible browser window required, but optionally activatable)

---

## 7. Dependencies / Tech Stack

### 7a. Technologies

- **Runtime:** Node.js >= 20
- **Package manager:** pnpm
- **Language:** TypeScript (strict mode)
- `playwright` – browser control, network interceptor, Coverage API
- `lighthouse` – programmatic Lighthouse execution
- `js-yaml` – parsing the URL input file
- **Visualization:** self-contained HTML, no build pipeline, runs directly in the browser
  - **ECharts** (via CDN) – charting library for all diagram types (stacked bar, gauge, grouped bar, donut)
  - **Alpine.js** (via CDN) – lightweight reactive framework for UI interactivity (tabs, drilldown, filter)
  - The JSON report is loaded at runtime via `fetch()` or embedded inline directly
  - No build step, no runtime framework (no Next.js, no Vite, no React)

### 7b. pnpm Kommandos

| Kommando | Beschreibung |
|---|---|
| `pnpm install` | Abhängigkeiten installieren |
| `pnpm run analyze` | Analyse starten (Standard-Config + Standard-URL-Liste) |
| `pnpm run analyze --config config.yaml --urls urls/example.yaml` | Analyse mit expliziten Dateipfaden starten |
| `pnpm run visualize --reports reports/shop-a/2026-03-03T14-00-00/report.json` | HTML-Report für einen Run generieren |
| `pnpm run visualize --reports reports/shop-a/.../report.json reports/shop-b/.../report.json` | Vergleichs-Report für mehrere Domains generieren |
| `pnpm run typecheck` | TypeScript Typprüfung ohne Build |
| `pnpm run lint` | Linting |

### 7c. Ordnerstruktur

```
├── urls/                        # YAML-Dateien mit URL-Listen
│   ├── README.md
│   └── example.yaml
├── reports/                     # Generierte Reports (nicht ins Git)
│   ├── README.md
│   └── <domain-slug>/           # Ein Ordner pro Domain
│       └── <timestamp>/         # Ein Unterordner pro Test-Run (ISO 8601)
│           ├── report.json
│           └── report.html
├── src/
│   ├── README.md
│   ├── analyzer/                # Playwright-Messlogik
│   │   ├── README.md
│   │   ├── index.ts
│   │   ├── html.ts
│   │   ├── javascript.ts
│   │   ├── css.ts
│   │   └── thirdParty.ts
│   ├── lighthouse/              # Lighthouse-Integration
│   │   ├── README.md
│   │   ├── index.ts
│   │   └── audits.ts
│   ├── scenarios/               # Szenario-Steuerung
│   │   ├── README.md
│   │   └── index.ts
│   ├── reporter/                # JSON-Report-Erstellung & Merge
│   │   ├── README.md
│   │   └── index.ts
│   ├── visualizer/              # HTML-Visualisierung
│   │   ├── README.md
│   │   └── index.ts
│   ├── classifier/              # Bundle- & Third-Party-Klassifizierung
│   │   ├── README.md
│   │   ├── bundles.ts
│   │   └── thirdParty.ts
│   └── types/                   # Gemeinsame TypeScript-Typen
│       ├── README.md
│       └── index.ts
├── config.yaml                  # Globale Konfiguration
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### 7d. URL List Format (`urls/`)

The YAML files under `urls/` define the domains and URLs to be measured. Format is intentionally minimal:

```yaml
- name: Shop A
  urls:
    - https://shop-a.com/
    - https://shop-a.com/produkt/beispiel
    - https://shop-a.com/kategorie/sale
- name: Shop B
  urls:
    - https://shop-b.com/
    - https://shop-b.com/produkt/beispiel
```

- `name` is used as the domain slug for the report folder (e.g. `shop-a`)
- Multiple YAML files are supported, e.g. `urls/ecommerce.yaml`, `urls/media.yaml`

### 7e. Report Folder Structure (`reports/`)

Reports are automatically stored under `reports/<domain-slug>/<timestamp>/`:

```
reports/
  shop-a/
    2026-03-03T14-00-00/
      report.json
      report.html
    2026-03-03T18-00-00/
      report.json
      report.html
  shop-b/
    2026-03-03T14-00-00/
      report.json
      report.html
```

- **Domain folder:** slug from the `name` field of the YAML file
- **Timestamp subfolder:** ISO 8601 per run – runs across domains can be linked via matching timestamp
- JSON and HTML always alongside each other in the same run folder
- `reports/` is excluded via `.gitignore`

### 7f. Projekt-Dokumentation

| Datei | Inhalt |
|---|---|
| `README.md` | Projektübersicht, Zweck, Quickstart, Kommandos (EN) |
| `CONTRIBUTING.md` | Setup, Entwicklungsumgebung, Architekturentscheidungen (EN) |
| `AGENTS.md` | Für KI-Agenten: Repo-Struktur, Zweck jedes Ordners, Zusammenspiel der Module (EN) |
| `src/*/README.md` | Purpose des jeweiligen Moduls, Input/Output, Abhängigkeiten zu anderen Modulen (EN) |
| `urls/README.md` | Format der YAML-Dateien, Beispiele (EN) |
| `reports/README.md` | Struktur der generierten Reports, Hinweis auf .gitignore (EN) |

---

## 8. Out of Scope

- Authentication / login-protected pages
- Mobile emulation (can be added as a future extension)
- Continuous monitoring / scheduling
- Comparing more than 3 domains simultaneously in the visualization