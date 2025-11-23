import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { AnchorCard } from '@/components/ui/AnchorCard';
import { AnimatedWaveBackground } from '@/components/ui/AnimatedWaveBackground';

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-transparent text-slate-100">
      <AnimatedWaveBackground intensity="medium" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative w-20 h-20 bg-slate-900/90 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-950/40 group border border-slate-700/70">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-teal-500 rounded-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 blur-2xl"></div>
            <svg className="w-10 h-10 text-white relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="22" x2="12" y2="8" />
              <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-50 tracking-tight mb-2">Join Anchor</h1>
          <p className="text-slate-300 text-lg">Focus deeper. Achieve more.</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <AnchorCard className="p-8 md:p-10 border-slate-700/70 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-slate-950/40">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-50">Create Account</h2>
              <p className="text-sm text-slate-300 mt-1">Start your deep work journey.</p>
            </div>
            
            <AuthForm mode="register" />

            <div className="mt-8 pt-6 border-t border-slate-700/70 text-center">
              <p className="text-sm text-slate-400 mb-3">Already anchored?</p>
              <Link 
                href="/auth/login" 
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900/80 text-slate-100 font-semibold text-sm hover:bg-slate-900 transition-colors border border-slate-600 group"
              >
                Sign in
                <svg className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </AnchorCard>
        </div>
        
        <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Free for students forever</p>
        </div>
      </div>
    </div>
  );
}
