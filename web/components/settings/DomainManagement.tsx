'use client';

import { useState, useEffect } from 'react';
import { DomainsResponse, DomainInfo } from '@/lib/types';
import { getDomains, createDomainOverride, deleteDomainOverride } from '@/lib/apiClient';
import { extractDomainFromUrl } from '@/lib/domainUtils';
import { AnchorCard } from '@/components/ui/AnchorCard';

type Tab = 'productive' | 'unproductive' | 'custom';

interface DomainRowProps {
  domain: string;
  masterClassification: 'productive' | 'unproductive';
  isOverride?: boolean;
  overrideClassification?: 'productive' | 'unproductive' | null;
  onOverride: (domain: string, classification: 'productive' | 'unproductive') => void;
  onRevert: (domain: string) => void;
  updatingDomain?: string | null;
}

function DomainRow({ 
  domain, 
  masterClassification, 
  isOverride, 
  overrideClassification, 
  onOverride, 
  onRevert, 
  updatingDomain 
}: DomainRowProps) {
  const currentClassification = overrideClassification || masterClassification;
  const isOverridden = isOverride && overrideClassification && overrideClassification !== masterClassification;
  const isUpdating = updatingDomain === domain;

  return (
    <div className="group flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-teal-100 hover:shadow-md transition-all duration-300">
      <div className="flex-1">
        <div className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">{domain}</div>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            masterClassification === 'productive' 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-100 text-rose-700 border border-rose-200'
          }`}>
            {masterClassification === 'productive' ? '🧠 Focus' : '🌊 Drift'}
          </span>
          {isOverridden && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                Overridden: {overrideClassification === 'productive' ? 'Productive' : 'Unproductive'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isOverridden && (
          <button
            onClick={() => onRevert(domain)}
            disabled={isUpdating}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
        )}
        <div className="relative">
          <select
            value={currentClassification}
            disabled={isUpdating}
            onChange={async (e) => {
              const newClassification = e.target.value as 'productive' | 'unproductive';
              if (newClassification !== masterClassification) {
                onOverride(domain, newClassification);
              } else if (isOverridden) {
                onRevert(domain);
              }
            }}
            className="appearance-none pl-4 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
          >
            <option value="productive">Productive</option>
            <option value="unproductive">Unproductive</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CustomDomainRowProps {
  domain: string;
  classification: 'productive' | 'unproductive';
  onOverride: (domain: string, classification: 'productive' | 'unproductive') => void;
  onRevert: (domain: string) => void;
  updatingDomain?: string | null;
}

function CustomDomainRow({ domain, classification, onOverride, onRevert, updatingDomain }: CustomDomainRowProps) {
  const isUpdating = updatingDomain === domain;

  return (
    <div className="group flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-teal-100 hover:shadow-md transition-all duration-300">
      <div className="flex-1">
        <div className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">{domain}</div>
        <div className="text-xs text-slate-500 mt-1 font-medium">
          Custom Override
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onRevert(domain)}
          disabled={isUpdating}
          className="text-xs font-bold text-rose-400 hover:text-rose-600 uppercase tracking-wider disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
        <div className="relative">
          <select
            value={classification}
            disabled={isUpdating}
            onChange={(e) => {
              const newClassification = e.target.value as 'productive' | 'unproductive';
              onOverride(domain, newClassification);
            }}
            className="appearance-none pl-4 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
          >
            <option value="productive">Productive</option>
            <option value="unproductive">Unproductive</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DomainManagement() {
  const [data, setData] = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('productive');
  const [searchQuery, setSearchQuery] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newDomainClassification, setNewDomainClassification] = useState<'productive' | 'unproductive'>('productive');
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDomains();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

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

  const handleOverride = async (domain: string, classification: 'productive' | 'unproductive') => {
    try {
      setError(null);
      setUpdatingDomain(domain);
      await createDomainOverride(domain, classification);
      await fetchDomains();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update domain';
      setError(errorMessage);
    } finally {
      setUpdatingDomain(null);
    }
  };

  const handleRevert = async (domain: string) => {
    try {
      setError(null);
      setUpdatingDomain(domain);
      await deleteDomainOverride(domain);
      await fetchDomains();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revert domain';
      setError(errorMessage);
    } finally {
      setUpdatingDomain(null);
    }
  };

  const handleAddCustom = async () => {
    if (!newDomain.trim()) return;
    
    const extractedDomain = extractDomainFromUrl(newDomain.trim());
    if (!extractedDomain) {
      setError('Invalid domain or URL');
      return;
    }

    try {
      setError(null);
      setUpdatingDomain(extractedDomain);
      await createDomainOverride(extractedDomain, newDomainClassification);
      setNewDomain('');
      await fetchDomains();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add domain';
      setError(errorMessage);
    } finally {
      setUpdatingDomain(null);
    }
  };

  const filterDomains = (domains: DomainInfo[]) => {
    if (!searchQuery) return domains;
    const query = searchQuery.toLowerCase();
    return domains.filter(d => d.domain.toLowerCase().includes(query));
  };

  if (loading && !data) {
    return (
      <AnchorCard>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </AnchorCard>
    );
  }

  if (error && !data) {
    return (
      <AnchorCard>
        <div className="text-rose-600 font-medium mb-4">Error: {error}</div>
        <button
          onClick={fetchDomains}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
        >
          Retry Connection
        </button>
      </AnchorCard>
    );
  }

  if (!data) return null;

  const productiveDomains = filterDomains(data.domains.productive);
  const unproductiveDomains = filterDomains(data.domains.unproductive);
  const customDomains = filterDomains(data.domains.custom);

  return (
    <AnchorCard title="Domain Classification" subtitle="Manage which sites are productive">
      {error && (
        <div className="mb-6 p-4 bg-rose-50/80 backdrop-blur border border-rose-200 rounded-2xl text-sm text-rose-600 animate-in slide-in-from-top shadow-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a domain..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-900 placeholder:text-slate-400 shadow-sm group-hover:bg-white"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 transition-colors group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-6">
        {(['productive', 'unproductive', 'custom'] as Tab[]).map((tab) => {
          const count = tab === 'productive' ? productiveDomains.length 
            : tab === 'unproductive' ? unproductiveDomains.length 
            : customDomains.length;
            
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <span className="capitalize">{tab}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Add Section */}
      {(activeTab === 'productive' || activeTab === 'unproductive') && (
        <div className="mb-6 p-1 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex gap-2 p-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  setError(null);
                }}
                placeholder={`Add new ${activeTab} domain (e.g. coursera.org)`}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const classification = activeTab === 'productive' ? 'productive' : 'unproductive';
                    setNewDomainClassification(classification);
                    handleAddCustom();
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                const classification = activeTab === 'productive' ? 'productive' : 'unproductive';
                setNewDomainClassification(classification);
                handleAddCustom();
              }}
              disabled={!newDomain.trim()}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 transition-all"
            >
              Add Domain
            </button>
          </div>
        </div>
      )}

      {/* Domain Lists */}
      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {activeTab === 'productive' && (
          productiveDomains.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No productive domains found</p>
            </div>
          ) : (
            productiveDomains.map((domainInfo) => (
              <DomainRow
                key={domainInfo.domain}
                domain={domainInfo.domain}
                masterClassification="productive"
                isOverride={domainInfo.isOverride}
                overrideClassification={domainInfo.overrideClassification || null}
                onOverride={handleOverride}
                onRevert={handleRevert}
                updatingDomain={updatingDomain}
              />
            ))
          )
        )}

        {activeTab === 'unproductive' && (
          unproductiveDomains.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No unproductive domains found</p>
            </div>
          ) : (
            unproductiveDomains.map((domainInfo) => (
              <DomainRow
                key={domainInfo.domain}
                domain={domainInfo.domain}
                masterClassification="unproductive"
                isOverride={domainInfo.isOverride}
                overrideClassification={domainInfo.overrideClassification || null}
                onOverride={handleOverride}
                onRevert={handleRevert}
                updatingDomain={updatingDomain}
              />
            ))
          )
        )}

        {activeTab === 'custom' && (
          <>
            <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Add Custom Override</label>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => {
                    setNewDomain(e.target.value);
                    setError(null);
                  }}
                  placeholder="example.com"
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                />
                <div className="flex gap-3">
                  <div className="relative">
                    <select
                      value={newDomainClassification}
                      onChange={(e) => setNewDomainClassification(e.target.value as 'productive' | 'unproductive')}
                      className="appearance-none pl-4 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white font-semibold text-slate-700 shadow-sm cursor-pointer"
                    >
                      <option value="productive">Productive</option>
                      <option value="unproductive">Unproductive</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleAddCustom}
                    disabled={!newDomain.trim()}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {customDomains.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">No custom overrides yet</p>
              </div>
            ) : (
              customDomains.map((domainInfo) => (
                <CustomDomainRow
                  key={domainInfo.domain}
                  domain={domainInfo.domain}
                  classification={domainInfo.classification}
                  onOverride={handleOverride}
                  onRevert={handleRevert}
                  updatingDomain={updatingDomain}
                />
              ))
            )}
          </>
        )}
      </div>
    </AnchorCard>
  );
}
