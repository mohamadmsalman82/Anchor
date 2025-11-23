import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedWaveBackgroundProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export const AnimatedWaveBackground: React.FC<AnimatedWaveBackgroundProps> = ({ 
  className,
  intensity = 'medium' 
}) => {
  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-950", className)}>
      <svg
        className="absolute bottom-0 left-0 w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#0f172a', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Deep Background Layer */}
        <rect width="100%" height="100%" fill="url(#grad1)" />

        {/* Wave Layer 1 (Back) - Slowest */}
        <g className="animate-wave-drift opacity-40" style={{ animationDuration: '45s' }}>
          <path
            fill="#1e3a8a" /* blue-900 */
            d="M0,600 C320,700 420,500 740,600 C1060,700 1160,500 1480,600 L1480,800 L0,800 Z"
            transform="scale(2 1)"
          />
          <path
            fill="#1e3a8a" 
            d="M1480,600 C1800,700 1900,500 2220,600 C2540,700 2640,500 2960,600 L2960,800 L1480,800 Z"
            transform="scale(2 1) translate(-740, 0)"
          />
        </g>

        {/* Wave Layer 2 (Middle) - Medium Speed */}
        <g className="animate-wave-drift opacity-30" style={{ animationDuration: '30s', transformOrigin: 'bottom' }}>
           <path
            fill="#0e7490" /* cyan-700 */
            d="M0,650 C300,600 400,750 700,650 C1000,550 1100,700 1440,650 L1440,800 L0,800 Z"
            transform="scale(2 1)"
          />
           <path
            fill="#0e7490"
            d="M1440,650 C1740,600 1840,750 2140,650 C2440,550 2540,700 2880,650 L2880,800 L1440,800 Z"
            transform="scale(2 1) translate(-720, 0)"
          />
        </g>

        {/* Wave Layer 3 (Front) - Fastest */}
        <g className="animate-wave-drift opacity-20" style={{ animationDuration: '20s' }}>
          <path
            fill="#0891b2" /* cyan-600 */
            d="M0,700 C250,750 350,650 600,700 C850,750 950,650 1200,700 C1450,750 1550,650 1800,700 L1800,800 L0,800 Z"
            transform="scale(2 1)"
          />
          <path
            fill="#0891b2"
            d="M1800,700 C2050,750 2150,650 2400,700 C2650,750 2750,650 3000,700 C3250,750 3350,650 3600,700 L3600,800 L1800,800 Z"
            transform="scale(2 1) translate(-900, 0)"
          />
        </g>
      </svg>
      
      {/* Overlay for blending */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none" />
    </div>
  );
};

