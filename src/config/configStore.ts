import { DomainConfig } from '../types';

/**
 * Default domain configuration
 * Matches backend preset domains
 */
const DEFAULT_DOMAIN_CONFIG: DomainConfig = {
  productiveDomains: [
    // University of Toronto domains
    'q.utoronto.ca',
    'acorn.utoronto.ca',
    'portal.engineering.utoronto.ca',
    'engineering.utoronto.ca',
    'library.utoronto.ca',
    'uoft.me',
    'future.utoronto.ca',
    'registrar.utoronto.ca',
    'studentlife.utoronto.ca',
    'utm.utoronto.ca',
    // Google Workspace
    'docs.google.com',
    'drive.google.com',
    'classroom.google.com',
    'meet.google.com',
    'calendar.google.com',
    // Note-taking and productivity
    'notion.so',
    'evernote.com',
    'onenote.com',
    'todoist.com',
    'trello.com',
    // Code repositories
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    // Developer resources
    'stackoverflow.com',
    'stackoverflowteams.com',
    'leetcode.com',
    'hackerrank.com',
    'codeforces.com',
    'codewars.com',
    'kaggle.com',
    'w3schools.com',
    'developer.mozilla.org',
    'geeksforgeeks.org',
    'cplusplus.com',
    'python.org',
    // Education platforms
    'khanacademy.org',
    'coursera.org',
    'edx.org',
    'udemy.com',
    'brilliant.org',
    // Math and science tools
    'wolframalpha.com',
    'desmos.com',
    // Academic and research
    'overleaf.com',
    'grammarly.com',
    'deepdyve.com',
    'scholar.google.com',
    'jstor.org',
    'ieeexplore.ieee.org',
    'sciencedirect.com',
    'researchgate.net',
    // Design tools
    
  ],
  unproductiveDomains: [
    // Social media
    'youtube.com',
    'tiktok.com',
    'instagram.com',
    'facebook.com',
    'x.com',
    'snapchat.com',
    'reddit.com',
    'pinterest.com',
    'tumblr.com',
    'discord.com',
    // Video streaming
    'netflix.com',
    'primevideo.com',
    'disneyplus.com',
    'hulu.com',
    'crunchyroll.com',
    'twitch.tv',
    // Music streaming
    'spotify.com',
    'soundcloud.com',
    'deezer.com',
    'applemusic.com',
    // Gaming
    'roblox.com',
    'store.steampowered.com',
    'epicgames.com',
    'playstation.com',
    'xbox.com',
    // Entertainment/meme sites
    '9gag.com',
    'boredpanda.com',
    'buzzfeed.com',
    'thechive.com',
    'ifunny.co',
    // Shopping
    'amazon.com',
    'ebay.com',
    'aliexpress.com',
    'shein.com',
    'walmart.com',
    'etsy.com',
    'bestbuy.com',
    'costco.com',
    'ikea.com',
    'homedepot.com',
    // Adult content platforms
    'onlyfans.com',
    'patreon.com',
    // Other entertainment
    'kick.com',
    'yikyak.com',
    'omegle.com',
    // Travel/booking (often distracting)
    'tripadvisor.com',
    'booking.com',
    'airbnb.com',
    'expedia.com',
    // Food delivery
    'ubereats.com',
  ],
};

/**
 * Load domain configuration from chrome.storage.sync or return defaults
 */
export async function loadDomainConfig(): Promise<DomainConfig> {
  try {
    const result = await chrome.storage.sync.get(['domainConfig']);
    if (result.domainConfig) {
      return result.domainConfig as DomainConfig;
    }
  } catch (error) {
    console.warn('Failed to load domain config from sync storage:', error);
  }
  
  // Return defaults if not found or error
  return DEFAULT_DOMAIN_CONFIG;
}

/**
 * Save domain configuration to chrome.storage.sync
 */
export async function saveDomainConfig(config: DomainConfig): Promise<void> {
  try {
    await chrome.storage.sync.set({ domainConfig: config });
  } catch (error) {
    console.error('Failed to save domain config to sync storage:', error);
    throw error;
  }
}

/**
 * Get domain classification from backend API (with fallback to local config)
 */
