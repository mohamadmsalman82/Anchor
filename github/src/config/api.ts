/**
 * API configuration
 * Update API_BASE_URL to point to your backend server
 */
export const API_BASE_URL = 'http://localhost:3000';

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  START_SESSION: '/sessions/start',
  UPLOAD_ACTIVITY: '/sessions/activity',
  END_SESSION: '/sessions/end',
} as const;

/**
 * Get full URL for an API endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

