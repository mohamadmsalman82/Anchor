'use client';

import { useState, useEffect } from 'react';
import { DomainsResponse, DomainInfo } from '@/lib/types';
import { getDomains, createDomainOverride, deleteDomainOverride } from '@/lib/apiClient';
import { extractDomainFromUrl, isValidDomain } from '@/lib/domainUtils';

export function DomainManagement() {
  const [data, setData] = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newDomainType, setNewDomainType] = useState<'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL'>('PRODUCTIVE');
  const [activeTab, setActiveTab] = useState<'productive' | 'unproductive' | 'custom'>('productive');
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDomains();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (domain: string, type: 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL') => {
    // Hardcoded: q.utoronto.ca cannot be overridden
    const domainLower = domain.toLowerCase().trim();
    if (domainLower === 'q.utoronto.ca' || domainLower.endsWith('.q.utoronto.ca')) {
      setError('q.utoronto.ca is always productive and cannot be overridden');
      return;
    }

    try {
      setError(null);
      setUpdatingDomain(domain);
      const result = await createDomainOverride(domain, type);
      console.log('Override created:', result);
      await fetchDomains();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update domain';
      setError(errorMessage);
      console.error('Failed to override domain:', err);
    } finally {
      setUpdatingDomain(null);
    }
  };

  const handleRevert = async (domain: string) => {
    try {
      setError(null);
      setUpdatingDomain(domain);
      const result = await deleteDomainOverride(domain);
      console.log('Override deleted:', result);
      await fetchDomains();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revert domain';
      setError(errorMessage);
      console.error('Failed to revert domain:', err);
    } finally {
      setUpdatingDomain(null);
    }
  };

  const handleAddCustom = async () => {
    if (!newDomain.trim()) return;
    
    // Extract domain from URL if it's a full URL
    const extractedDomain = extractDomainFromUrl(newDomain.trim());
    if (!extractedDomain) {
      setError('Invalid domain or URL. Please enter a valid domain (e.g., example.com) or URL (e.g., https://example.com)');
      return;
    }

    try {
      await createDomainOverride(extractedDomain, newDomainType);
      setNewDomain('');
      setError(null);
      await fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    }
  };

  const filterDomains = (domains: DomainInfo[]) => {
    if (!searchQuery) return domains;
    const query = searchQuery.toLowerCase();
    return domains.filter(d => d.domain.toLowerCase().includes(query));
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={fetchDomains}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const productiveDomains = filterDomains(data.domains.productive);
  const unproductiveDomains = filterDomains(data.domains.unproductive);
  const customDomains = filterDomains(data.domains.custom);

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Domain Classification</h3>
        <p className="text-sm text-slate-600">
          Override preset domain classifications. Productive domains allow lock-in, unproductive domains prevent it.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search domains..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('productive')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'productive'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Productive ({productiveDomains.length})
        </button>
        <button
          onClick={() => setActiveTab('unproductive')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'unproductive'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Unproductive ({unproductiveDomains.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'custom'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Custom ({customDomains.length})
        </button>
      </div>

      {/* Quick Add Section (for productive and unproductive tabs) */}
      {(activeTab === 'productive' || activeTab === 'unproductive') && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => {
                setNewDomain(e.target.value);
                setError(null);
              }}
              placeholder={`Add ${activeTab === 'productive' ? 'productive' : 'unproductive'} domain (URL or domain)`}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const type = activeTab === 'productive' ? 'PRODUCTIVE' : 'UNPRODUCTIVE';
                  setNewDomainType(type);
                  handleAddCustom();
                }
              }}
            />
            <button
              onClick={() => {
                const type = activeTab === 'productive' ? 'PRODUCTIVE' : 'UNPRODUCTIVE';
                setNewDomainType(type);
                handleAddCustom();
              }}
              disabled={!newDomain.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add as {activeTab === 'productive' ? 'Productive' : 'Unproductive'}
            </button>
          </div>
          {newDomain && extractDomainFromUrl(newDomain) && (
            <p className="text-xs text-slate-500 mt-2">
              Will add: <span className="font-mono font-medium">{extractDomainFromUrl(newDomain)}</span>
            </p>
          )}
        </div>
      )}

      {/* Domain Lists */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activeTab === 'productive' && (
          <>
            {productiveDomains.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No productive domains found</p>
            ) : (
              productiveDomains.map((domainInfo) => (
                <DomainRow
                  key={domainInfo.domain}
                  domain={domainInfo.domain}
                  presetType="PRODUCTIVE"
                  isOverride={domainInfo.isOverride}
                  overrideType={domainInfo.overrideType}
                  onOverride={handleOverride}
                  onRevert={handleRevert}
                  updatingDomain={updatingDomain}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'unproductive' && (
          <>
            {unproductiveDomains.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No unproductive domains found</p>
            ) : (
              unproductiveDomains.map((domainInfo) => (
                <DomainRow
                  key={domainInfo.domain}
                  domain={domainInfo.domain}
                  presetType="UNPRODUCTIVE"
                  isOverride={domainInfo.isOverride}
                  overrideType={domainInfo.overrideType}
                  onOverride={handleOverride}
                  onRevert={handleRevert}
                  updatingDomain={updatingDomain}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'custom' && (
          <>
            {/* Add custom domain */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="mb-2">
                <label className="text-sm font-medium text-slate-700">Add Domain Override</label>
                <p className="text-xs text-slate-500 mt-1">
                  Paste a full URL (e.g., https://instagram.com) or just the domain (e.g., instagram.com)
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => {
                    setNewDomain(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://instagram.com or instagram.com"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                />
                <select
                  value={newDomainType}
                  onChange={(e) => setNewDomainType(e.target.value as 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="PRODUCTIVE">Productive</option>
                  <option value="UNPRODUCTIVE">Unproductive</option>
                  <option value="NEUTRAL">Neutral</option>
                </select>
                <button
                  onClick={handleAddCustom}
                  disabled={!newDomain.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {newDomain && extractDomainFromUrl(newDomain) && (
                <p className="text-xs text-slate-500 mt-2">
                  Will add: <span className="font-mono font-medium">{extractDomainFromUrl(newDomain)}</span>
                </p>
              )}
            </div>

            {customDomains.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No custom domains. Add one above.</p>
            ) : (
              customDomains.map((domainInfo) => (
                <DomainRow
                  key={domainInfo.domain}
                  domain={domainInfo.domain}
                  presetType={null}
                  isOverride={true}
                  overrideType={domainInfo.type}
                  onOverride={handleOverride}
                  onRevert={handleRevert}
                  updatingDomain={updatingDomain}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}


interface DomainRowProps {
  domain: string;
  presetType: 'PRODUCTIVE' | 'UNPRODUCTIVE' | null;
  isOverride?: boolean;
  overrideType?: 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL';
  onOverride: (domain: string, type: 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL') => void;
  onRevert: (domain: string) => void;
  updatingDomain?: string | null;
}

function DomainRow({ domain, presetType, isOverride, overrideType, onOverride, onRevert, updatingDomain }: DomainRowProps) {
  const currentType = overrideType || presetType || 'NEUTRAL';
  const isOverridden = isOverride && overrideType !== presetType;
  const isUpdating = updatingDomain === domain;
  const domainLower = domain.toLowerCase().trim();
  const isHardcoded = domainLower === 'q.utoronto.ca' || domainLower.endsWith('.q.utoronto.ca');

  return (
    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-slate-900">{domain}</div>
        <div className="text-xs text-slate-500 mt-1">
          {isHardcoded ? (
            <>Hardcoded: <span className="font-medium text-emerald-600">Always Productive</span></>
          ) : presetType ? (
            <>
              Preset: <span className="font-medium">{presetType}</span>
              {isOverridden && (
                <> • Override: <span className="font-medium">{overrideType}</span></>
              )}
            </>
          ) : (
            <>Custom: <span className="font-medium">{overrideType}</span></>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOverridden && !isHardcoded && (
          <button
            onClick={() => onRevert(domain)}
            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Revert
          </button>
        )}
        {isHardcoded && (
          <span className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg">
            Always Productive
          </span>
        )}
        <select
          value={currentType}
          disabled={isUpdating || isHardcoded}
          onChange={async (e) => {
            const newType = e.target.value as 'PRODUCTIVE' | 'UNPRODUCTIVE' | 'NEUTRAL';
            // If there's no preset (custom domain), always override
            if (presetType === null) {
              onOverride(domain, newType);
            } 
            // If new type is different from preset, create override
            else if (newType !== presetType) {
              onOverride(domain, newType);
            } 
            // If new type matches preset and it's currently overridden, revert
            else if (isOverridden) {
              onRevert(domain);
            }
            // If new type matches preset and it's not overridden, do nothing
          }}
          className="px-3 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="PRODUCTIVE">Productive</option>
          <option value="UNPRODUCTIVE">Unproductive</option>
          <option value="NEUTRAL">Neutral</option>
        </select>
      </div>
    </div>
  );
}

