import { ActivitySegment, SessionMetrics, EndSessionPayload, UploadedFile } from '../types';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

/**
 * Start a new focus session
 * @param authToken - User authentication token
 * @returns Session ID from backend
 */
export async function startSession(authToken: string): Promise<{ sessionId: string }> {
  const url = getApiUrl(API_ENDPOINTS.START_SESSION);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ authToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start session: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { sessionId: data.sessionId };
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

/**
 * Upload activity segments to backend
 * @param sessionId - Current session ID
 * @param segments - Array of activity segments to upload
 * @param authToken - User authentication token
 */
export async function uploadActivity(
  sessionId: string,
  segments: ActivitySegment[],
  authToken: string
): Promise<void> {
  const url = getApiUrl(API_ENDPOINTS.UPLOAD_ACTIVITY);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sessionId,
        segments,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload activity: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('Error uploading activity:', error);
    // Don't throw - allow session to continue even if upload fails
    // Could implement retry logic here
  }
}

/**
 * End a session and upload final metrics
 * @param sessionId - Current session ID
 * @param metrics - Complete session metrics
 * @param authToken - User authentication token
 */
export async function endSession(
  sessionId: string,
  metrics: SessionMetrics,
  authToken: string
): Promise<void> {
  const url = getApiUrl(API_ENDPOINTS.END_SESSION);
  
  try {
    // Convert timestamps to ISO strings
    const sessionStartTimestamp = new Date(metrics.sessionStartTimestamp).toISOString();
    const sessionEndTimestamp = metrics.sessionEndTimestamp 
      ? new Date(metrics.sessionEndTimestamp).toISOString()
      : new Date().toISOString();

    // Convert segments: ensure timestamps are ISO strings and reason format matches backend
    const convertedSegments = metrics.segments.map(seg => ({
      start: new Date(seg.start).toISOString(),
      end: seg.end ? new Date(seg.end).toISOString() : undefined,
      domain: seg.domain,
      productive: seg.productive,
      lockedIn: seg.lockedIn,
      reason: seg.reason || null, // Backend expects null, not undefined
    }));

    const payload: EndSessionPayload = {
      sessionId: metrics.sessionId,
      sessionStartTimestamp,
      sessionEndTimestamp,
      totalSessionSeconds: metrics.totalSessionSeconds,
      lockedInSeconds: metrics.lockedInSeconds,
      nonLockSeconds: metrics.nonLockSeconds,
      focusRate: metrics.focusRate,
      idleBeyond2minSeconds: metrics.idleBeyond2minSeconds,
      tabSwitchCount: metrics.tabSwitchCount,
      lockBreakCount: metrics.lockBreakCount,
      segments: convertedSegments,
      fileIds: (metrics as any).fileIds || [],
    };

    console.log('Sending endSession request to:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('endSession API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to end session: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    console.log('endSession API success:', responseData);
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

/**
 * Upload files for a session (temporary upload before session ends)
 * @param files - FileList or File[] to upload
 * @param authToken - User authentication token
 * @returns Array of uploaded file info
 */
export async function uploadFiles(
  files: File[],
  authToken: string
): Promise<UploadedFile[]> {
  const url = getApiUrl('/sessions/files/upload');
  
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload files: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.files;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
}

