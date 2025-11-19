/**
 * Legacy exports for backward compatibility
 * New code should use configStore.ts functions
 */
import { classifyDomain, isProductiveDomainCached, isUnproductiveDomainCached, getDefaultDomainConfig } from './configStore';

export const PRODUCTIVE_DOMAINS = getDefaultDomainConfig().productiveDomains;
export const UNPRODUCTIVE_DOMAINS = getDefaultDomainConfig().unproductiveDomains;

/**
 * Check if a domain is considered productive
 * @deprecated Use classifyDomain() from configStore.ts instead
 * @param domain - The domain to check (e.g., "docs.google.com")
 * @returns true if domain is in productive list, false otherwise
 */
export async function isProductiveDomain(domain: string): Promise<boolean> {
  const classification = await classifyDomain(domain);
  return classification === 'productive';
}

/**
 * Check if a domain is explicitly unproductive
 * @deprecated Use classifyDomain() from configStore.ts instead
 * @param domain - The domain to check
 * @returns true if domain is in unproductive list
 */
export async function isUnproductiveDomain(domain: string): Promise<boolean> {
  const classification = await classifyDomain(domain);
  return classification === 'unproductive';
}

/**
 * Re-export configStore functions for convenience
 */
export { classifyDomain, loadDomainConfig, saveDomainConfig } from './configStore';

