import type { ThirdPartyCategory } from '../types/index.js';

export interface ThirdPartyClassification {
  category: ThirdPartyCategory;
  provider: string;
}

interface ProviderRule {
  pattern: RegExp;
  provider: string;
  category: ThirdPartyCategory;
}

const PROVIDER_RULES: ProviderRule[] = [
  // CMP (Cookie Management Platforms)
  { pattern: /usercentrics\.eu/i, provider: 'usercentrics', category: 'cmp' },
  { pattern: /app\.usercentrics\.eu/i, provider: 'usercentrics', category: 'cmp' },
  { pattern: /cdn\.cookielaw\.org/i, provider: 'onetrust', category: 'cmp' },
  { pattern: /onetrust\.com/i, provider: 'onetrust', category: 'cmp' },
  { pattern: /consent\.cookiebot\.com/i, provider: 'cookiebot', category: 'cmp' },
  { pattern: /cookiebot\.com/i, provider: 'cookiebot', category: 'cmp' },
  { pattern: /consentmanager\.net/i, provider: 'consentmanager', category: 'cmp' },
  { pattern: /cdn\.consentmanager\.net/i, provider: 'consentmanager', category: 'cmp' },

  // Tag Managers
  { pattern: /googletagmanager\.com/i, provider: 'gtm', category: 'tagManager' },
  { pattern: /tags\.tiqcdn\.com/i, provider: 'tealium', category: 'tagManager' },
  { pattern: /tealium\.com/i, provider: 'tealium', category: 'tagManager' },

  // Analytics
  { pattern: /etracker\.com/i, provider: 'etracker', category: 'analytics' },
  { pattern: /cdn\.etracker\.com/i, provider: 'etracker', category: 'analytics' },
  { pattern: /matomo\./i, provider: 'matomo', category: 'analytics' },
  { pattern: /cdn\.matomo\./i, provider: 'matomo', category: 'analytics' },
  { pattern: /piano\.io/i, provider: 'piano', category: 'analytics' },
  { pattern: /cdn\.piano\.io/i, provider: 'piano', category: 'analytics' },
  { pattern: /google-analytics\.com/i, provider: 'ga4', category: 'analytics' },
  { pattern: /analytics\.google\.com/i, provider: 'ga4', category: 'analytics' },
  { pattern: /googletagmanager\.com\/gtag/i, provider: 'ga4', category: 'analytics' },
  { pattern: /cdn\.segment\.com/i, provider: 'segment', category: 'analytics' },
  { pattern: /api\.segment\.io/i, provider: 'segment', category: 'analytics' },
  { pattern: /segment\.com/i, provider: 'segment', category: 'analytics' },

  // Tracking Pixels & Beacons
  { pattern: /connect\.facebook\.net/i, provider: 'facebook-pixel', category: 'tracking' },
  { pattern: /facebook\.com\/tr/i, provider: 'facebook-pixel', category: 'tracking' },
  { pattern: /static\.ads-twitter\.com/i, provider: 'twitter-pixel', category: 'tracking' },
  { pattern: /analytics\.twitter\.com/i, provider: 'twitter-pixel', category: 'tracking' },
  { pattern: /t\.co\/i\/adsct/i, provider: 'twitter-pixel', category: 'tracking' },
  { pattern: /analytics\.tiktok\.com/i, provider: 'tiktok-pixel', category: 'tracking' },
  { pattern: /cdn\.optimizely\.com/i, provider: 'optimizely', category: 'tracking' },
  { pattern: /optimizely\.com/i, provider: 'optimizely', category: 'tracking' },
  { pattern: /try\.abtasty\.com/i, provider: 'abtasty', category: 'tracking' },
  { pattern: /abtasty\.com/i, provider: 'abtasty', category: 'tracking' },
  { pattern: /dev\.visualwebsiteoptimizer\.com/i, provider: 'vwo', category: 'tracking' },
  { pattern: /vwo\.com/i, provider: 'vwo', category: 'tracking' },

  // Other
  { pattern: /widget\.intercom\.io/i, provider: 'intercom', category: 'other' },
  { pattern: /intercom\.io/i, provider: 'intercom', category: 'other' },
  { pattern: /static\.zdassets\.com/i, provider: 'zendesk', category: 'other' },
  { pattern: /zendesk\.com/i, provider: 'zendesk', category: 'other' },
  { pattern: /client\.crisp\.chat/i, provider: 'crisp', category: 'other' },
  { pattern: /crisp\.chat/i, provider: 'crisp', category: 'other' },
  { pattern: /cdnjs\.cloudflare\.com/i, provider: 'cdnjs', category: 'other' },
  { pattern: /cdn\.jsdelivr\.net/i, provider: 'jsdelivr', category: 'other' },
  { pattern: /unpkg\.com/i, provider: 'unpkg', category: 'other' },
];

export function classifyThirdParty(url: string): ThirdPartyClassification | null {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch {
    return null;
  }

  if (!hostname) return null;

  for (const rule of PROVIDER_RULES) {
    if (rule.pattern.test(url)) {
      return { category: rule.category, provider: rule.provider };
    }
  }

  return null;
}

export function isThirdParty(requestUrl: string, pageUrl: string): boolean {
  try {
    const reqHost = new URL(requestUrl).hostname;
    const pageHost = new URL(pageUrl).hostname;

    // Extract registrable domain, handling common multi-part TLDs
    const MULTI_PART_TLDS = new Set([
      'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in', 'co.id',
      'com.au', 'com.br', 'com.cn', 'com.mx', 'com.tw', 'com.hk', 'com.sg',
      'org.uk', 'net.au', 'ac.uk', 'gov.uk', 'or.jp', 'ne.jp',
    ]);

    const getRoot = (host: string): string => {
      const parts = host.toLowerCase().split('.');
      if (parts.length <= 2) return parts.join('.');
      const lastTwo = parts.slice(-2).join('.');
      if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
      return lastTwo;
    };

    return getRoot(reqHost) !== getRoot(pageHost);
  } catch {
    return false;
  }
}
