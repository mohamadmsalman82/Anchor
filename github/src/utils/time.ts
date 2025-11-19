/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Format duration in seconds to HH:MM:SS string
 * @param seconds - Total seconds
 * @returns Formatted string like "01:23:45"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Calculate idle seconds since last activity timestamp
 * @param lastActivityTimestamp - Timestamp in ms of last activity
 * @returns Number of seconds idle
 */
export function calculateIdleSeconds(lastActivityTimestamp: number): number {
  const now = getCurrentTimestamp();
  const idleMs = now - lastActivityTimestamp;
  return Math.floor(idleMs / 1000);
}

/**
 * Calculate duration of a segment in seconds
 * @param segmentStart - Start timestamp in ms
 * @param segmentEnd - End timestamp in ms (or current time if not provided)
 * @returns Duration in seconds
 */
export function calculateSegmentDuration(segmentStart: number, segmentEnd?: number): number {
  const end = segmentEnd || getCurrentTimestamp();
  const durationMs = end - segmentStart;
  return Math.floor(durationMs / 1000);
}

/**
 * Format focus rate as percentage
 * @param focusRate - Focus rate as decimal (0..1)
 * @returns Percentage string like "78.5%"
 */
export function formatFocusRate(focusRate: number): string {
  if (isNaN(focusRate) || !isFinite(focusRate)) {
    return '0%';
  }
  return `${(focusRate * 100).toFixed(1)}%`;
}

