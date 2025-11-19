/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format focus rate as percentage
 */
export function formatFocusRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get profile picture URL with API base URL if needed
 */
export function getProfilePictureUrl(profilePictureUrl: string | null | undefined): string | null {
  if (!profilePictureUrl) return null;
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // If it's already a full URL, return as is
  if (profilePictureUrl.startsWith('http')) {
    return profilePictureUrl;
  }
  
  // Otherwise, prepend API base URL
  return `${API_BASE_URL}${profilePictureUrl}`;
}

/**
 * Get user avatar color based on email
 */
export function getAvatarColor(email: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-indigo-500',
  ];
  const index = email.charCodeAt(0) % colors.length;
  return colors[index];
}

/**
 * Get initials from email
 */
export function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

