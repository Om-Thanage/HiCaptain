'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpRight, Bell, CalendarDays, Cloud, GitBranch, Layers3,
  LayoutDashboard, MessagesSquare, Plus, UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { authService } from '@/services/auth';
import { Role } from '@/types';

type Destination = { label: string; href: string; icon: LucideIcon; roles?: Role[] };
const sections: Array<{ title: string; items: Destination[] }> = [
  { title: 'WORKSPACE', items: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: Layers3 },
    { label: 'Team members', href: '/users', icon: UsersRound, roles: ['Admin'] },
  ] },
  { title: 'COLLABORATE', items: [
    { label: 'Schedule', href: '/schedule', icon: CalendarDays },
    { label: 'Project files', href: '/storage', icon: Cloud },
    { label: 'Feedback', href: '/feedback', icon: MessagesSquare, roles: ['Admin', 'ProjectManager', 'Client'] },
    { label: 'Git activity', href: '/git', icon: GitBranch, roles: ['Admin', 'ProjectManager', 'Developer'] },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = authService.getUserFromToken();
  const roles = new Set(user?.roles || (user?.role ? [user.role] : []));
  const canCreateProject = roles.has('Admin') || roles.has('ProjectManager');

  return <aside className="hc-sidebar">
    <Link href="/dashboard" className="hc-brand" aria-label="HiCaptain dashboard">
      <span className="hc-brand-mark">✦</span>
      <span>HiCaptain<span className="hc-brand-dot">.</span></span>
    </Link>
    <nav className="hc-sidebar-nav" aria-label="Main navigation">
      {sections.map(section => <div className="hc-nav-group" key={section.title}>
        <span className="hc-sidebar-caption">{section.title}</span>
        {section.items.filter(item => !item.roles || item.roles.some(role => roles.has(role))).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return <Link key={href} href={href} title={label} aria-label={label} aria-current={active ? 'page' : undefined} className={`hc-nav-link ${active ? 'is-active' : ''}`}>
            <span className="hc-nav-icon"><Icon size={18} strokeWidth={active ? 2.3 : 1.9} /></span>
            <span className="hc-nav-label">{label}</span>
            {active && <span className="hc-nav-active-mark" aria-hidden="true" />}
          </Link>;
        })}
      </div>)}
    </nav>
    <div className="hc-sidebar-bottom"><div className="hc-help-card">
      <span className="hc-help-spark" aria-hidden="true">✳</span>
      <span className="hc-help-eyebrow">YOUR NEXT MOVE</span>
      <strong>Make good work happen.</strong>
      <p>Bring your team, tasks, and files together.</p>
      <Link href={canCreateProject ? '/projects/new' : '/projects'}>{canCreateProject ? <><Plus size={15} /> New project</> : <>Open projects <ArrowUpRight size={15} /></>}</Link>
    </div></div>
  </aside>;
}
