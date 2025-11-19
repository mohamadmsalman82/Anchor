'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { PageHeader } from '@/components/ui/PageHeader';
import { TimelineChart } from '@/components/ui/TimelineChart';
import { SessionEditModal } from '@/components/ui/SessionEditModal';
import { formatDuration, formatFocusRate, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { use } from 'react';
import Image from 'next/image';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading, error, mutate } = useSession(id);
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-700">Failed to load session: {error || 'Session not found'}</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(session.startedAt);
  const endDate = session.endedAt ? new Date(session.endedAt) : null;

  // Calculate domain breakdown
  // Use backend's authoritative classification from segments
  const domainStats = new Map<string, {
    totalSeconds: number;
    lockedInSeconds: number;
    productive: boolean;
    reason?: string | null; // Store reason for accurate labeling
  }>();

  session.activitySegments?.forEach((segment) => {
    if (!segment.domain) return;
    
    const domain = segment.domain;
    const duration = Math.floor(
      (new Date(segment.end).getTime() - new Date(segment.start).getTime()) / 1000
    );

    if (!domainStats.has(domain)) {
      domainStats.set(domain, {
        totalSeconds: 0,
        lockedInSeconds: 0,
        productive: segment.productive,
        reason: segment.reason || null,
      });
    }

    const stats = domainStats.get(domain)!;
    stats.totalSeconds += duration;
    if (segment.lockedIn) {
      stats.lockedInSeconds += duration;
    }
    // Update reason if we find a more specific one (unproductive takes precedence)
    if (segment.reason === 'unproductive_domain') {
      stats.reason = 'unproductive_domain';
    }
  });

  const isOwner = user && session.userId === user.id;

  const handleSave = (updatedSession: typeof session) => {
    mutate(updatedSession, false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-4">
        <PageHeader
          title={session.title || 'Untitled Session'}
          subtitle={
            endDate
              ? `${startDate.toLocaleDateString()} • ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Started ${formatRelativeTime(session.startedAt)}`
          }
        />
        {isOwner && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="ml-4 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Edit session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-top">
          Session updated successfully
        </div>
      )}

      <SessionEditModal
        session={session}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Summary */}
        <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Session Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">Anchored</div>
              <div className="text-2xl font-semibold text-slate-900">
                {formatDuration(session.lockedInSeconds)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Total Time</div>
              <div className="text-2xl font-semibold text-slate-900">
                {formatDuration(session.totalSessionSeconds)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Focus Rate</div>
              <div className="text-2xl font-semibold text-slate-900">
                {formatFocusRate(session.focusRate)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs text-slate-600 mb-1">Idle Time</div>
                <div className="text-sm font-medium text-slate-900">
                  {formatDuration(session.idleBeyond2minSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Tab Switches</div>
                <div className="text-sm font-medium text-slate-900">
                  {session.tabSwitchCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Lock Breaks</div>
                <div className="text-sm font-medium text-slate-900">
                  {session.lockBreakCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Timeline</h3>
          {session.activitySegments && session.activitySegments.length > 0 ? (
            <TimelineChart
              segments={session.activitySegments}
              totalDuration={session.totalSessionSeconds}
            />
          ) : (
            <p className="text-sm text-slate-500">No activity data available</p>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {session.aiSummary && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI Summary</h3>
          <p className="text-sm text-slate-600">{session.aiSummary}</p>
        </div>
      )}

      {/* Files/Images Section */}
      {session.files && session.files.length > 0 && (
        <div className="rounded-xl bg-white p-6 border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Shared Files</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {session.files.map((file) => {
              const isImage = file.fileType.startsWith('image/');
              const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
              const fileUrl = file.fileUrl.startsWith('http') 
                ? file.fileUrl 
                : `${apiBaseUrl}${file.fileUrl}`;

              return (
                <div key={file.id} className="relative group">
                  {isImage ? (
                    <div 
                      className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                      onClick={() => setLightboxImage(fileUrl)}
                    >
                      <Image
                        src={fileUrl}
                        alt={file.filename}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ) : (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      download
                    >
                      <span className="text-4xl mb-2">📄</span>
                      <span className="text-xs text-slate-700 text-center truncate w-full">
                        {file.filename}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sites Breakdown */}
      {domainStats.size > 0 && (
        <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sites Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Domain</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Productive</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Time</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Anchored</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(domainStats.entries())
                  .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
                  .map(([domain, stats]) => (
                    <tr key={domain} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{domain}</td>
                      <td className="py-3 px-4">
                        {(() => {
                          // Use backend's authoritative classification
                          let label = 'Neutral';
                          let className = 'bg-slate-100 text-slate-700';
                          
                          if (stats.productive) {
                            label = 'Focus site 🧠';
                            className = 'bg-emerald-100 text-emerald-700';
                          } else if (stats.reason === 'unproductive_domain') {
                            label = 'Distraction 🚨';
                            className = 'bg-red-100 text-red-700';
                          } else if (stats.reason === 'neutral_domain') {
                            label = 'Neutral';
                            className = 'bg-slate-100 text-slate-700';
                          }
                          
                          return (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatDuration(stats.totalSeconds)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatDuration(stats.lockedInSeconds)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLightboxImage(null);
            }
          }}
          tabIndex={-1}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <Image
              src={lightboxImage}
              alt="Full size preview"
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              unoptimized
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 transition-colors"
              aria-label="Close image preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

