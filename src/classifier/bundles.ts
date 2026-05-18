import type { BundleClassification } from '../types/index.js';
import { classifyThirdParty } from './thirdParty.js';

// ─── Third-party detection by URL pattern ────────────────────────────────
// These complement the thirdParty classifier when we need bundle-level categories

interface ExternalRule {
  pattern: RegExp;
  classification: BundleClassification;
}

const EXTERNAL_RULES: ExternalRule[] = [
  // CMP
  { pattern: /usercentrics\.eu/i, classification: 'cmp' },
  { pattern: /cookielaw\.org/i, classification: 'cmp' },
  { pattern: /onetrust\.com/i, classification: 'cmp' },
  { pattern: /cookiebot\.com/i, classification: 'cmp' },
  { pattern: /consentmanager\.net/i, classification: 'cmp' },
  { pattern: /privacy-proxy\./i, classification: 'cmp' },

  // Tag Manager
  { pattern: /googletagmanager\.com/i, classification: 'tag-manager' },
  { pattern: /tags\.tiqcdn\.com/i, classification: 'tag-manager' },
  { pattern: /tealium\.com/i, classification: 'tag-manager' },
  { pattern: /\/gtm\.js/i, classification: 'tag-manager' },

  // Analytics
  { pattern: /google-analytics\.com/i, classification: 'analytics' },
  { pattern: /analytics\.google\.com/i, classification: 'analytics' },
  { pattern: /\/gtag\/js/i, classification: 'analytics' },
  { pattern: /etracker\.com/i, classification: 'analytics' },
  { pattern: /matomo\./i, classification: 'analytics' },
  { pattern: /piano\.io/i, classification: 'analytics' },
  { pattern: /cdn\.segment\.com/i, classification: 'analytics' },
  { pattern: /plausible\.io/i, classification: 'analytics' },
  { pattern: /hotjar\.com/i, classification: 'analytics' },
  { pattern: /clarity\.ms/i, classification: 'analytics' },
  // First-party analytics proxy patterns (common filenames)
  { pattern: /\/o\.js$/i, classification: 'analytics' },
  { pattern: /\/e\.js$/i, classification: 'analytics' },

  // Tracking / external
  { pattern: /connect\.facebook\.net/i, classification: 'external' },
  { pattern: /cdn\.optimizely\.com/i, classification: 'external' },
  { pattern: /optimizely\.com/i, classification: 'external' },
  { pattern: /abtasty\.com/i, classification: 'external' },
  { pattern: /segment\.com/i, classification: 'external' },
  { pattern: /js\.stripe\.com/i, classification: 'external' },
  { pattern: /paypal\.com/i, classification: 'external' },
  { pattern: /widget\.intercom\.io/i, classification: 'external' },
  { pattern: /static\.zdassets\.com/i, classification: 'external' },
  { pattern: /zendesk\.com/i, classification: 'external' },
  { pattern: /client\.crisp\.chat/i, classification: 'external' },
  { pattern: /cdnjs\.cloudflare\.com/i, classification: 'vendor' },
  { pattern: /cdn\.jsdelivr\.net/i, classification: 'vendor' },
  { pattern: /unpkg\.com/i, classification: 'vendor' },
];

// ─── First-party framework patterns ─────────────────────────────────────

// Next.js
const NEXT_FRAMEWORK_RE = /\/_next\/static\/chunks\/framework-[^/]+\.js/;
const NEXT_PAGES_RE = /\/_next\/static\/chunks\/pages\//;
const NEXT_MAIN_RE = /\/_next\/static\/chunks\/main-[^/]+\.js/;
const NEXT_WEBPACK_RE = /\/_next\/static\/chunks\/webpack-[^/]+\.js/;
const NEXT_POLYFILLS_RE = /\/_next\/static\/chunks\/polyfills-[^/]+\.js/;
const NEXT_MANIFEST_RE = /\/_next\/static\/[^/]+\/_(?:buildManifest|ssgManifest)\.js/;
const NEXT_APP_RE = /\/_next\/static\/chunks\/app\//;
const NEXT_CHUNK_RE = /\/_next\/static\/chunks\/[^/]+\.js/;

// Astro (uses /_/ prefix with hashed filenames)
const ASTRO_PAGE_RE = /\/_\/page-[A-Za-z0-9]+\.js/;
const ASTRO_CHUNK_RE = /\/_\/chunk-[A-Za-z0-9]+\.js/;
const ASTRO_COMPONENT_RE = /\/_\/[A-Z][a-zA-Z0-9]+-[A-Za-z0-9]+\.js/;
const ASTRO_VENDOR_RE = /\/_\/[a-z][a-z0-9.-]+-[A-Za-z0-9]+\.js/;

