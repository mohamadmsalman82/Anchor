import { AuthResponse, DashboardResponse, FeedResponse, Session, ProfileResponse, LeaderboardResponse, DomainsResponse, DomainClassificationResponse, DomainOverride, AiInsight, HomeAnalytics } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

/**
 * API client with automatic auth token handling
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  try {
    console.log('API Request:', { url, method: options.method || 'GET' });
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      // Attempt to parse error as JSON
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If not JSON, default to generic error
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      
      console.error('API Error:', errorData);
      
      // If user not found (404) or unauthorized (401), clear auth and redirect to login
      if (response.status === 404 && errorData.error === 'User not found') {
        // Clear auth tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          document.cookie = 'authToken=; path=/; max-age=0';
          // Redirect to login
          window.location.href = '/auth/login';
        }
      }
      
      if (response.status === 401) {
        // Clear auth tokens on unauthorized
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          document.cookie = 'authToken=; path=/; max-age=0';
          // Only redirect if not already on login/register page
          if (!window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
      }
      
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Success:', { path, dataKeys: Object.keys(data) });
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

// Auth endpoints
export async function register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Dashboard
export async function getDashboard(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>('/me/');
}

// Feed
export async function getFeed(limit = 20, offset = 0): Promise<FeedResponse> {
  return apiFetch<FeedResponse>(`/feed?limit=${limit}&offset=${offset}`);
}

// Session
export async function getSession(id: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}`);
}

// Profile
export async function getProfile(userId: string): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(`/users/${userId}/profile`);
}

// Leaderboard
export async function getLeaderboard(range: 'weekly' | 'all_time' = 'weekly'): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/leaderboard?range=${range}`);
}

// Update session
export async function updateSession(id: string, data: { title?: string; description?: string; isPosted?: boolean; goal?: string; goalCompleted?: boolean }): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Domain management
export async function getDomains(): Promise<DomainsResponse> {
  return apiFetch<DomainsResponse>('/domains');
}

export async function getDomainClassification(domain: string): Promise<DomainClassificationResponse> {
  return apiFetch<DomainClassificationResponse>(`/domains/classification?domain=${encodeURIComponent(domain)}`);
}

export async function getUserDomainOverrides(): Promise<{ overrides: DomainOverride[] }> {
  return apiFetch<{ overrides: DomainOverride[] }>('/me/domain-overrides');
}

export async function createDomainOverride(domain: string, classification: 'productive' | 'unproductive'): Promise<{ override: DomainOverride }> {
  return apiFetch<{ override: DomainOverride }>('/me/domain-overrides', {
    method: 'POST',
    body: JSON.stringify({ domain, classification }),
  });
}

export async function deleteDomainOverride(domain: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/me/domain-overrides/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  });
}

// Profile management
export async function updateProfile(data: { firstName?: string; lastName?: string }): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadProfilePicture(file: File): Promise<{ user: User }> {
  const formData = new FormData();
  formData.append('picture', file);

  const token = getAuthToken();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${API_BASE_URL}/me/profile/picture`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function deleteProfilePicture(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/me/profile/picture', {
    method: 'DELETE',
  });
}

// AI Insights
export async function getSessionInsight(sessionId: string): Promise<AiInsight> {
  return apiFetch<AiInsight>(`/sessions/${sessionId}/insights`);
}

export async function generateSessionInsight(sessionId: string, forceRegenerate = false): Promise<AiInsight> {
  return apiFetch<AiInsight>(`/sessions/${sessionId}/insights`, {
    method: 'POST',
    body: JSON.stringify({ forceRegenerate }),
  });
}

export async function getHomeAnalytics(force = false): Promise<HomeAnalytics> {
  const query = force ? '?force=true' : '';
  return apiFetch<HomeAnalytics>(`/me/analytics/home${query}`);
}
