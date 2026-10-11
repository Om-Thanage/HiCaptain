'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { Member, organizationService } from '@/services/organization';
import { projectService } from '@/services/project';
import { Project, Role } from '@/types';
import styles from './access.module.css';

const labels: Record<Role, string> = { Admin: 'Admin', ProjectManager: 'Project manager', Developer: 'Developer', Client: 'Client' };
export default function ProjectAccessPage() {
  const id = useParams().id as string;
  const user = authService.getUserFromToken();
  const admin = user?.roles?.includes('Admin');
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState('');
  useEffect(() => {
    Promise.all([projectService.getById(id), organizationService.members(user?.organizationId || '')]).then(([project, members]) => { setProject(project); setMembers(members); }).catch(() => toast.error('Could not load project access'));
  }, [id, user?.organizationId]);
  const manager = project?.projectManagerId === user?.id && user?.roles?.includes('ProjectManager');
  const canEdit = admin || manager;
  const roles: Role[] = admin ? ['ProjectManager', 'Client', 'Developer'] : ['Developer'];
  async function update(member: Member, role: Role, enabled: boolean) {
    if (!project) return;
    setSaving(`${member.id}:${role}`);
    try { setProject(await projectService.setAccess(project.id, member.id, role, enabled)); toast.success('Project access updated'); }
    catch (cause: any) { toast.error(cause.response?.data?.detail || 'Could not update access'); }
    finally { setSaving(''); }
  }
  function hasAccess(member: Member, role: Role) {
    if (role === 'Developer') return project?.developerIds?.includes(member.id) || false;
    if (role === 'Client') return project?.clientId === member.id;
    return project?.projectManagerId === member.id;
  }
  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><span>PROJECT ACCESS</span><h1>{project?.name || 'Project'} team</h1><p>Choose who can work on this project. Organization admins can manage every role; this project&apos;s manager can manage developers.</p></div>
    <div className={styles.layout}><section className={styles.card}><div className={styles.cardHeading}><h2>Team access</h2><span>{members.length} organization members</span></div>
      {!project ? <p className={styles.empty}>Loading project…</p> : members.length ? members.map(member => <div key={member.id} className={styles.member}><div className={styles.identity}><span className={styles.avatar}>{member.name?.charAt(0).toUpperCase() || '?'}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div><div className={styles.roleList}>{roles.filter(role => member.roles.includes(role)).map(role => <label key={role} className={styles.role}><input type="checkbox" checked={hasAccess(member, role)} disabled={!canEdit || !!saving} onChange={event => update(member, role, event.target.checked)} />{labels[role]}</label>)}{!member.roles.some(role => roles.includes(role)) && <small>No eligible project role</small>}</div></div>) : <p className={styles.empty}>No organization members found.</p>}
    </section><aside className={styles.side}>{canEdit && <div className={styles.invite}><Mail size={23} /><h2>Bring someone in</h2><p>Invite by email and select the projects they should access.</p><Link href={`/users?projectId=${encodeURIComponent(id)}`}>Invite teammate</Link></div>}<div className={styles.tip}><ShieldCheck size={18} /><p>Assigning a new project manager or client replaces the current one. Removing a developer also removes their access to this project.</p></div></aside></div>
  </div></DashboardLayout>;
}
