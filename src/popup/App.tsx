import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PopupState, PopupMessage, SessionMetrics } from '../types';
import { formatDuration, formatFocusRate } from '../utils/time';
import { uploadFiles } from '../api/client';

const DASHBOARD_URL = 'http://localhost:3001';

interface FilePreview {
  file: File;
  previewUrl?: string;
}

interface UploadedFileInfo {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export function PopupApp() {
  const [state, setState] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [finishedSession, setFinishedSession] = useState<SessionMetrics | null>(null);
  const [uploadingSession, setUploadingSession] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const requestState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' } as PopupMessage);
      if (response?.type === 'STATE_UPDATE') {
        setState(response.state);
        handleError(null);
      } else if (response?.type === 'ERROR') {
        handleError(response.message);
      }
    } catch (err) {
      console.error('[Popup] Failed to fetch state', err);
      handleError('Failed to connect to background service');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const checkFinishedSession = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FINISHED_SESSION' } as PopupMessage);
      if (response?.type === 'FINISHED_SESSION') {
        setFinishedSession(response.metrics);
        setState(null);
      } else if (response?.type === 'ERROR') {
        setFinishedSession(null);
      }
    } catch (err) {
      console.error('[Popup] Failed to check finished session', err);
    }
  }, []);

  const startSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'START_SESSION' } as PopupMessage);
      if (response?.type === 'STATE_UPDATE') {
        setState(response.state);
        handleError(null);
      } else if (response?.type === 'ERROR') {
        handleError(response.message);
      }
    } catch (err) {
      console.error('[Popup] Failed to start session', err);
      handleError('Failed to start session');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const finishSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FINISH_SESSION' } as PopupMessage);
      if (response?.type === 'FINISHED_SESSION') {
        setFinishedSession(response.metrics);
        setState(null);
        handleError(null);
      } else if (response?.type === 'STATE_UPDATE') {
        setState(response.state);
        handleError(null);
      } else if (response?.type === 'ERROR') {
        handleError(response.message);
      }
    } catch (err) {
      console.error('[Popup] Failed to finish session', err);
      handleError('Failed to finish session');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const onFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
    const previews = files.map<FilePreview>((file) => {
      if (file.type.startsWith('image/')) {
        return { file, previewUrl: URL.createObjectURL(file) };
      }
      return { file };
    });
    setFilePreviews((prev) => [...prev, ...previews]);
  }, []);

  const removePreview = useCallback((index: number) => {
    setFilePreviews((prev) => {
      const preview = prev[index];
      if (preview?.previewUrl) {
        URL.revokeObjectURL(preview.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const removeUploadedFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const resetSelectedFiles = useCallback(() => {
    filePreviews.forEach((preview) => {
      if (preview.previewUrl) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [filePreviews]);

  const uploadSelectedFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setUploadingFiles(true);
    handleError(null);
    try {
      const result = await chrome.storage.sync.get(['authToken']);
      const authToken = result.authToken;
      if (!authToken) {
        handleError('Please connect your account first');
        setUploadingFiles(false);
        return;
      }
      const uploaded = await uploadFiles(selectedFiles, authToken);
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      resetSelectedFiles();
    } catch (err) {
      console.error('[Popup] Failed to upload files', err);
      handleError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  }, [handleError, resetSelectedFiles, selectedFiles]);

  const uploadFinishedSession = useCallback(async () => {
    if (!finishedSession) return;
    setUploadingSession(true);
    handleError(null);
    try {
      let fileIds = uploadedFiles.map((file) => file.id);
      if (selectedFiles.length > 0) {
        const result = await chrome.storage.sync.get(['authToken']);
        const authToken = result.authToken;
        if (authToken) {
          const uploaded = await uploadFiles(selectedFiles, authToken);
          fileIds = [...fileIds, ...uploaded.map((file) => file.id)];
          setUploadedFiles((prev) => [...prev, ...uploaded]);
          resetSelectedFiles();
        }
      }
      const response = await chrome.runtime.sendMessage({
        type: 'UPLOAD_FINISHED_SESSION',
        fileIds,
      } as PopupMessage & { fileIds: string[] });
      if (response?.type === 'STATE_UPDATE') {
        setFinishedSession(null);
        setState(response.state);
        setUploadedFiles([]);
        handleError(null);
      } else if (response?.type === 'ERROR') {
        handleError(response.message);
      }
    } catch (err) {
      console.error('[Popup] Failed to upload session', err);
      handleError('Failed to upload session');
    } finally {
      setUploadingSession(false);
    }
  }, [finishedSession, handleError, resetSelectedFiles, selectedFiles, uploadedFiles]);

  const discardFinishedSession = useCallback(async () => {
    resetSelectedFiles();
    setUploadedFiles([]);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'DISCARD_FINISHED_SESSION' } as PopupMessage);
      if (response?.type === 'STATE_UPDATE') {
        setFinishedSession(null);
        setState(response.state);
        handleError(null);
      } else if (response?.type === 'ERROR') {
        handleError(response.message);
      }
    } catch (err) {
      console.error('[Popup] Failed to discard session', err);
      handleError('Failed to discard session');
    }
  }, [handleError, resetSelectedFiles]);

  const saveToken = useCallback(async () => {
    if (!tokenInput.trim()) {
      handleError('Please enter a token');
      return;
    }
    try {
      await chrome.storage.sync.set({ authToken: tokenInput.trim() });
      setTokenInput('');
      setShowTokenInput(false);
      handleError(null);
      await requestState();
    } catch (err) {
      console.error('[Popup] Failed to save token', err);
      handleError('Failed to save token');
    }
  }, [handleError, requestState, tokenInput]);

  const openDashboard = useCallback(() => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  }, []);

  const sessionStatus = useMemo(() => {
    if (!state) return { isActive: false, isAnchored: false };
    return {
      isActive: state.sessionState !== 'noSession',
      isAnchored: state.sessionState === 'sessionActive_lockedIn',
    };
  }, [state]);

  useEffect(() => {
    requestState();
    checkFinishedSession();
    const interval = setInterval(() => {
      if (!finishedSession) {
        requestState();
      }
      checkFinishedSession();
    }, 2000);
    return () => clearInterval(interval);
  }, [checkFinishedSession, finishedSession, requestState]);

  useEffect(
    () => () => {
      filePreviews.forEach((preview) => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    },
    [filePreviews]
  );

  if (loading && !state && !finishedSession) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error && !state && !finishedSession) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button style={{ ...styles.button, width: '100%' }} onClick={requestState}>
          Retry
        </button>
      </div>
    );
  }

  if (finishedSession) {
    return (
      <FinishedSessionView
        error={error}
        finishedSession={finishedSession}
        fileInputRef={fileInputRef}
        filePreviews={filePreviews}
        uploadedFiles={uploadedFiles}
        uploadingFiles={uploadingFiles}
        uploadingSession={uploadingSession}
        onFileSelect={onFileSelect}
        onRemovePreview={removePreview}
        onRemoveUploadedFile={removeUploadedFile}
        onUploadSelectedFiles={uploadSelectedFiles}
        onUploadSession={uploadFinishedSession}
        onDiscardSession={discardFinishedSession}
        lightboxImage={lightboxImage}
        onOpenLightbox={setLightboxImage}
        onCloseLightbox={() => setLightboxImage(null)}
      />
    );
  }

  if (!state) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>No state available</div>
      </div>
    );
  }

  const isSessionActive = sessionStatus.isActive;
  const isAnchored = sessionStatus.isAnchored;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.badgeLabel}>Anchor</p>
          <h1 style={styles.title}>Daily Focus</h1>
        </div>
        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: isSessionActive ? (isAnchored ? '#d1fae5' : '#fef3c7') : '#f3f4f6',
            color: isSessionActive ? (isAnchored ? '#065f46' : '#92400e') : '#6b7280',
          }}
        >
          {isSessionActive ? (isAnchored ? 'Anchored' : 'UnAnchored') : 'No Session'}
        </div>
      </div>

      {error && (
        <div style={styles.inlineError}>
          {error}
        </div>
      )}

      <ConnectionSection
        isConnected={state.isConnected}
        showTokenInput={showTokenInput}
        tokenInput={tokenInput}
        onEditToken={setTokenInput}
        onSaveToken={saveToken}
        onRequestToken={() => setShowTokenInput(true)}
        onCancelToken={() => {
          setShowTokenInput(false);
          setTokenInput('');
        }}
      />

      <SessionSection
        isSessionActive={isSessionActive}
        totalSeconds={state.totalSessionSeconds}
      />

      {isSessionActive && (
        <MetricsSection state={state} />
      )}

      {state.currentDomain && (
        <CurrentDomainSection
          domain={state.currentDomain}
          classification={state.isProductiveDomain}
        />
      )}

      <Controls
        isConnected={state.isConnected}
        isSessionActive={isSessionActive}
        onStart={startSession}
        onFinish={finishSession}
        onOpenDashboard={openDashboard}
      />
    </div>
  );
}

