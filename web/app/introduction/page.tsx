'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function IntroductionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleContinue = () => {
    // Mark introduction as seen
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenIntroduction', 'true');
    }
    router.push('/dashboard');
  };

  const firstName = user?.firstName || 'there';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to Anchor, {firstName}!
          </h1>
          <p className="text-lg text-slate-600">
            Let's get you started with focus tracking
          </p>
        </div>

        <div className="space-y-8 mb-12">
          {/* Step 1 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                1
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Install the Chrome Extension
              </h3>
              <p className="text-slate-600 mb-4">
                Download and install the Anchor Chrome extension to automatically track your focus sessions. The extension monitors your browsing activity and helps you stay anchored.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700">
                  <strong>Tip:</strong> You can find the extension link in your Settings page after you continue.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                2
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Start a Focus Session
              </h3>
              <p className="text-slate-600 mb-4">
                Click the extension icon and start a new session. Anchor will track your time spent on productive vs unproductive websites, idle time, and tab switches.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700">
                  <strong>How it works:</strong> The extension periodically checks if you're on a productive domain. Stay focused to maintain your "anchored" status!
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                3
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                View Your Dashboard
              </h3>
              <p className="text-slate-600 mb-4">
                After your sessions, check your dashboard to see detailed analytics: daily focus trends, domain breakdowns, focus composition, and more. Track your progress over time!
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700">
                  <strong>Metrics you'll see:</strong> Anchored time, focus rate, idle time, tab switches, and time spent by domain.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                4
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Stay Consistent
              </h3>
              <p className="text-slate-600 mb-4">
                Build better focus habits by tracking your sessions regularly. Set goals, review your progress, and celebrate your wins. The more you use Anchor, the better insights you'll get!
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700">
                  <strong>Pro tip:</strong> Review your dashboard weekly to identify patterns and improve your focus habits.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-slate-900 text-white rounded-lg font-semibold text-lg hover:bg-slate-800 transition-colors duration-200 shadow-lg"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

