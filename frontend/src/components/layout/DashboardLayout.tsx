'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, setToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      router.push('/auth?mode=login');
      return;
    }

    setToken(token);
  }, [setToken, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-900">
      <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-3xl z-0" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" />
      <Sidebar />
      <main className="flex-1 relative z-10">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}