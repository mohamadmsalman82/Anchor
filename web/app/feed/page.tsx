'use client';

import { ComingSoon } from '@/components/ui/ComingSoon';
import { AnimatedWaveBackground } from '@/components/ui/AnimatedWaveBackground';

export default function FeedPage() {
  return (
    <div className="relative min-h-screen w-full bg-transparent text-slate-100 overflow-hidden">
      <AnimatedWaveBackground intensity="medium" />
      <div className="max-w-2xl mx-auto py-16 px-4">
        <ComingSoon
          title="Session Feed"
          description="Soon you'll be able to browse and vouch for verified focus sessions from the Anchor community."
        />
      </div>
    </div>
  );
}
