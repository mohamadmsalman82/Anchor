'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!firstName.trim()) {
          setError('First name is required');
          setLoading(false);
          return;
        }
        if (!lastName.trim()) {
          setError('Last name is required');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        await register(email, password, firstName.trim(), lastName.trim());
      } else {
        await login(email, password);
      }
      // Wait a moment for cookie to be set, then navigate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if user has seen introduction
      const hasSeenIntroduction = localStorage.getItem('hasSeenIntroduction');
      if (hasSeenIntroduction === 'true') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/introduction';
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please check your connection and try again.');
      setLoading(false);
    }
  };

  // Futuristic input style with glow, adapted for dark ocean environment
  const inputClasses = `
    w-full px-5 py-4 
    bg-transparent backdrop-blur-sm 
    border border-slate-700/70 
    rounded-2xl 
    focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 
    outline-none 
    transition-all duration-300 
    text-slate-50 placeholder:text-slate-400 
    shadow-sm
  `;
  const labelClasses = "block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50/80 backdrop-blur border border-rose-200 rounded-2xl text-sm text-rose-600 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={inputClasses}
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClasses}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className={inputClasses}
              placeholder="Doe"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className={labelClasses}>
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClasses}
          placeholder="you@university.edu"
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === 'register' ? 8 : undefined}
          className={inputClasses}
          placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
        />
      </div>

      {mode === 'register' && (
        <div>
          <label htmlFor="confirmPassword" className={labelClasses}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={inputClasses}
            placeholder="Confirm password"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`
          w-full px-6 py-4 
          bg-gradient-to-r from-slate-900 to-slate-800 
          text-white font-bold tracking-wide rounded-2xl 
          hover:shadow-lg hover:shadow-slate-900/20 hover:scale-[1.02] 
          active:scale-[0.98] 
          transition-all duration-300 
          disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
          flex items-center justify-center gap-2
        `}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          <>
            {mode === 'login' ? 'Log In' : 'Create Account'}
            <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
