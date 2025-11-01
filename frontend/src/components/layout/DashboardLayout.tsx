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
  const { user, isAuthenticated, setUser, setToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const token = authService.getToken();
    const savedUser = authService.getUser();

    if (!token || !savedUser) {
      router.push('/login');
      return;
    }

    setToken(token);
    setUser(savedUser);
  }, [setUser, setToken, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}