'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight, FolderKanban } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const user = authService.getUserFromToken();
  const section = pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') || 'Overview';

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      router.push('/auth?mode=login');
      return;
    }
    setToken(token);
  }, [setToken, router]);

  if (!isAuthenticated) {
    return <div className="hc-loading">Opening your workspace…</div>;
  }

  return (
    <div className="hc-app-shell">
      <Sidebar />
      <div className="hc-app-content">
        <header className="hc-topbar">
          <div className="hc-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div>
          <div className="hc-topbar-actions">
            <Link href="/projects" className="hc-topbar-search"><FolderKanban size={16} /> Projects</Link>
            <Link href="/notifications" className="hc-topbar-icon" aria-label="Notifications"><Bell size={18} /></Link>
            <div className="hc-avatar" title={user?.name || 'Account'}>{user?.name?.charAt(0).toUpperCase() || 'H'}</div>
          </div>
        </header>
        <main className="hc-app-main">{children}</main>
      </div>
    </div>
  );
}