// Nuxt / Vue
const NUXT_BUILD_RE = /\/_nuxt\/[^/]+\.js/;
const NUXT_ENTRY_RE = /\/_nuxt\/entry[.-][^/]+\.js/;

// SvelteKit
const SVELTEKIT_RE = /\/_app\/immutable\//;
const SVELTEKIT_CHUNKS_RE = /\/_app\/immutable\/chunks\//;
const SVELTEKIT_ENTRY_RE = /\/_app\/immutable\/entry\//;

// Remix
const REMIX_BUILD_RE = /\/build\/[^/]+\.js/;

// Gatsby
const GATSBY_RE = /\/static\/js\/[^/]+\.js/;
const GATSBY_FRAMEWORK_RE = /\/static\/js\/framework-[^/]+\.js/;

// Generic Vite / Rollup (assets with hash)
const VITE_ASSET_RE = /\/assets\/[^/]+-[A-Za-z0-9_-]{6,12}\.js/;
const VITE_INDEX_RE = /\/assets\/index-[A-Za-z0-9_-]+\.js/;

// Webpack (numbered chunks or hash-based)
const WEBPACK_CHUNK_RE = /\/(?:static\/)?js\/(?:\d+|[a-f0-9]{8,})\.[a-f0-9]+\.(?:chunk\.)?js/;
const CRA_MAIN_RE = /\/static\/js\/main\.[a-f0-9]+\.js/;

// WordPress
const WP_CONTENT_RE = /\/wp-content\/(?:plugins|themes)\//;
const WP_INCLUDES_RE = /\/wp-includes\/js\//;

/**
 * Checks if a URL looks like an HTML document rather than a JS bundle.
 * Coverage data sometimes includes the page document itself.
 */
function isDocumentUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://placeholder.local');
    const path = parsed.pathname;
    // Has no file extension or ends in .html/.htm
    if (/\/$/.test(path)) return true;
    if (/\.html?$/.test(path)) return true;
    // No extension and no hash in the filename (e.g., /path/to/page)
    const lastSegment = path.split('/').pop() || '';
    if (!lastSegment.includes('.')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the registrable domain from a hostname (e.g., "www.unicef.de" → "unicef.de")
 */
function getRegistrableDomain(hostname: string): string {
  const MULTI_PART_TLDS = new Set([
    'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in', 'co.id',
    'com.au', 'com.br', 'com.cn', 'com.mx', 'com.tw', 'com.hk', 'com.sg',
    'org.uk', 'net.au', 'ac.uk', 'gov.uk', 'or.jp', 'ne.jp',
  ]);
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

/**
 * Classify a JavaScript bundle URL into a meaningful category.
 * @param url - The script URL to classify
 * @param pageUrl - The page URL (used for first-party vs third-party detection)
 */
export function classifyBundle(url: string, pageUrl?: string): BundleClassification {
  let bundleHostname: string;
  let pathname: string;
  try {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      const parsed = new URL(url, 'https://placeholder.local');
      bundleHostname = parsed.hostname;
      pathname = parsed.pathname;
    } else {
      bundleHostname = '';
      pathname = url;
    }
  } catch {
    return 'unknown';
  }

  // 1. Check third-party external rules (specific services) — before document check
  //    because some tracking URLs look like documents (e.g., /gtag/js)
  for (const rule of EXTERNAL_RULES) {
    if (rule.pattern.test(url)) {
      return rule.classification;
    }
  }

  // 2. If we have a page URL, check if the bundle is from a different domain
  if (pageUrl && bundleHostname) {
    try {
      const pageHostname = new URL(pageUrl).hostname;
      const bundleDomain = getRegistrableDomain(bundleHostname);
      const pageDomain = getRegistrableDomain(pageHostname);
      if (bundleDomain !== pageDomain) {
        // Cross-origin but not matched by specific rules — use thirdParty classifier
        const tp = classifyThirdParty(url);
        if (tp) {
          switch (tp.category) {
            case 'cmp': return 'cmp';
            case 'tagManager': return 'tag-manager';
            case 'analytics': return 'analytics';
            default: return 'external';
          }
        }
        return 'external';
      }
    } catch {
      // If page URL parsing fails, continue with path-based detection
    }
  }

  // 3. Check if it's actually a document URL (not a JS bundle)
  //    This runs after external/cross-origin checks since some tracking
  //    scripts have document-like paths (e.g., /gtag/js)
  if (isDocumentUrl(url)) {
    return 'document';
  }

  // 4. Framework-specific patterns (first-party)

  // Next.js
  if (NEXT_FRAMEWORK_RE.test(pathname) || NEXT_POLYFILLS_RE.test(pathname)) return 'framework';
  if (NEXT_WEBPACK_RE.test(pathname)) return 'framework';
  if (NEXT_MANIFEST_RE.test(pathname)) return 'internal-shell';
  if (NEXT_MAIN_RE.test(pathname)) return 'internal-shell';
  if (NEXT_PAGES_RE.test(pathname)) return 'internal-page';
  if (NEXT_APP_RE.test(pathname)) return 'internal-page';
  if (NEXT_CHUNK_RE.test(pathname)) return 'vendor';

  // Astro
  if (ASTRO_PAGE_RE.test(pathname)) return 'internal-page';
  if (ASTRO_CHUNK_RE.test(pathname)) return 'internal';
  if (ASTRO_COMPONENT_RE.test(pathname)) return 'internal';
  if (ASTRO_VENDOR_RE.test(pathname)) return 'vendor';

  // Nuxt
  if (NUXT_ENTRY_RE.test(pathname)) return 'framework';
  if (NUXT_BUILD_RE.test(pathname)) return 'internal';

  // SvelteKit
  if (SVELTEKIT_ENTRY_RE.test(pathname)) return 'framework';
  if (SVELTEKIT_CHUNKS_RE.test(pathname)) return 'internal';
  if (SVELTEKIT_RE.test(pathname)) return 'internal';

  // Remix
  if (REMIX_BUILD_RE.test(pathname)) return 'internal';

  // Gatsby
  if (GATSBY_FRAMEWORK_RE.test(pathname)) return 'framework';
  if (GATSBY_RE.test(pathname)) return 'internal';

  // WordPress
  if (WP_CONTENT_RE.test(pathname)) return 'vendor';
  if (WP_INCLUDES_RE.test(pathname)) return 'framework';

  // Generic Vite / Rollup
  if (VITE_INDEX_RE.test(pathname)) return 'internal';
  if (VITE_ASSET_RE.test(pathname)) return 'internal';

  // Webpack / CRA
  if (CRA_MAIN_RE.test(pathname)) return 'internal-shell';
  if (WEBPACK_CHUNK_RE.test(pathname)) return 'internal';

  // 5. Heuristic: first-party scripts (same domain, has JS extension)
  if (/\.js$/.test(pathname)) {
    // Named vendor-like files (e.g., postscribe-2.0.8.min.js, jquery.min.js)
    const lastSegment = pathname.split('/').pop() || '';
    if (/\.min\.js$/.test(lastSegment) || /[-.][\d]+\.[\d]+/.test(lastSegment)) {
      return 'vendor';
    }
    // Files with content hashes (likely build output)
    if (/[.-][a-f0-9]{8,}\.js$/.test(lastSegment) || /[-_][A-Za-z0-9]{6,12}\.js$/.test(lastSegment)) {
      return 'internal';
    }
  }

  return 'unknown';
}

export function isLazyChunk(url: string): boolean {
  let pathname: string;
  try {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      const parsed = new URL(url, 'https://placeholder.local');
      pathname = parsed.pathname;
    } else {
      pathname = url;
    }
  } catch {
    return false;
  }

  // Next.js: chunks that are NOT framework, main, webpack, polyfills or pages
  if (NEXT_CHUNK_RE.test(pathname)) {
    return (
      !NEXT_FRAMEWORK_RE.test(pathname) &&
      !NEXT_MAIN_RE.test(pathname) &&
      !NEXT_PAGES_RE.test(pathname) &&
      !NEXT_WEBPACK_RE.test(pathname) &&
      !NEXT_POLYFILLS_RE.test(pathname) &&
      !NEXT_MANIFEST_RE.test(pathname)
    );
  }

  // Astro: chunk-* files are typically lazy (not page entry points)
  if (ASTRO_CHUNK_RE.test(pathname)) return true;

  // Astro: component-level files are lazy-loaded islands
  if (ASTRO_COMPONENT_RE.test(pathname)) return true;

  // Nuxt: anything that's not the entry is lazy
  if (NUXT_BUILD_RE.test(pathname) && !NUXT_ENTRY_RE.test(pathname)) return true;

  // SvelteKit: chunks are lazy
  if (SVELTEKIT_CHUNKS_RE.test(pathname)) return true;

  return false;
}