function ConnectionSection({
  isConnected,
  showTokenInput,
  tokenInput,
  onEditToken,
  onSaveToken,
  onRequestToken,
  onCancelToken,
}: {
  isConnected: boolean;
  showTokenInput: boolean;
  tokenInput: string;
  onEditToken: (value: string) => void;
  onSaveToken: () => Promise<void>;
  onRequestToken: () => void;
  onCancelToken: () => void;
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Connection</h2>
      {isConnected ? (
        <div style={styles.connectedStatus}>Extension connected to your account ✅</div>
      ) : (
        <div>
          <div style={styles.disconnectedStatus}>Not connected – open dashboard and log in ⚠️</div>
          {showTokenInput ? (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                value={tokenInput}
                onChange={(event) => onEditToken(event.target.value)}
                placeholder="Paste your auth token"
                style={styles.textInput}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...styles.button, flex: 1, backgroundColor: '#10b981', color: '#ffffff' }} onClick={onSaveToken}>
                  Save Token
                </button>
                <button style={{ ...styles.button, backgroundColor: '#6b7280', color: '#ffffff' }} onClick={onCancelToken}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              style={{ ...styles.button, backgroundColor: '#6366f1', color: '#ffffff', marginTop: '12px' }}
              onClick={onRequestToken}
            >
              Enter Auth Token
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionSection({ isSessionActive, totalSeconds }: { isSessionActive: boolean; totalSeconds: number }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Session Status</h2>
      {isSessionActive ? (
        <div style={styles.sessionTime}>
          Session running: <strong>{formatDuration(totalSeconds)}</strong>
        </div>
      ) : (
        <div style={styles.noSession}>No active session</div>
      )}
    </div>
  );
}

function MetricsSection({ state }: { state: PopupState }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Metrics</h2>
      <div style={styles.metricsGrid}>
        <Metric label="Total Time" value={formatDuration(state.totalSessionSeconds)} />
        <Metric label="Anchored Time" value={formatDuration(state.lockedInSeconds)} />
        <Metric label="Focus Rate" value={formatFocusRate(state.focusRate)} />
        <Metric label="Tab Switches" value={state.tabSwitchCount.toString()} />
        {state.idleBeyond2minSeconds > 0 && (
          <Metric label="Idle Time" value={formatDuration(state.idleBeyond2minSeconds)} />
        )}
        {state.lockBreakCount > 0 && (
          <Metric label="Lock Breaks" value={state.lockBreakCount.toString()} />
        )}
      </div>
    </div>
  );
}

function CurrentDomainSection({
  domain,
  classification,
}: {
  domain: string;
  classification: boolean | null;
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Current Tab</h2>
      <div style={styles.domainCard}>
        <div style={styles.domainText}>{domain}</div>
        <div
          style={{
            ...styles.domainTag,
            backgroundColor: classification === true ? '#d1fae5' : classification === false ? '#fee2e2' : '#f3f4f6',
            color: classification === true ? '#065f46' : classification === false ? '#991b1b' : '#6b7280',
          }}
        >
          {classification === true ? 'Productive 🧠' : classification === false ? 'Unproductive 🚨' : 'Unknown'}
        </div>
      </div>
    </div>
  );
}

function Controls({
  isConnected,
  isSessionActive,
  onStart,
  onFinish,
  onOpenDashboard,
}: {
  isConnected: boolean;
  isSessionActive: boolean;
  onStart: () => Promise<void>;
  onFinish: () => Promise<void>;
  onOpenDashboard: () => void;
}) {
  return (
    <div style={styles.controls}>
      <button
        style={{
          ...styles.button,
          ...styles.primaryButton,
          opacity: isSessionActive || !isConnected ? 0.5 : 1,
          cursor: isSessionActive || !isConnected ? 'not-allowed' : 'pointer',
        }}
        onClick={onStart}
        disabled={isSessionActive || !isConnected}
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
        onClick={onFinish}
        disabled={!isSessionActive}
      >
        Finish Session
      </button>
      <button style={{ ...styles.button, ...styles.linkButton }} onClick={onOpenDashboard}>
        Open Dashboard
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function FinishedSessionView({
  error,
  finishedSession,
  fileInputRef,
  filePreviews,
  uploadedFiles,
  uploadingFiles,
  uploadingSession,
  onFileSelect,
  onRemovePreview,
  onRemoveUploadedFile,
  onUploadSelectedFiles,
  onUploadSession,
  onDiscardSession,
  lightboxImage,
  onOpenLightbox,
  onCloseLightbox,
}: {
  error: string | null;
  finishedSession: SessionMetrics;
  fileInputRef: React.RefObject<HTMLInputElement>;
  filePreviews: FilePreview[];
  uploadedFiles: UploadedFileInfo[];
  uploadingFiles: boolean;
  uploadingSession: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePreview: (index: number) => void;
  onRemoveUploadedFile: (id: string) => void;
  onUploadSelectedFiles: () => Promise<void>;
  onUploadSession: () => Promise<void>;
  onDiscardSession: () => Promise<void>;
  lightboxImage: string | null;
  onOpenLightbox: (url: string | null) => void;
  onCloseLightbox: () => void;
}) {
  const startTime = new Date(finishedSession.sessionStartTimestamp);
  const endTime = finishedSession.sessionEndTimestamp ? new Date(finishedSession.sessionEndTimestamp) : new Date();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Session Complete</h1>
        <div style={styles.inlineSubtext}>
          {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.metricsGrid}>
          <Metric label="Total Time" value={formatDuration(finishedSession.totalSessionSeconds)} />
          <Metric label="Anchored Time" value={formatDuration(finishedSession.lockedInSeconds)} />
          <Metric label="Focus Rate" value={formatFocusRate(finishedSession.focusRate)} />
          <Metric label="Tab Switches" value={finishedSession.tabSwitchCount.toString()} />
          {finishedSession.idleBeyond2minSeconds > 0 && (
            <Metric label="Idle Time" value={formatDuration(finishedSession.idleBeyond2minSeconds)} />
          )}
          {finishedSession.lockBreakCount > 0 && (
            <Metric label="Lock Breaks" value={finishedSession.lockBreakCount.toString()} />
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Share Files</h2>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
        <button
          style={{ ...styles.button, ...styles.primaryButton, width: '100%', marginBottom: '12px' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFiles || uploadingSession}
        >
          📎 Select Files
        </button>

        {filePreviews.length > 0 && (
          <div style={styles.fileList}>
            <div style={styles.metricLabel}>Selected Files</div>
            {filePreviews.map((preview, index) => (
              <FilePreviewRow
                key={`${preview.file.name}-${index}`}
                preview={preview}
                onRemove={() => onRemovePreview(index)}
                onOpenLightbox={onOpenLightbox}
              />
            ))}
            <button
              style={{
                ...styles.button,
                backgroundColor: '#10b981',
                color: '#ffffff',
                width: '100%',
                opacity: uploadingFiles || uploadingSession ? 0.6 : 1,
              }}
              onClick={onUploadSelectedFiles}
              disabled={uploadingFiles || uploadingSession}
            >
              {uploadingFiles ? 'Uploading…' : 'Upload Files'}
            </button>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div style={styles.fileList}>
            <div style={styles.metricLabel}>Uploaded Files</div>
            {uploadedFiles.map((file) => (
              <UploadedFileRow key={file.id} file={file} onRemove={() => onRemoveUploadedFile(file.id)} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={styles.inlineError}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          style={{
            ...styles.button,
            ...styles.primaryButton,
            flex: 1,
            opacity: uploadingSession ? 0.6 : 1,
          }}
          onClick={onUploadSession}
          disabled={uploadingSession}
        >
          {uploadingSession ? 'Uploading…' : 'Upload to Dashboard'}
        </button>
        <button
          style={{ ...styles.button, flex: 1, backgroundColor: '#6b7280', color: '#ffffff' }}
          onClick={onDiscardSession}
          disabled={uploadingSession}
        >
          Don't Upload
        </button>
      </div>

      {lightboxImage && (
        <div style={styles.lightbox} onClick={onCloseLightbox} tabIndex={-1}>
          <div style={styles.lightboxInner}>
            <img src={lightboxImage} alt="Preview" style={styles.lightboxImg} />
            <button
              style={styles.lightboxClose}
              onClick={(event) => {
                event.stopPropagation();
                onCloseLightbox();
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilePreviewRow({
  preview,
  onRemove,
  onOpenLightbox,
}: {
  preview: FilePreview;
  onRemove: () => void;
  onOpenLightbox: (url: string | null) => void;
}) {
  const isImage = preview.file.type.startsWith('image/');
  return (
    <div style={styles.fileRow}>
      {isImage && preview.previewUrl ? (
        <button style={styles.fileThumbnail} onClick={() => onOpenLightbox(preview.previewUrl || null)}>
          <img src={preview.previewUrl} alt={preview.file.name} style={styles.fileThumbnailImg} />
        </button>
      ) : (
        <div style={styles.fileIcon}>📄</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.fileName}>{preview.file.name}</div>
        <div style={styles.fileMeta}>{(preview.file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button style={styles.removeFileButton} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

function UploadedFileRow({ file, onRemove }: { file: UploadedFileInfo; onRemove: () => void }) {
  return (
    <div style={styles.uploadedRow}>
      <div style={styles.fileName}>{file.filename}</div>
      <button style={styles.removeUploadedButton} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    backgroundColor: '#ffffff',
    minHeight: '520px',
    color: '#111827',
    width: '360px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280',
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  badgeLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '10px',
    letterSpacing: '0.5px',
  },
  connectedStatus: {
    padding: '8px 12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '13px',
  },
  disconnectedStatus: {
    padding: '8px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '13px',
  },
  textInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '13px',
  },
  sessionTime: {
    fontSize: '16px',
  },
  noSession: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  metric: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '16px',
    fontWeight: 600,
  },
  domainCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  domainText: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '6px',
    wordBreak: 'break-all',
  },
  domainTag: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '24px',
  },
  button: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    backgroundColor: '#f3f4f6',
    color: '#111827',
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
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  inlineError: {
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '12px',
  },
  fileList: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    marginBottom: '12px',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '6px',
  },
  fileThumbnail: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid #d1d5db',
    padding: 0,
    cursor: 'pointer',
    background: 'none',
  } as React.CSSProperties,
  fileThumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fileIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    fontSize: '11px',
    color: '#6b7280',
  },
  removeFileButton: {
    border: 'none',
    background: 'none',
    color: '#ef4444',
    fontSize: '20px',
    cursor: 'pointer',
  },
  uploadedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '8px',
    backgroundColor: '#d1fae5',
    marginBottom: '6px',
  },
  removeUploadedButton: {
    border: 'none',
    background: 'none',
    color: '#ef4444',
    fontSize: '18px',
    cursor: 'pointer',
  },
  lightbox: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 9999,
  },
  lightboxInner: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90%',
  },
  lightboxImg: {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  lightboxClose: {
    position: 'absolute',
    top: '-32px',
    right: '0',
    border: 'none',
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#111827',
  },
  inlineSubtext: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
};


