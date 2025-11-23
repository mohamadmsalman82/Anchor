import Link from 'next/link';
import { Session } from '@/lib/types';
import { formatDuration, formatFocusRate, formatRelativeTime, getAvatarColor, getInitials } from '@/lib/utils';
import { FocusBar } from './FocusBar';
import Image from 'next/image';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const user = session.user;
  const isHighFocus = session.focusRate >= 0.75;
  
  return (
    <Link href={`/sessions/${session.id}`}>
      <div className="rounded-2xl bg-slate-900/40 border border-slate-700/40 shadow-lg shadow-slate-900/40 p-6 transition-all duration-200 hover:bg-slate-900/70 hover:border-cyan-300/50 cursor-pointer">
        {/* User info */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.email || '')} flex items-center justify-center text-white font-semibold`}>
            {getInitials(user?.email || '')}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-100">{user?.email || 'Unknown'}</div>
            <div className="text-xs text-slate-400">{formatRelativeTime(session.startedAt)}</div>
          </div>
        </div>

        {/* Session title */}
        <h3 className="text-lg font-semibold text-slate-50 mb-3">
          {session.title || 'Untitled Session'}
        </h3>

        {/* Focus metrics */}
        <div className="flex items-center gap-4 mb-3 text-sm text-slate-300">
          <span>Anchored: {formatDuration(session.lockedInSeconds)}</span>
          <span>•</span>
          <span>Total: {formatDuration(session.totalSessionSeconds)}</span>
          <span>•</span>
          <span>Focus: {formatFocusRate(session.focusRate)}</span>
        </div>

        {/* Focus bar */}
        <div className="mb-3">
          <FocusBar focusRate={session.focusRate} />
        </div>

        {/* Focus badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isHighFocus 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
              : 'bg-amber-500/10 text-amber-300 border border-amber-300/40'
          }`}>
            {isHighFocus ? 'High Focus 🔒' : 'Mixed Focus'}
          </span>
        </div>

        {/* AI summary */}
        {session.aiSummary && (
          <p className="text-sm text-slate-200 italic mt-3">{session.aiSummary}</p>
        )}

        {/* Files/Images */}
        {session.files && session.files.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {session.files.map((file) => {
                const isImage = file.fileType.startsWith('image/');
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const fileUrl = file.fileUrl.startsWith('http') 
                  ? file.fileUrl 
                  : `${apiBaseUrl}${file.fileUrl}`;

                return (
                  <div key={file.id} className="relative" onClick={(e) => e.stopPropagation()}>
                    {isImage ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-600/60">
                        <Image
                          src={fileUrl}
                          alt={file.filename}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(fileUrl, '_blank', 'noopener');
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <span className="text-2xl">📄</span>
                        <span className="text-xs text-slate-100 truncate max-w-[100px]">
                          {file.filename}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

