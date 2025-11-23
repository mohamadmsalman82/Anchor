'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      <main className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 pb-20 pt-6">
        <div className="max-w-8xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};
