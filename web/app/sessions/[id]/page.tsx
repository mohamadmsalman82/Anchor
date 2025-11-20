'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { TimelineChart } from '@/components/ui/TimelineChart';
import { SessionEditModal } from '@/components/ui/SessionEditModal';
import { formatDuration, formatFocusRate, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { use } from 'react';
import Image from 'next/image';
import { AnchorCard } from '@/components/ui/AnchorCard';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading, error, mutate } = useSession(id);
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-slate-200 rounded-3xl w-full mb-8"></div>
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
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl bg-red-50 border border-red-200 p-12 text-center">
          <p className="text-red-700 text-lg">Failed to load session: {error || 'Session not found'}</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(session.startedAt);
  const endDate = session.endedAt ? new Date(session.endedAt) : null;

  // Calculate domain breakdown
  const domainStats = new Map<string, {
    totalSeconds: number;
    lockedInSeconds: number;
    productive: boolean;
    reason?: string | null;
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
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header Card - Futuristic */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl shadow-slate-900/20">
        {/* Dynamic Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl -ml-32 -mb-32 mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        </div>

        <div className="relative z-10 p-8 md:p-10">
           <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 text-teal-400 mb-2">
                <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-bold tracking-widest uppercase">Session Report</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white">
                {session.title || 'Untitled Session'}
              </h1>
              <div className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {endDate
                  ? `${startDate.toLocaleDateString()} • ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `Started ${formatRelativeTime(session.startedAt)}`
                }
              </div>
            </div>
            
            {/* Big Stats */}
            <div className="flex items-center gap-8 md:gap-12 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Anchored</div>
                <div className="text-3xl md:text-4xl font-bold text-teal-400 tabular-nums">{formatDuration(session.lockedInSeconds)}</div>
              </div>
              <div className="w-px h-12 bg-white/10"></div>
              <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Focus Rate</div>
                <div className="text-3xl md:text-4xl font-bold text-white tabular-nums">{formatFocusRate(session.focusRate)}</div>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          {isOwner && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-teal-500 text-white px-6 py-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-top flex items-center gap-3">
          <div className="p-1 bg-white/20 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">Session updated successfully</span>
        </div>
      )}

      <SessionEditModal
        session={session}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline & AI Summary */}
        <div className="space-y-6">
          <AnchorCard title="Timeline" subtitle="Session flow visualization">
             {session.activitySegments && session.activitySegments.length > 0 ? (
              <div className="py-4">
                <TimelineChart
                  segments={session.activitySegments}
                  totalDuration={session.totalSessionSeconds}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic">No timeline data available for this session.</div>
            )}
          </AnchorCard>

           {session.aiSummary && (
            <AnchorCard title="Session Log" className="bg-indigo-50/30 border-indigo-100/50">
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-slate-700 leading-relaxed text-lg font-medium font-serif italic">"{session.aiSummary}"</p>
                  <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-3">AI Analysis</p>
                </div>
              </div>
            </AnchorCard>
          )}
        </div>

        {/* Sites Breakdown */}
        <div className="space-y-6">
          {domainStats.size > 0 ? (
            <AnchorCard title="Domain Breakdown" subtitle="Where your attention went">
              <div className="space-y-3 mt-2">
                {Array.from(domainStats.entries())
                  .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
                  .map(([domain, stats]) => (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          stats.productive ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {stats.productive ? '🧠' : '🌊'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{domain}</div>
                          <div className={`text-xs font-medium ${stats.productive ? 'text-teal-600' : 'text-rose-500'}`}>
                            {stats.productive ? 'Focus Site' : 'Distraction'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-slate-900 tabular-nums">{formatDuration(stats.totalSeconds)}</div>
                        <div className="text-xs text-slate-400 font-medium">
                          {stats.lockedInSeconds > 0 ? (
                            <span className="text-teal-600">{formatDuration(stats.lockedInSeconds)} anchored</span>
                          ) : 'drifting'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </AnchorCard>
          ) : (
             <AnchorCard>
                <div className="text-center py-12 text-slate-400">No domain data recorded</div>
             </AnchorCard>
          )}
        </div>
      </div>

      {/* Files Section */}
      {session.files && session.files.length > 0 && (
        <AnchorCard title="Artifacts" subtitle="Files captured in deep waters">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                      className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                      onClick={() => setLightboxImage(fileUrl)}
                    >
                      <Image
                        src={fileUrl}
                        alt={file.filename}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all aspect-square group"
                      download
                    >
                      <span className="text-4xl mb-3 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all">📄</span>
                      <span className="text-xs text-slate-600 text-center truncate w-full font-semibold px-2">
                        {file.filename}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-200/50 px-2 py-0.5 rounded-full">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </AnchorCard>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLightboxImage(null);
            }
          }}
          tabIndex={-1}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Image
              src={lightboxImage}
              alt="Full size preview"
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl drop-shadow-2xl"
              unoptimized
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors backdrop-blur-md border border-white/10"
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
