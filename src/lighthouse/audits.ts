export const LIGHTHOUSE_AUDITS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'interactive',
  'server-response-time',
  'total-byte-weight',
  'unused-javascript',
  'unused-css-rules',
  'render-blocking-resources',
  'bootup-time',
  'mainthread-work-breakdown',
  'uses-optimized-images',
] as const;

export type LighthouseAuditId = typeof LIGHTHOUSE_AUDITS[number];
