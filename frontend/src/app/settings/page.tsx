'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bell, HardDrive, Github, LogOut, ShieldCheck, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { Organization, organizationService } from '@/services/organization';
import api from '@/lib/api';
import type { User } from '@/types';
import { useAuthStore } from '@/store/auth';
import styles from './settings.module.css';

type Connection = { connected: boolean; detail?: string } | null;

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [github, setGithub] = useState<Connection>(null);
  const [calendar, setCalendar] = useState<Connection>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const setToken = useAuthStore(state => state.setToken);

  useEffect(() => {
    const googleResult = new URLSearchParams(window.location.search).get('google');
    if (googleResult === 'connected') toast.success('Google Workspace connected');
    if (googleResult === 'error') toast.error('Google Workspace connection failed');
    const currentUser = authService.getUserFromToken();
    setUser(currentUser);
    setDisplayName(currentUser?.name || '');
    organizationService.list().then(items => setOrganization(items.find(item => item.id === currentUser?.organizationId) || null)).catch(() => {});
    if (!currentUser) return;
    if (currentUser.roles?.some(role => role === 'Admin' || role === 'ProjectManager' || role === 'Developer')) {
      api.get('/api/auth/github/status').then(response => setGithub({ connected: !!response.data.connected, detail: response.data.githubUsername })).catch(() => setGithub(null));
    }
    api.get('/api/google-calendar/auth/status', { params: { userId: currentUser.id } }).then(response => setCalendar({ connected: !!response.data })).catch(() => setCalendar(null));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || name === user?.name) return;
    setBusy('profile');
    try {
      const session = await authService.updateProfile(name);
      authService.setToken(session.token);
      setToken(session.token);
      setUser(authService.getUserFromToken());
      toast.success('Display name updated');
    } catch { toast.error('Could not update your display name'); }
    finally { setBusy(null); }
  }

  async function connectGithub() {
    setBusy('github');
    try {
      const response = await api.post('/api/auth/github/connect');
      if (!response.data.authUrl) throw new Error('No authorization URL returned');
      window.location.assign(response.data.authUrl);
    } catch { toast.error('GitHub connection is unavailable. Check OAuth configuration.'); setBusy(null); }
  }
  async function disconnectGithub() {
    setBusy('github');
    try { await api.post('/api/auth/github/disconnect'); setGithub({ connected: false }); toast.success('GitHub disconnected'); }
    catch { toast.error('Could not disconnect GitHub'); }
    finally { setBusy(null); }
  }
  async function connectCalendar() {
    if (!user) return;
    setBusy('calendar');
    try {
      const response = await api.get('/api/google-calendar/auth/url', { params: { userId: user.id }, responseType: 'text' });
      if (!String(response.data).startsWith('https://')) throw new Error('No authorization URL returned');
      window.location.assign(response.data);
    } catch { toast.error('Google Workspace connection is unavailable. Check OAuth configuration.'); setBusy(null); }
  }
  async function disconnectCalendar() {
    if (!user) return;
    setBusy('calendar');
    try { await api.post('/api/google-calendar/auth/revoke', null, { params: { userId: user.id } }); setCalendar({ connected: false }); toast.success('Google Workspace disconnected'); }
    catch { toast.error('Could not disconnect Google Workspace'); }
    finally { setBusy(null); }
  }

  const canUseGithub = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager' || role === 'Developer');
  const roleNames = user?.roles?.map(role => role === 'ProjectManager' ? 'Project manager' : role).join(' · ') || 'Member';

  return <DashboardLayout><div className={styles.page}>
    <section className={styles.hero}><div><span className={styles.kicker}>YOUR SPACE</span><h1>Make this workspace yours.</h1><p>Edit your profile, check connected tools, and find the right place to manage your team.</p></div><div className={styles.heroArt} aria-hidden="true"><span>✦</span><span>◉</span><span>✳</span></div></section>
    <div className={styles.grid}>
      <section className={styles.card}><div className={styles.cardHeading}><span className={`${styles.icon} ${styles.purple}`}><UsersRound size={21} /></span><div><span className={styles.kicker}>ACCOUNT</span><h2>Your profile</h2></div></div>
        <div className={styles.identity}><span className={styles.avatar}>{user?.name?.charAt(0).toUpperCase() || '?'}</span><div><strong>{user?.name || 'Your account'}</strong><span>{user?.email || 'Loading account…'}</span></div></div>
        <form className={styles.profileForm} onSubmit={saveProfile}><label htmlFor="display-name">Display name</label><div><input id="display-name" required maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your display name" /><button type="submit" disabled={busy === 'profile' || !displayName.trim() || displayName.trim() === user?.name}>{busy === 'profile' ? 'Saving…' : 'Save name'}</button></div><p>Your initial name is based on your email. You can change it here anytime.</p></form>
        <div className={styles.info}><span>Workspace</span><strong>{organization?.name || 'Your organization'}</strong></div><div className={styles.info}><span>Your roles</span><strong>{roleNames}</strong></div>
        <p className={styles.note}>Your organization admin manages roles and access for this workspace.</p>
        {user?.roles?.includes('Admin') && <Link className={styles.textLink} href="/users">Manage team access <ArrowUpRight size={16} /></Link>}
      </section>
      <section className={styles.card}><div className={styles.cardHeading}><span className={`${styles.icon} ${styles.yellow}`}><Bell size={21} /></span><div><span className={styles.kicker}>STAY IN THE LOOP</span><h2>Notifications</h2></div></div><p className={styles.copy}>See recent project and task updates in your notification center.</p><Link className={styles.pill} href="/notifications">Open notifications <ArrowUpRight size={16} /></Link><div className={styles.callout}><ShieldCheck size={19} /><span>Account access and active roles follow the organization selected in the header.</span></div></section>
    </div>
    <section className={styles.connections}><div className={styles.sectionHeading}><div><span className={styles.kicker}>WORKS WITH YOUR TOOLS</span><h2>Connected apps</h2><p>Connect services to bring your work into HiCaptain.</p></div></div>
      <div className={styles.connectionGrid}>{canUseGithub && <div className={styles.connection}><span className={`${styles.icon} ${styles.dark}`}><Github size={23} /></span><div className={styles.connectionText}><h3>GitHub</h3><p>{github === null ? 'Connection status unavailable' : github.connected ? `Connected as ${github.detail || 'your account'}` : 'Connect to grant repository and webhook access. Signing in only asks for your identity.'}</p></div><button type="button" disabled={!!busy || github === null} onClick={github?.connected ? disconnectGithub : connectGithub}>{busy === 'github' ? 'Working…' : github?.connected ? 'Disconnect' : 'Connect'}</button></div>}
        <div className={styles.connection}><span className={`${styles.icon} ${styles.lime}`}><HardDrive size={22} /></span><div className={styles.connectionText}><h3>Google Workspace</h3><p>{calendar === null ? 'Connection status unavailable' : calendar.connected ? 'Calendar, Meet, Drive, and Tasks connected' : 'Connect to grant Calendar, Drive, and Tasks access. Google sign-in only asks for your identity.'}</p></div><button type="button" disabled={!!busy || calendar === null} onClick={calendar?.connected ? disconnectCalendar : connectCalendar}>{busy === 'calendar' ? 'Working…' : calendar?.connected ? 'Disconnect' : 'Connect'}</button></div>
      </div>
      {user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager') && <Link href="/storage" className={styles.textLink}>Choose project folders in My Drive <ArrowUpRight size={15} /></Link>}
    </section>
    <section className={styles.session}><div><span className={styles.kicker}>SECURITY</span><h2>Account session</h2><p>Sign out of HiCaptain on this device.</p></div><button type="button" onClick={() => authService.logout()}><LogOut size={17} /> Log out</button></section>
  </div></DashboardLayout>;
}
