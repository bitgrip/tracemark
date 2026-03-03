# classifier/ — Bundle & Third-Party Classification

## Purpose

Classifies JavaScript bundles and third-party network requests by matching URL patterns against known rules. No browser interaction — pure string matching.

## Files

| File | Responsibility |
|---|---|
| `bundles.ts` | Classifies JS file URLs into bundle types |
| `thirdParty.ts` | Classifies request URLs into third-party provider/category; determines if a request is third-party |

## Bundle Classification (`bundles.ts`)

**Input:** JS file URL string

**Output:** `BundleClassification` — one of `framework`, `internal-page`, `internal-shell`, `internal`, `vendor`, `external`, `unknown`

Pattern matching order:
1. Third-party patterns (analytics, payment, chat) → `external`
2. Next.js: `framework-*.js` → `framework`, `pages/**` → `internal-page`, `main-*.js` → `internal-shell`, other chunks → `vendor`
3. React standalone: Vite (`/assets/index-*.js`) or CRA (`static/js/main.*.js`) → `internal`
4. Fallback → `unknown`

Also exports `isLazyChunk()` to detect dynamically loaded Next.js chunks.

## Third-Party Classification (`thirdParty.ts`)

**Input:** Request URL string

**Output:** `ThirdPartyClassification` (`{ category, provider }`) or `null`

Categories: `cmp`, `tagManager`, `analytics`, `tracking`, `other`

Providers include: Usercentrics, OneTrust, CookieBot, GTM, Tealium, GA4, eTracker, Matomo, Facebook Pixel, TikTok Pixel, Intercom, Zendesk, and more.

Also exports `isThirdParty(requestUrl, pageUrl)` which compares registrable domains to determine if a request is external.
