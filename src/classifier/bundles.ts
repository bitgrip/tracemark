import type { BundleClassification } from '../types/index.js';

const THIRD_PARTY_PATTERNS: RegExp[] = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /analytics\.google\.com/i,
  /segment\.com/i,
  /cdn\.segment\.com/i,
  /hotjar\.com/i,
  /js\.stripe\.com/i,
  /paypal\.com/i,
  /widget\.intercom\.io/i,
  /static\.zdassets\.com/i,
  /zendesk\.com/i,
  /client\.crisp\.chat/i,
];

const NEXT_FRAMEWORK_RE = /\/_next\/static\/chunks\/framework-[^/]+\.js/;
const NEXT_PAGES_RE = /\/_next\/static\/chunks\/pages\//;
const NEXT_MAIN_RE = /\/_next\/static\/chunks\/main-[^/]+\.js/;
const NEXT_CHUNK_RE = /\/_next\/static\/chunks\/[^/]+\.js/;

const VITE_INTERNAL_RE = /\/assets\/index-[^/]+\.js/;
const CRA_INTERNAL_RE = /static\/js\/main\.[^/]+\.js/;

export function classifyBundle(url: string): BundleClassification {
  let pathname: string;
  try {
    // Handle both absolute URLs and path-only URLs
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      const parsed = new URL(url, 'https://placeholder.local');
      pathname = parsed.pathname;
    } else {
      pathname = url;
    }
  } catch {
    return 'unknown';
  }

  // Check third-party patterns against the full URL
  for (const pattern of THIRD_PARTY_PATTERNS) {
    if (pattern.test(url)) {
      return 'external';
    }
  }

  // Next.js patterns (order matters: more specific first)
  if (NEXT_FRAMEWORK_RE.test(pathname)) return 'framework';
  if (NEXT_PAGES_RE.test(pathname)) return 'internal-page';
  if (NEXT_MAIN_RE.test(pathname)) return 'internal-shell';
  if (NEXT_CHUNK_RE.test(pathname)) return 'vendor';

  // React standalone (Vite / CRA)
  if (VITE_INTERNAL_RE.test(pathname)) return 'internal';
  if (CRA_INTERNAL_RE.test(pathname)) return 'internal';

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

  // Next.js chunks that are NOT framework, main, or pages are typically lazy-loaded
  if (NEXT_CHUNK_RE.test(pathname)) {
    return (
      !NEXT_FRAMEWORK_RE.test(pathname) &&
      !NEXT_MAIN_RE.test(pathname) &&
      !NEXT_PAGES_RE.test(pathname)
    );
  }

  return false;
}