async function getDomainClassificationFromAPI(domain: string, authToken: string | null): Promise<'productive' | 'unproductive' | 'neutral' | null> {
  if (!authToken) return null;

  // Hardcoded: q.utoronto.ca is always productive (check before API call)
  const normalizedDomain = domain.toLowerCase().trim();
  if (normalizedDomain === 'q.utoronto.ca' || 
      normalizedDomain.endsWith('.q.utoronto.ca') ||
      normalizedDomain.includes('q.utoronto.ca')) {
    console.log('[getDomainClassificationFromAPI] ✅ q.utoronto.ca HARDCODED as productive:', normalizedDomain);
    return 'productive';
  }

  try {
    const { getApiUrl } = await import('./api');
    const url = `${getApiUrl('/domains/classification')}?domain=${encodeURIComponent(domain)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[getDomainClassificationFromAPI] API response for', domain, ':', data);
      // Convert backend type to extension type
      if (data.type === 'PRODUCTIVE') return 'productive';
      if (data.type === 'UNPRODUCTIVE') return 'unproductive';
      return 'neutral';
    }
  } catch (error) {
    console.warn('Failed to fetch domain classification from API:', error);
  }

  return null;
}

/**
 * Get domain classification: 'productive' | 'unproductive' | 'neutral'
 * Tries backend API first, falls back to local config (merging defaults with cached)
 */
export async function classifyDomain(domain: string | null): Promise<'productive' | 'unproductive' | 'neutral'> {
  if (!domain) {
    return 'neutral';
  }

  const normalizedDomain = domain.toLowerCase().trim();

  // Hardcoded: q.utoronto.ca is always productive (check FIRST before any other logic)
  // Check for exact match, subdomain, or contains q.utoronto.ca
  // Match: q.utoronto.ca, app.q.utoronto.ca, www.q.utoronto.ca, etc.
  if (normalizedDomain === 'q.utoronto.ca' || 
      normalizedDomain.endsWith('.q.utoronto.ca') ||
      normalizedDomain.includes('q.utoronto.ca')) {
    console.log('[classifyDomain] ✅ q.utoronto.ca HARDCODED as productive. Domain:', normalizedDomain, 'Original:', domain);
    return 'productive';
  }
  
  console.log('[classifyDomain] Domain being classified:', normalizedDomain, 'Original:', domain);

  // Try to get classification from backend API first
  try {
    const authToken = await chrome.storage.sync.get(['authToken']).then(result => result.authToken);
    if (authToken) {
      const apiClassification = await getDomainClassificationFromAPI(normalizedDomain, authToken);
      if (apiClassification !== null) {
        return apiClassification;
      }
    }
  } catch (error) {
    console.warn('Failed to get domain classification from API, using local config:', error);
  }

  // Fallback to local config - merge cached config with defaults to ensure all preset domains are included
  const cachedConfig = await loadDomainConfig();
  
  // Merge defaults with cached config (defaults take precedence for preset domains)
  const mergedConfig: DomainConfig = {
    productiveDomains: [
      ...new Set([...DEFAULT_DOMAIN_CONFIG.productiveDomains, ...(cachedConfig.productiveDomains || [])])
    ],
    unproductiveDomains: [
      ...new Set([...DEFAULT_DOMAIN_CONFIG.unproductiveDomains, ...(cachedConfig.unproductiveDomains || [])])
    ],
  };

  // Check productive domains
  if (mergedConfig.productiveDomains.some(prod => 
    normalizedDomain === prod || normalizedDomain.endsWith('.' + prod)
  )) {
    return 'productive';
  }

  // Check unproductive domains
  if (mergedConfig.unproductiveDomains.some(unprod => 
    normalizedDomain === unprod || normalizedDomain.endsWith('.' + unprod)
  )) {
    return 'unproductive';
  }

  // Neither productive nor unproductive = neutral
  return 'neutral';
}

/**
 * Check if a domain is productive (cached version for performance)
 * Use this when you have already loaded the config
 */
export function isProductiveDomainCached(domain: string | null, config: DomainConfig): boolean {
  if (!domain) {
    return false;
  }

  const normalizedDomain = domain.toLowerCase().trim();
  
  // Hardcoded: q.utoronto.ca is always productive
  if (normalizedDomain === 'q.utoronto.ca' || 
      normalizedDomain.endsWith('.q.utoronto.ca') ||
      normalizedDomain.includes('q.utoronto.ca')) {
    return true;
  }
  
  return config.productiveDomains.some(prod => 
    normalizedDomain === prod || normalizedDomain.endsWith('.' + prod)
  );
}

/**
 * Check if a domain is unproductive (cached version for performance)
 */
export function isUnproductiveDomainCached(domain: string | null, config: DomainConfig): boolean {
  if (!domain) {
    return false;
  }

  const normalizedDomain = domain.toLowerCase().trim();
  return config.unproductiveDomains.some(unprod => 
    normalizedDomain === unprod || normalizedDomain.endsWith('.' + unprod)
  );
}

/**
 * Get default domain configuration (for initial setup)
 */
export function getDefaultDomainConfig(): DomainConfig {
  return DEFAULT_DOMAIN_CONFIG;
}

