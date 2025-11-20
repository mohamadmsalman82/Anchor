/**
 * Master Domain Classification Lists
 * 
 * This file contains the authoritative lists of productive and unproductive domains.
 * These lists are used across:
 * - Backend API for domain classification
 * - Chrome extension for real-time classification
 * - Frontend for displaying domain status
 * 
 * Total: 100 domains (50 productive + 50 unproductive)
 */

export const PRODUCTIVE_DOMAINS: readonly string[] = [
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
  'docs.google.com',
  'drive.google.com',
  'classroom.google.com',
  'meet.google.com',
  'calendar.google.com',
  'notion.so',
  'evernote.com',
  'onenote.com',
  'todoist.com',
  'trello.com',
  'github.com',
  'gitlab.com',
  'bitbucket.org',
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
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'udemy.com',
  'brilliant.org',
  'wolframalpha.com',
  'desmos.com',
  'overleaf.com',
  'grammarly.com',
  'deepdyve.com',
  'scholar.google.com',
  'jstor.org',
  'ieeexplore.ieee.org',
  'sciencedirect.com',
  'researchgate.net',
] as const;

export const UNPRODUCTIVE_DOMAINS: readonly string[] = [
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
  'netflix.com',
  'primevideo.com',
  'disneyplus.com',
  'hulu.com',
  'crunchyroll.com',
  'twitch.tv',
  'spotify.com',
  'soundcloud.com',
  'deezer.com',
  'applemusic.com',
  'roblox.com',
  'store.steampowered.com',
  'epicgames.com',
  'playstation.com',
  'xbox.com',
  '9gag.com',
  'boredpanda.com',
  'buzzfeed.com',
  'thechive.com',
  'ifunny.co',
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
  'onlyfans.com',
  'patreon.com',
  'kick.com',
  'yikyak.com',
  'omegle.com',
  'tripadvisor.com',
  'booking.com',
  'airbnb.com',
  'expedia.com',
  'ubereats.com',
] as const;

/**
 * Normalize a domain string for classification
 * - Convert to lowercase
 * - Remove www. prefix
 * - Trim whitespace
 */
function normalizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }
  
  let normalized = domain.toLowerCase().trim();
  
  // Remove www. prefix
  normalized = normalized.replace(/^www\./, '');
  
  return normalized;
}

/**
 * Classify a domain as productive or unproductive
 *
 * Rules:
 * 1. Normalize domain (lowercase, strip prefixes)
 * 2. If in productive list → return "productive"
 * 3. Otherwise → "unproductive" (default)
 *
 * Note: This function does NOT check user overrides.
 * User overrides should be checked separately before calling this function.
 *
 * @param domain - The domain to classify (e.g., "github.com" or "www.github.com")
 * @returns "productive" | "unproductive"
 */
export function classifyDomain(domain: string): 'productive' | 'unproductive' {
  const normalized = normalizeDomain(domain);
  
  if (!normalized) {
    return 'unproductive';
  }
  
  // Check productive domains
  if (PRODUCTIVE_DOMAINS.includes(normalized)) {
    return 'productive';
  }
  
  // Check unproductive domains
  if (UNPRODUCTIVE_DOMAINS.includes(normalized)) {
    return 'unproductive';
  }

  // Default to unproductive if not explicitly productive
  return 'unproductive';
}

