'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function ExtensionConnect() {
  const { authToken } = useAuth();
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if Chrome extension API is available
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
      setExtensionDetected(true);
      checkConnectionStatus();
    } else {
      setChecking(false);
    }
  }, [authToken]);

  const checkConnectionStatus = async () => {
    if (!authToken) {
      setConnected(false);
      setChecking(false);
      return;
    }

    try {
      // Try to check if extension has the token by attempting to send a message
      // This is a lightweight check - we'll try to ping the extension
      if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
        // Check connection by trying to read from extension storage
        // Note: We can't directly read extension storage from web page,
        // so we'll rely on the connect attempt to verify
        setChecking(false);
        // Connection status will be updated when user tries to connect
      }
    } catch (err) {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    if (!authToken) {
      setError('Please log in first');
      return;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
        // Get the extension ID - we need to find it or ask user to provide it
        // For now, we'll try to get it from the extension's runtime
        const extensionId = (window as any).chrome.runtime.id;
        
        // If we're on the extension's own page, extensionId will be set
        // Otherwise, we need the extension ID from the user or manifest
        // For external messaging, we need the extension ID
        
        // Try to find extension ID by checking installed extensions
        // This is a workaround - in production, you'd store the extension ID
        const possibleIds = [
          extensionId, // Current extension if on extension page
          // Add known extension IDs here if you have them
        ].filter(Boolean);

        let connected = false;
        
        for (const id of possibleIds) {
          try {
            await new Promise<void>((resolve, reject) => {
              (window as any).chrome.runtime.sendMessage(
                id,
                {
                  type: 'ANCHOR_CONNECT',
                  authToken: authToken,
                },
                (response: any) => {
                  if ((window as any).chrome.runtime.lastError) {
                    const error = (window as any).chrome.runtime.lastError.message;
                    if (!error.includes('Could not establish connection')) {
                      reject(new Error(error));
                    } else {
                      resolve(); // Try next ID
                    }
                  } else if (response && response.success) {
                    setConnected(true);
                    setError(null);
                    connected = true;
                    resolve();
                  } else {
                    resolve(); // Try next ID
                  }
                }
              );
            });
            
            if (connected) break;
          } catch (err) {
            // Try next ID
            continue;
          }
        }
        
        if (!connected) {
          // Fallback: show manual token input option
          setError('Could not automatically connect. Please use the "Copy" button below to copy your token, then paste it in the extension popup.');
        } else {
          // Success - show success message briefly
          setTimeout(() => {
            // Keep connected state
          }, 100);
        }
      } else {
        setError('Chrome extension API not available. Please open this page in Chrome.');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect to extension: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCopyToken = () => {
    if (authToken && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(authToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur border border-slate-700/60 p-6 shadow-lg shadow-slate-950/40">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Chrome Extension Status</h3>
      
      <div className="space-y-4">
        {/* Connection status indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(45,212,191,0.7)]' : 'bg-slate-500'}`}></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-100">
              {connected ? 'Connected ✅' : 'Not connected ⚠️'}
            </div>
            <div className="text-xs text-slate-300">
              {extensionDetected 
                ? 'Extension detected in browser'
                : 'Open this page in Chrome with the Anchor extension installed'}
            </div>
          </div>
        </div>

        {/* Connection status message */}
        {connected && (
          <div className="flex items-center gap-2 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/40 p-3 rounded-lg mb-4">
            <span>✅</span>
            <span>Extension connected successfully! Your sessions will sync automatically.</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-rose-200 bg-rose-900/40 border border-rose-500/40 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Connect button */}
        {authToken && !connected && extensionDetected && (
          <button
            onClick={handleConnect}
            className="w-full px-4 py-2 bg-teal-500 text-slate-950 rounded-lg font-semibold hover:bg-teal-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/40"
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Connect Extension'}
          </button>
        )}

        {/* Revoke connection button */}
        {authToken && connected && (
          <button
            onClick={async () => {
              if (confirm('This will disconnect your extension. You can reconnect anytime. Continue?')) {
                setConnected(false);
                setError(null);
                // Note: Actual token revocation would require backend API
                // For now, just update UI state
              }
            }}
            className="w-full px-4 py-2 bg-rose-600/90 text-white rounded-lg font-medium hover:bg-rose-500 transition-colors duration-200 mt-2 shadow-md shadow-rose-900/40"
          >
            Revoke Connection
          </button>
        )}

        {/* Fallback: Manual token copy */}
        {authToken && (
          <div className="pt-4 border-t border-slate-700/60">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Your connection token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={authToken}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-slate-600/60 rounded-lg bg-slate-900/80 text-slate-200 font-mono"
              />
              <button
                onClick={handleCopyToken}
                className="px-4 py-2 text-sm bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors duration-200 border border-slate-600"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              If automatic connection doesn't work, copy this token and paste it in the extension settings.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="pt-4 border-t border-slate-700/60 mt-4">
          <p className="text-sm text-slate-300">
            Install the Anchor Chrome extension and click 'Connect' to start tracking your focus sessions.
          </p>
        </div>
      </div>
    </div>
  );
}

