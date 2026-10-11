'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight, FolderKanban } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';
import { Organization, organizationService } from '@/services/organization';
import toast from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const user = authService.getUserFromToken();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const section = pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') || 'Overview';

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      router.push('/auth?mode=login');
      return;
    }
    setToken(token);
    organizationService.list().then(setOrganizations).catch(() => {});
    const activeOrgId = authService.getUserFromToken()?.organizationId;
    if (activeOrgId) organizationService.switchTo(activeOrgId).then(session => {
      authService.setToken(session.token);
      setToken(session.token);
    }).catch(() => {});
  }, [setToken, router]);

  async function switchOrganization(id: string) {
    if (!id || id === user?.organizationId) return;
    try {
      const session = await organizationService.switchTo(id);
      authService.setToken(session.token);
      setToken(session.token);
      window.location.href = '/dashboard';
    } catch { toast.error('Could not switch organization'); }
  }

  async function createOrganization() {
    const name = window.prompt('New organization name');
    if (!name?.trim()) return;
    try {
      const session = await organizationService.create(name.trim());
      authService.setToken(session.token);
      setToken(session.token);
      window.location.href = '/dashboard';
    } catch { toast.error('Could not create organization'); }
  }

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
            <select aria-label="Organization" value={user?.organizationId || ''} onChange={event => switchOrganization(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
              {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <button type="button" onClick={createOrganization} className="text-sm font-medium" title="Create organization">+ Organization</button>
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
