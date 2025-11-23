'use client';

import { useEffect, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';

interface BackgroundSceneProps {
  className?: string;
}

export function BackgroundScene({ className = '' }: BackgroundSceneProps) {
  const { data } = useDashboardData();
  // Check if we have an active session
  const isActive = data?.hasActiveSession ?? false;
  
  // Smooth transition state
  const [showUnderwater, setShowUnderwater] = useState(false);

  useEffect(() => {
    setShowUnderwater(isActive);
  }, [isActive]);

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden transition-colors duration-1000 ${className}`}>
      {/* Base Layers - Gradient Transitions */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out bg-gradient-to-b from-sky-50 to-white ${showUnderwater ? 'opacity-0' : 'opacity-100'}`} 
      />
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 ${showUnderwater ? 'opacity-100' : 'opacity-0'}`} 
      />

      {/* Above Water Elements (Idle State) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${showUnderwater ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Distant Horizon */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-teal-50/50 to-transparent" />
        
        {/* Subtle moving waves (CSS animation) */}
        <div className="absolute bottom-[-50px] left-0 right-0 h-[150px] w-[200%] opacity-30 animate-wave-slow bg-[url('/waves.svg')] bg-repeat-x" />
        <div className="absolute bottom-[-30px] left-[-20px] right-0 h-[150px] w-[200%] opacity-20 animate-wave-medium bg-[url('/waves.svg')] bg-repeat-x" style={{ animationDelay: '-2s' }} />

        {/* Floating Particles / Birds */}
        <div className="absolute top-20 right-20 w-2 h-2 rounded-full bg-slate-400/20 animate-float-slow" />
        <div className="absolute top-40 left-1/4 w-1.5 h-1.5 rounded-full bg-slate-400/10 animate-float-medium" />
      </div>

      {/* Underwater Elements (Active State) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${showUnderwater ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* God Rays */}
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-teal-500/10 to-transparent transform -skew-x-12 blur-3xl" />
        <div className="absolute top-0 right-1/3 w-48 h-full bg-gradient-to-b from-teal-400/5 to-transparent transform -skew-x-12 blur-3xl" />
        
        {/* Bubbles */}
        <div className="bubble-container absolute inset-0 overflow-hidden pointer-events-none">
           {/* We can generate some random bubbles via CSS in globals or map here */}
           {[...Array(8)].map((_, i) => (
             <div 
               key={i}
               className="absolute bg-white/10 rounded-full animate-bubble-rise"
               style={{
                 left: `${Math.random() * 100}%`,
                 width: `${Math.random() * 10 + 4}px`,
                 height: `${Math.random() * 10 + 4}px`,
                 animationDuration: `${Math.random() * 10 + 5}s`,
                 animationDelay: `${Math.random() * 5}s`,
                 bottom: '-20px'
               }}
             />
           ))}
        </div>

        {/* Subtle floating particles/plankton */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>
      
      {/* Global Overlay Texture for both modes */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 pointer-events-none" />
    </div>
  );
}

