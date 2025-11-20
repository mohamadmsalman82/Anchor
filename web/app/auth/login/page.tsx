import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { AnchorCard } from '@/components/ui/AnchorCard';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50">
      {/* Ocean Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-teal-400/5 rounded-full blur-3xl animate-pulse duration-3000"></div>
        <div className="absolute -bottom-40 -left-40 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse duration-2000"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-30"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-900/20 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"></div>
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="22" x2="12" y2="8" />
              <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Anchor</h1>
          <p className="text-slate-500 text-lg">Drop anchor. Cut the noise.</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <AnchorCard className="p-8 md:p-10 border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-900">Welcome Back</h2>
              <p className="text-sm text-slate-500 mt-1">Ready to focus?</p>
            </div>
            
            <AuthForm mode="login" />

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 mb-3">New to Anchor?</p>
              <Link 
                href="/auth/register" 
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-50 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors group"
              >
                Create Account
                <svg className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </AnchorCard>
        </div>
        
        <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Built for students who go deep</p>
        </div>
      </div>
    </div>
  );
}
