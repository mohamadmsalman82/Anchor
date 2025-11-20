'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getAvatarColor, getInitials, getProfilePictureUrl } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const navLinks = [
    { 
      href: '/dashboard', 
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      href: '/feed', 
      label: 'Feed',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      href: '/friends', 
      label: 'Friends',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      href: '/leaderboard', 
      label: 'Leaderboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/settings', 
      label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  return (
    <>
      {/* Top Header (Desktop: Logo + Profile) */}
      <header className="fixed top-0 left-0 right-0 z-40 hidden md:flex justify-between items-center px-8 py-6 pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="22" x2="12" y2="8" />
                <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Anchor</span>
          </Link>
        </div>

        <div className="relative pointer-events-auto" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <div className="relative">
              {getProfilePictureUrl(user?.profilePictureUrl) ? (
                <img
                  src={getProfilePictureUrl(user?.profilePictureUrl) || ''}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md group-hover:border-teal-100 transition-colors"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.email || '')} flex items-center justify-center text-white font-bold shadow-md border-2 border-white group-hover:border-teal-100 transition-colors`}>
                  {getInitials(user?.email || '')}
                </div>
              )}
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl border border-white/60 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-5 py-4 border-b border-slate-100/50 mb-2">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500 truncate font-medium">{user?.email}</p>
              </div>
              <Link
                href={`/profile/${user?.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              <div className="h-px bg-slate-100 my-2 mx-4" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-5 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50/50 transition-colors rounded-b-2xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Floating Dock (Desktop & Mobile) */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <nav className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-300/40 rounded-3xl px-2 py-2 pointer-events-auto flex items-center gap-1 md:gap-3 max-w-full overflow-x-auto no-scrollbar ring-1 ring-slate-200/50">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  group relative flex flex-col md:flex-row items-center gap-1 md:gap-2 
                  px-4 py-2.5 rounded-2xl transition-all duration-300 ease-out
                  ${isActive 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/25 scale-105 translate-y-[-2px]' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/80 hover:shadow-sm hover:scale-105'
                  }
                `}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {link.icon}
                </div>
                <span className={`text-[10px] md:text-sm font-bold tracking-tight ${isActive ? 'text-white' : ''} ${!isActive && 'hidden md:block'}`}>
                  {link.label}
                </span>
                
                {/* Active Indicator Dot */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_5px_rgba(45,212,191,0.8)] md:hidden"></span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Mobile Top Bar (Just for Profile) */}
      <div className="md:hidden fixed top-0 right-0 p-5 z-40">
         <button
            onClick={() => setShowMenu(!showMenu)}
            className="relative group"
          >
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-full shadow-sm group-hover:scale-110 transition-transform"></div>
            <div className="relative">
              {getProfilePictureUrl(user?.profilePictureUrl) ? (
                <img
                  src={getProfilePictureUrl(user?.profilePictureUrl) || ''}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.email || '')} flex items-center justify-center text-white font-bold shadow-sm border-2 border-white`}>
                  {getInitials(user?.email || '')}
                </div>
              )}
            </div>
         </button>
      </div>
    </>
  );
}
