/**
 * Extract domain from a URL
 * Handles edge cases like chrome://, chrome-extension://, etc.
 * @param url - Full URL string
 * @returns Domain string or null if invalid
 */
export function extractDomain(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Handle chrome:// and chrome-extension:// URLs
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return null; // These are not web pages
    }

    // Handle edge:// URLs (Edge browser)
    if (url.startsWith('edge://')) {
      return null;
    }

    // Handle about: URLs
    if (url.startsWith('about:')) {
      return null;
    }

    // Parse URL
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Remove www. prefix for consistency
    let domain = hostname.replace(/^www\./, '');
    
    // Debug logging for q.utoronto.ca
    if (domain.toLowerCase().includes('q.utoronto.ca')) {
      console.log('[extractDomain] 🔍 Extracted domain from URL:', url, '→', domain);
    }

    return domain;
  } catch (error) {
    // Invalid URL format
    console.warn('Failed to extract domain from URL:', url, error);
    return null;
  }
}

/**
 * Check if a URL is a valid web page (not chrome://, etc.)
 */
export function isValidWebPage(url: string): boolean {
  if (!url) return false;
  
  const invalidProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:'];
  return !invalidProtocols.some(protocol => url.startsWith(protocol));
}

