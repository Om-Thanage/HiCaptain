'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Check, ChevronDown, LogOut, Plus, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';
import { Organization, organizationService } from '@/services/organization';
import toast from 'react-hot-toast';

type OpenMenu = 'organization' | 'profile' | null;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const user = authService.getUserFromToken();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [savingOrganization, setSavingOrganization] = useState(false);
  const menusRef = useRef<HTMLDivElement>(null);
  const section = pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') || 'Overview';
  const activeOrganization = organizations.find(org => org.id === user?.organizationId);

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

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menusRef.current && !menusRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  async function switchOrganization(id: string) {
    setOpenMenu(null);
    if (!id || id === user?.organizationId) return;
    try {
      const session = await organizationService.switchTo(id);
      authService.setToken(session.token);
      setToken(session.token);
      window.location.href = '/dashboard';
    } catch { toast.error('Could not switch organization'); }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newOrganizationName.trim();
    if (!name) return;
    setSavingOrganization(true);
    try {
      const session = await organizationService.create(name);
      authService.setToken(session.token);
      setToken(session.token);
      window.location.href = '/dashboard';
    } catch {
      toast.error('Could not create organization');
      setSavingOrganization(false);
    }
  }

  if (!isAuthenticated) return <div className="hc-loading">Opening your workspace…</div>;

  return (
    <div className="hc-app-shell">
      <Sidebar />
      <div className="hc-app-content">
        <header className="hc-topbar">
          <div className="hc-topbar-context">
            <span>YOUR WORKSPACE</span>
            <strong>{section}</strong>
          </div>
          <div className="hc-topbar-actions" ref={menusRef}>
            <div className="hc-menu-root hc-org-root">
              <button type="button" className="hc-org-trigger" aria-label={`Organization: ${activeOrganization?.name || 'Loading'}`} aria-expanded={openMenu === 'organization'} aria-controls="hc-organization-menu" onClick={() => setOpenMenu(openMenu === 'organization' ? null : 'organization')}>
                <span className="hc-org-mark">✦</span>
                <span className="hc-org-label"><small>Organization</small><strong>{activeOrganization?.name || 'Your organization'}</strong></span>
                <ChevronDown size={15} className="hc-menu-chevron" />
              </button>
              {openMenu === 'organization' && <div id="hc-organization-menu" className="hc-dropdown hc-org-dropdown">
                <span className="hc-dropdown-caption">SWITCH ORGANIZATION</span>
                <div className="hc-organization-list">
                  {organizations.map(org => <button type="button" key={org.id} className="hc-dropdown-row" onClick={() => switchOrganization(org.id)}>
                    <span className="hc-org-mini">{org.name.charAt(0).toUpperCase()}</span>
                    <span className="hc-dropdown-row-label">{org.name}</span>
                    {org.id === user?.organizationId && <Check size={16} className="hc-selected-check" />}
                  </button>)}
                </div>
                <div className="hc-dropdown-divider" />
                {creatingOrganization ? <form className="hc-create-org-form" onSubmit={createOrganization}>
                  <label htmlFor="hc-org-name">New organization</label>
                  <input id="hc-org-name" autoFocus required maxLength={80} value={newOrganizationName} onChange={event => setNewOrganizationName(event.target.value)} placeholder="Team or company name" />
                  <div><button type="button" onClick={() => setCreatingOrganization(false)}>Cancel</button><button type="submit" disabled={savingOrganization || !newOrganizationName.trim()}>{savingOrganization ? 'Creating…' : 'Create'}</button></div>
                </form> : <button type="button" className="hc-dropdown-row hc-create-org-row" onClick={() => setCreatingOrganization(true)}><span className="hc-create-org-icon"><Plus size={17} /></span><span className="hc-dropdown-row-label">Create organization</span></button>}
              </div>}
            </div>
            <Link href="/notifications" className="hc-header-icon" aria-label="Notifications"><Bell size={18} /></Link>
            <div className="hc-menu-root hc-profile-root">
              <button type="button" className="hc-profile-trigger" aria-label="Open account menu" aria-expanded={openMenu === 'profile'} aria-controls="hc-profile-menu" onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}>
                <span className="hc-profile-avatar">{user?.name?.charAt(0).toUpperCase() || 'H'}</span><ChevronDown size={14} />
              </button>
              {openMenu === 'profile' && <div id="hc-profile-menu" className="hc-dropdown hc-profile-dropdown">
                <div className="hc-profile-summary"><strong>{user?.name || 'Account'}</strong><span>{user?.email}</span></div>
                <div className="hc-dropdown-divider" />
                <Link href="/settings" className="hc-dropdown-row" onClick={() => setOpenMenu(null)}><Settings size={17} /><span className="hc-dropdown-row-label">Settings</span></Link>
                <button type="button" className="hc-dropdown-row hc-signout-row" onClick={() => authService.logout()}><LogOut size={17} /><span className="hc-dropdown-row-label">Log out</span></button>
              </div>}
            </div>
          </div>
        </header>
        <main className="hc-app-main">{children}</main>
      </div>
    </div>
  );
}
