/**
 * Domain Classification for Chrome Extension
 * 
 * This module handles domain classification with user override support.
 * Classification priority:
 * 1. User override (from backend API)
 * 2. Master list classification
 * 3. Default to unproductive
 */

import { classifyDomain } from './domainClassification.js';
import { getApiUrl } from './api.js';

/**
 * Get domain classification with user override support
 * 
 * @param domain - The domain to classify
 * @param authToken - User's authentication token (optional)
 * @returns Promise<'productive' | 'unproductive'>
 */
export async function classifyDomainWithOverrides(
  domain: string | null,
  authToken: string | null
): Promise<'productive' | 'unproductive'> {
  if (!domain) {
    return 'unproductive';
  }

  const normalizedDomain = domain.toLowerCase().trim();

  // Step 1: Check user override from backend API
  if (authToken) {
    try {
      const url = `${getApiUrl('/domains/classification')}?domain=${encodeURIComponent(normalizedDomain)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns 'classification' field with 'productive' | 'unproductive'
        if (data.classification && (data.classification === 'productive' || data.classification === 'unproductive')) {
          return data.classification;
        }
      }
    } catch (error) {
      console.warn('Failed to get domain classification from API, using master list:', error);
      // Fall through to master list check
    }
  }

  // Step 2: Check master list
  const masterClassification = classifyDomain(normalizedDomain);
  if (masterClassification) {
    console.log(`[classifyDomainWithOverrides] Master list classification for ${normalizedDomain}: ${masterClassification}`);
    return masterClassification;
  }

  // Step 3: Default to unproductive
  console.log(`[classifyDomainWithOverrides] No classification found for ${normalizedDomain}, defaulting to unproductive`);
  return 'unproductive';
}

