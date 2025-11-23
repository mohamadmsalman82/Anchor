/**
 * Extract domain from a URL string
 * Handles various formats: full URLs, domains with protocol, plain domains
 */
export function extractDomainFromUrl(input: string): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  let url = input.trim().toLowerCase();

  // Remove protocol if present
  url = url.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  url = url.replace(/^www\./, '');
  
  // Remove path, query, and fragment
  url = url.split('/')[0];
  url = url.split('?')[0];
  url = url.split('#')[0];
  
  // Remove port if present
  url = url.split(':')[0];
  
  // Allow localhost for development
  if (url === 'localhost') {
    return url;
  }

  // Validate it looks like a domain
  if (!url || url.length === 0) {
    return null;
  }

  // Remove trailing dots
  url = url.replace(/\.+$/, '');

  // Basic validation - should match domain pattern
  // Allows: example.com, sub.example.com, example.co.uk, etc.
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainPattern.test(url)) {
    return null;
  }

  return url;
}

/**
 * Validate if a string is a valid domain
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.trim().length === 0) {
    return false;
  }

  const trimmed = domain.trim().toLowerCase();

  // Allow localhost explicitly for development
  if (trimmed === 'localhost') {
    return true;
  }

  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
  return domainRegex.test(trimmed);
}

