import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupState, PopupMessage, BackgroundResponse, SessionMetrics } from './types';
import { formatDuration, formatFocusRate } from './utils/time';
import { uploadFiles } from './api/client';

const DASHBOARD_URL = 'http://localhost:3001'; // Web app URL

function PopupApp() {
  const [state, setState] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [finishedSession, setFinishedSession] = useState<SessionMetrics | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Array<{ file: File; previewUrl?: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; filename: string; fileUrl: string; fileType: string }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Request state from background
  const requestState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' } as PopupMessage);
      
      if (response && response.type === 'STATE_UPDATE') {
        setState(response.state);
        setError(null);
      } else if (response && response.type === 'ERROR') {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error requesting state:', err);
      setError('Failed to connect to background service');
    } finally {
      setLoading(false);
    }
  };

  // Check for finished session
  const checkFinishedSession = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FINISHED_SESSION' } as PopupMessage);
      
      if (response && response.type === 'FINISHED_SESSION') {
        setFinishedSession(response.metrics);
        setState(null); // Clear active state when showing summary
      } else if (response && response.type === 'ERROR') {
        // No finished session, that's okay
        setFinishedSession(null);
      }
    } catch (err) {
      console.error('Error checking finished session:', err);
    }
  };

  // Handle start session
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'START_SESSION' } as PopupMessage);
      
      if (response && response.type === 'STATE_UPDATE') {
        setState(response.state);
        setError(null);
      } else if (response && response.type === 'ERROR') {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Handle finish session
  const handleFinishSession = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FINISH_SESSION' } as PopupMessage);
      
      if (response && response.type === 'FINISHED_SESSION') {
        setFinishedSession(response.metrics);
        setState(null); // Clear active state to show summary
        setError(null);
      } else if (response && response.type === 'STATE_UPDATE') {
        setState(response.state);
        setError(null);
      } else if (response && response.type === 'ERROR') {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error finishing session:', err);
      setError('Failed to finish session');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      
      // Create previews for images
      const newPreviews = files.map(file => {
        if (file.type.startsWith('image/')) {
          return { file, previewUrl: URL.createObjectURL(file) };
        }
        return { file };
      });
      setFilePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, [filePreviews]);

  // Handle file upload
  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingFiles(true);
    setError(null);
    try {
      // Get auth token
      const result = await chrome.storage.sync.get(['authToken']);
      const authToken = result.authToken;

      if (!authToken) {
        setError('Please connect your account first');
        setUploadingFiles(false);
        return;
      }

      const uploaded = await uploadFiles(selectedFiles, authToken);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      
      // Cleanup preview URLs
      filePreviews.forEach(preview => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
      
      setSelectedFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Handle remove file
  const handleRemoveFile = (index: number) => {
    const preview = filePreviews[index];
    if (preview?.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle remove uploaded file
  const handleRemoveUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Handle upload finished session
  const handleUploadSession = async () => {
    if (!finishedSession) return;
    
    setUploading(true);
    setError(null);
    try {
      // Upload files first if any are selected but not yet uploaded
      let fileIds: string[] = uploadedFiles.map(f => f.id);
      
      if (selectedFiles.length > 0) {
        try {
          const result = await chrome.storage.sync.get(['authToken']);
          const authToken = result.authToken;
          if (authToken) {
            const uploaded = await uploadFiles(selectedFiles, authToken);
            fileIds = [...fileIds, ...uploaded.map(f => f.id)];
            setUploadedFiles(prev => [...prev, ...uploaded]);
            
            // Cleanup preview URLs
            filePreviews.forEach(preview => {
              if (preview.previewUrl) {
                URL.revokeObjectURL(preview.previewUrl);
              }
            });
            
            setSelectedFiles([]);
            setFilePreviews([]);
          }
        } catch (fileErr) {
          console.error('Error uploading files:', fileErr);
          // Continue with session upload even if file upload fails
        }
      }

      // Send message with file IDs
      const response = await chrome.runtime.sendMessage({ 
        type: 'UPLOAD_FINISHED_SESSION',
        fileIds 
      } as any);
      
      if (response && response.type === 'STATE_UPDATE') {
        // Cleanup all file state
        filePreviews.forEach(preview => {
          if (preview.previewUrl) {
            URL.revokeObjectURL(preview.previewUrl);
          }
        });
        setFinishedSession(null);
        setUploadedFiles([]);
        setSelectedFiles([]);
        setFilePreviews([]);
        setState(response.state);
        setError(null);
      } else if (response && response.type === 'ERROR') {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error uploading session:', err);
      setError('Failed to upload session');
    } finally {
      setUploading(false);
    }
  };

  // Handle discard finished session
  const handleDiscardSession = async () => {
    setError(null);
    
    // Clean up file state - don't upload anything
    filePreviews.forEach(preview => {
      if (preview.previewUrl) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'DISCARD_FINISHED_SESSION' } as PopupMessage);
      
      if (response && response.type === 'STATE_UPDATE') {
        setFinishedSession(null);
        setState(response.state);
        setError(null);
      } else if (response && response.type === 'ERROR') {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error discarding session:', err);
      setError('Failed to discard session');
    }
  };

  // Open dashboard
  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  };

  // Handle token input
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      setError('Please enter a token');
      return;
    }
    try {
      await chrome.storage.sync.set({ authToken: tokenInput.trim() });
      setTokenInput('');
      setShowTokenInput(false);
      setError(null);
      // Refresh state to show connection status
      await requestState();
    } catch (err) {
      console.error('Error saving token:', err);
      setError('Failed to save token');
    }
  };

  // Poll for updates and check for finished session
  useEffect(() => {
    requestState();
    checkFinishedSession();
    
    // Poll every 2 seconds
    const interval = setInterval(() => {
      if (!finishedSession) {
        requestState();
      }
      checkFinishedSession();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [finishedSession]);

  // Show finished session summary if available
  if (finishedSession) {
    const sessionDuration = finishedSession.totalSessionSeconds;
    const lockedInDuration = finishedSession.lockedInSeconds;
    const focusRate = finishedSession.focusRate;
    const startTime = new Date(finishedSession.sessionStartTimestamp);
    const endTime = finishedSession.sessionEndTimestamp 
      ? new Date(finishedSession.sessionEndTimestamp)
      : new Date();

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Session Complete</h1>
          <div style={{ ...styles.statusBadge, backgroundColor: '#dbeafe', color: '#1e40af' }}>
            ✓ Finished
          </div>
        </div>

        {/* Summary Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Session Summary</h2>
          
          {/* Time Range */}
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280' }}>
            {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
          </div>

          {/* Key Metrics */}
          <div style={styles.metricsGrid}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Total Time</div>
              <div style={styles.metricValue}>{formatDuration(sessionDuration)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Locked-In Time</div>
              <div style={styles.metricValue}>{formatDuration(lockedInDuration)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Focus Rate</div>
              <div style={styles.metricValue}>{formatFocusRate(focusRate)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Tab Switches</div>
              <div style={styles.metricValue}>{finishedSession.tabSwitchCount}</div>
            </div>
            {finishedSession.idleBeyond2minSeconds > 0 && (
              <div style={styles.metric}>
                <div style={styles.metricLabel}>Idle Time</div>
                <div style={styles.metricValue}>{formatDuration(finishedSession.idleBeyond2minSeconds)}</div>
              </div>
            )}
            {finishedSession.lockBreakCount > 0 && (
              <div style={styles.metric}>
                <div style={styles.metricLabel}>Lock Breaks</div>
                <div style={styles.metricValue}>{finishedSession.lockBreakCount}</div>
              </div>
            )}
          </div>

          {/* Focus Rate Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Focus Rate
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${focusRate * 100}%`,
                height: '100%',
                backgroundColor: focusRate >= 0.75 ? '#10b981' : focusRate >= 0.5 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Share Files or Pictures</h2>
          
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button
            style={{
              ...styles.button,
              backgroundColor: '#6366f1',
              color: 'white',
              width: '100%',
              marginBottom: '12px',
            }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || uploadingFiles}
            aria-label="Select files to upload"
          >
            📎 Select Files
          </button>

          {/* Selected Files Preview */}
          {filePreviews.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                Selected Files ({filePreviews.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {filePreviews.map((preview, index) => {
                  const file = preview.file;
                  const isImage = file.type.startsWith('image/');
                  const fileSizeKB = (file.size / 1024).toFixed(1);
                  
                  return (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                    }}>
                      {isImage && preview.previewUrl ? (
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            flexShrink: 0,
                            border: '1px solid #d1d5db',
                          }}
                          onClick={() => setLightboxImage(preview.previewUrl || null)}
                        >
                          <img
                            src={preview.previewUrl}
                            alt={file.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '4px',
                          backgroundColor: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '20px',
                        }}>
                          📄
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {fileSizeKB} KB • {file.type || 'Unknown type'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '4px 8px',
                          flexShrink: 0,
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: '#10b981',
                  color: 'white',
                  width: '100%',
                  fontSize: '12px',
                }}
                onClick={handleUploadFiles}
                disabled={uploadingFiles || uploading}
                aria-label="Upload selected files"
              >
                {uploadingFiles ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          )}

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                Uploaded ({uploadedFiles.length}):
              </div>
              {uploadedFiles.map((file) => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '6px',
                  marginBottom: '4px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.filename}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUploadedFile(file.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px 8px',
                      flexShrink: 0,
                    }}
                    aria-label={`Remove ${file.filename}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            ...styles.section,
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ color: '#991b1b', fontSize: '12px' }}>{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
              flex: 1,
            }}
            onClick={handleUploadSession}
            disabled={uploading}
            aria-label="Upload session to dashboard"
          >
            {uploading ? 'Uploading...' : 'Upload to Dashboard'}
          </button>
          <button
            style={{
              ...styles.button,
              backgroundColor: '#6b7280',
              color: 'white',
              flex: 1,
            }}
            onClick={handleDiscardSession}
            disabled={uploading}
            aria-label="Discard session without uploading"
          >
            Don't Upload
          </button>
        </div>

        {/* Info Text */}
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
          Upload to sync with your dashboard and see it in the feed
        </div>

        {/* Image Lightbox Modal */}
        {lightboxImage && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px',
            }}
            onClick={() => setLightboxImage(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setLightboxImage(null);
              }
            }}
            tabIndex={-1}
          >
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
              <img
                src={lightboxImage}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(null);
                }}
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: 0,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111827',
                }}
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading && !state) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button style={styles.button} onClick={requestState}>Retry</button>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>No state available</div>
      </div>
    );
  }

  const isSessionActive = state.sessionState !== 'noSession';
  const isLockedIn = state.sessionState === 'sessionActive_lockedIn';
  const statusColor = isLockedIn ? '#10b981' : '#f59e0b';
  const statusBg = isLockedIn ? '#d1fae5' : '#fef3c7';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Anchor</h1>
        <div style={{ ...styles.statusBadge, backgroundColor: statusBg, color: statusColor }}>
          {isSessionActive 
            ? (isLockedIn ? 'LOCKED IN ✅' : 'NOT LOCKED IN ⚠️')
            : 'NO SESSION'
          }
        </div>
      </div>

      {/* Connection Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Connection</h2>
        {state.isConnected ? (
          <div style={styles.connectedStatus}>
            Extension connected to your account ✅
          </div>
        ) : (
          <div style={styles.disconnectedStatus}>
            Not connected – open dashboard and log in ⚠️
          </div>
        )}
      </div>

      {/* Session Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Session Status</h2>
        {isSessionActive ? (
          <div style={styles.sessionTime}>
            Session running: <strong>{formatDuration(state.totalSessionSeconds)}</strong>
          </div>
        ) : (
          <div style={styles.noSession}>No active session</div>
        )}
      </div>

      {/* Metrics */}
      {isSessionActive && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Metrics</h2>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Total Time</div>
              <div style={styles.metricValue}>{formatDuration(state.totalSessionSeconds)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Locked-In Time</div>
              <div style={styles.metricValue}>{formatDuration(state.lockedInSeconds)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Focus Rate</div>
              <div style={styles.metricValue}>{formatFocusRate(state.focusRate)}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Tab Switches</div>
              <div style={styles.metricValue}>{state.tabSwitchCount}</div>
            </div>
            {state.idleBeyond2minSeconds > 0 && (
              <div style={styles.metric}>
                <div style={styles.metricLabel}>Idle Time</div>
                <div style={styles.metricValue}>{formatDuration(state.idleBeyond2minSeconds)}</div>
              </div>
            )}
            {state.lockBreakCount > 0 && (
              <div style={styles.metric}>
                <div style={styles.metricLabel}>Lock Breaks</div>
                <div style={styles.metricValue}>{state.lockBreakCount}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Tab Info */}
      {state.currentDomain && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Current Tab</h2>
          <div style={styles.tabInfo}>
            <div style={styles.domain}>{state.currentDomain}</div>
            <div style={{
              ...styles.domainTag,
              backgroundColor: state.isProductiveDomain === true ? '#d1fae5' 
                : state.isProductiveDomain === false ? '#fee2e2' 
                : '#f3f4f6',
              color: state.isProductiveDomain === true ? '#065f46' 
                : state.isProductiveDomain === false ? '#991b1b' 
                : '#6b7280',
            }}>
              {state.isProductiveDomain === true ? 'Productive 🧠' 
                : state.isProductiveDomain === false ? 'Unproductive 🚨' 
                : 'Neutral'}
            </div>
          </div>
        </div>
      )}

      {/* Token Input (if not connected) */}
      {!state.isConnected && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Connect to Account</h2>
          {!showTokenInput ? (
            <button
              style={{
                ...styles.button,
                backgroundColor: '#6366f1',
                color: 'white',
              }}
              onClick={() => setShowTokenInput(true)}
            >
              Enter Auth Token
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your auth token here"
                style={{
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: '#10b981',
                    color: 'white',
                    flex: 1,
                  }}
                  onClick={handleSaveToken}
                >
                  Save Token
                </button>
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: '#6b7280',
                    color: 'white',
                  }}
                  onClick={() => {
                    setShowTokenInput(false);
                    setTokenInput('');
                  }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                Get your token from the web dashboard (copy from the "Your connection token" field)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.button,
            ...styles.primaryButton,
            opacity: (isSessionActive || !state.isConnected) ? 0.5 : 1,
            cursor: (isSessionActive || !state.isConnected) ? 'not-allowed' : 'pointer',
          }}
          onClick={handleStartSession}
          disabled={isSessionActive || !state.isConnected}
        >
          Start Session
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.secondaryButton,
            opacity: !isSessionActive ? 0.5 : 1,
            cursor: !isSessionActive ? 'not-allowed' : 'pointer',
          }}
          onClick={handleFinishSession}
          disabled={!isSessionActive}
        >
          Finish Session
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.linkButton,
          }}
          onClick={handleOpenDashboard}
        >
          Open Dashboard
        </button>
      </div>
    </div>
  );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    backgroundColor: '#ffffff',
    minHeight: '500px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  connectedStatus: {
    padding: '8px 12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
  },
  disconnectedStatus: {
    padding: '8px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '14px',
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '12px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sessionTime: {
    fontSize: '16px',
    color: '#111827',
  },
  noSession: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  metric: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827',
  },
  tabInfo: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  domain: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '8px',
    wordBreak: 'break-all',
  },
  domainTag: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '2px solid #e5e7eb',
  },
  button: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  linkButton: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
  },
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}

