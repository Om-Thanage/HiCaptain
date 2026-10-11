'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, FolderKanban, BarChart3, FileText, MessageCircle,
  Calendar, GitBranch, Bell, Users, HardDrive,
} from 'lucide-react';
import { authService } from '@/services/auth';

const navigation = {
  Admin: [
    ['Users', '/users', Users], ['Projects', '/projects', FolderKanban],
    ['Analytics', '/analytics', BarChart3], ['Invoices', '/invoices', FileText],
    ['Feedback', '/feedback', MessageCircle], ['Schedule', '/schedule', Calendar], ['Storage', '/storage', HardDrive],
    ['Git', '/git', GitBranch], ['Notifications', '/notifications', Bell],
  ],
  ProjectManager: [
    ['Projects', '/projects', FolderKanban], ['Analytics', '/analytics', BarChart3],
    ['Schedule', '/schedule', Calendar], ['Storage', '/storage', HardDrive], ['Feedback', '/feedback', MessageCircle],
    ['Invoices', '/invoices', FileText], ['Git', '/git', GitBranch],
    ['Notifications', '/notifications', Bell],
  ],
  Developer: [
    ['Projects', '/projects', FolderKanban], ['Schedule', '/schedule', Calendar], ['Storage', '/storage', HardDrive],
    ['Git', '/git', GitBranch], ['Notifications', '/notifications', Bell],
  ],
  Client: [
    ['Projects', '/projects', FolderKanban], ['Invoices', '/invoices', FileText],
    ['Feedback', '/feedback', MessageCircle], ['Schedule', '/schedule', Calendar], ['Storage', '/storage', HardDrive],
    ['Notifications', '/notifications', Bell],
  ],
} as const;

export default function Sidebar() {
  const pathname = usePathname();
  const user = authService.getUserFromToken();
  const roles = (user?.roles || [user?.role]).filter(Boolean) as Array<keyof typeof navigation>;
  const links = roles.flatMap(role => navigation[role] || []);
  const items = [['Overview', '/dashboard', Home], ...links.filter((item, index) => links.findIndex(other => other[1] === item[1]) === index)] as Array<[
    string, string, typeof Home
  ]>;

  return (
    <aside className="hc-sidebar">
      <Link href="/dashboard" className="hc-brand" aria-label="HiCaptain dashboard">
        <span className="hc-brand-mark">✦</span>
        <span>HiCaptain<span className="hc-brand-dot">.</span></span>
      </Link>

      <div className="hc-sidebar-caption">WORKSPACE</div>
      <nav className="hc-sidebar-nav" aria-label="Main navigation">
        {items.map(([name, href, Icon]) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`hc-nav-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hc-sidebar-bottom">
        <div className="hc-help-card">
          <span className="hc-help-icon">✳</span>
          <strong>Make work flow.</strong>
          <span>Keep your team and projects moving together.</span>
        </div>
      </div>
    </aside>
  );
}
