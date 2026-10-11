'use client';

import { useEffect, useState } from 'react';
import { Mail, Plus, ShieldCheck, UsersRound, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { Member, organizationService } from '@/services/organization';
import { Role } from '@/types';
import { Project } from '@/types';
import { projectService } from '@/services/project';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import styles from './users.module.css';

const roles: Role[] = ['Admin', 'ProjectManager', 'Developer', 'Client'];
const roleLabel: Record<Role, string> = { Admin: 'Admin', ProjectManager: 'Project manager', Developer: 'Developer', Client: 'Client' };

export default function UsersPage() {
  const user = authService.getUserFromToken();
  const orgId = user?.organizationId;
  const isAdmin = user?.roles?.includes('Admin');
  const isManager = user?.roles?.includes('ProjectManager');
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projectRole, setProjectRole] = useState<Role>('Developer');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteRoles, setInviteRoles] = useState<Role[]>(['Developer']);
  const [draftRoles, setDraftRoles] = useState<Record<string, Role[]>>({});
  const [busy, setBusy] = useState(false);
  const setToken = useAuthStore(state => state.setToken);

  async function refresh() {
    if (!orgId) { setLoading(false); return; }
    try { setMembers(await organizationService.members(orgId)); setDraftRoles({}); }
    catch { toast.error('Could not load members'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [orgId]);
  useEffect(() => { if (isAdmin || isManager) projectService.getAll().then(setProjects).catch(() => {}); }, [orgId]);
  const assignableProjects = isAdmin ? projects : projects.filter(project => project.projectManagerId === user?.id);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('projectId');
    if (requested && assignableProjects.some(project => project.id === requested)) setProjectIds([requested]);
  }, [projects]);
  const availableProjectRoles = roles.filter(role => role !== 'Admin' && inviteRoles.includes(role) && (isAdmin || role === 'Developer'));
  const selectedProjectRole = availableProjectRoles.includes(projectRole) ? projectRole : availableProjectRoles[0];

  function toggle(role: Role, selected: Role[], update: (next: Role[]) => void) {
    update(selected.includes(role) ? selected.filter(item => item !== role) : [...selected, role]);
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId || !inviteRoles.length || (!isAdmin && !projectIds.length) || (projectIds.length && !selectedProjectRole)) return;
    setBusy(true);
    try {
      const result = await organizationService.invite(orgId, email.trim(), inviteRoles, projectIds, projectIds.length ? selectedProjectRole : undefined);
      toast.success(result.added ? 'Existing account added to your organization' : 'Invitation email sent');
      setEmail('');
      await refresh();
    } catch (cause: any) { toast.error(cause.response?.data?.detail || 'Could not send invitation'); }
    finally { setBusy(false); }
  }

  async function changeRoles(member: Member, next: Role[]) {
    if (!orgId || !next.length) return;
    try {
      await organizationService.setRoles(orgId, member.id, next);
      await refresh();
      if (member.id === user?.id) {
        const session = await organizationService.switchTo(orgId);
        authService.setToken(session.token);
        setToken(session.token);
        window.location.reload();
      }
      toast.success('Roles updated');
    }
    catch (cause: any) { toast.error(cause.response?.data?.detail || 'Could not update roles'); }
  }

  async function remove(member: Member) {
    if (!orgId || !confirm(`Remove ${member.name} from this organization?`)) return;
    try { await organizationService.remove(orgId, member.id); await refresh(); toast.success('Member removed'); }
    catch (cause: any) { toast.error(cause.response?.data?.detail || 'Could not remove member'); }
  }

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}>
      <div><span className={styles.kicker}>PEOPLE & PERMISSIONS</span><h1>Your team, all in one place.</h1><p>Invite teammates and choose what they can do in this organization.</p></div>
      <div className={styles.count}><span className={styles.countIcon}><UsersRound size={20} /></span><span><strong>{members.length}</strong><small>{members.length === 1 ? 'team member' : 'team members'}</small></span></div>
    </div>

    <div className={styles.grid}>
      <section className={styles.membersCard} aria-labelledby="members-title">
        <div className={styles.cardHeading}><div><span className={styles.sectionKicker}>THE PEOPLE</span><h2 id="members-title">Organization members</h2></div><span className={styles.memberCount}>{members.length} members</span></div>
        {loading ? <p className={styles.empty}>Loading your team…</p> : members.length === 0 ? <p className={styles.empty}>No members yet. Invite someone to get started.</p> : <div className={styles.memberList}>{members.map((member, index) => {
          const selected = draftRoles[member.id] || member.roles;
          const changed = draftRoles[member.id] && (selected.length !== member.roles.length || selected.some(role => !member.roles.includes(role)));
          return <div className={styles.member} key={member.id}>
            <div className={styles.identity}><span className={`${styles.avatar} ${styles[`avatar${index % 3}`]}`}>{member.name?.charAt(0).toUpperCase() || '?'}</span><div><strong>{member.name} {member.id === user?.id && <span className={styles.you}>You</span>}</strong><span>{member.email}</span></div></div>
            <div className={styles.memberControls}>
              <div className={styles.roleList} aria-label={`Roles for ${member.name}`}>{roles.map(role => isAdmin ? <label key={role} className={`${styles.role} ${selected.includes(role) ? styles.selectedRole : ''}`}><input type="checkbox" checked={selected.includes(role)} onChange={() => toggle(role, selected, next => setDraftRoles(current => ({ ...current, [member.id]: next })))} />{roleLabel[role]}</label> : member.roles.includes(role) ? <span key={role} className={`${styles.role} ${styles.selectedRole}`}>{roleLabel[role]}</span> : null)}</div>
              {isAdmin && <div className={styles.memberActions}>{changed && <button type="button" className={styles.saveButton} disabled={!selected.length} onClick={() => changeRoles(member, selected)}>Save roles</button>}{member.id !== user?.id && <button type="button" className={styles.removeButton} onClick={() => remove(member)} aria-label={`Remove ${member.name}`}><X size={15} /> Remove</button>}</div>}
            </div>
          </div>;
        })}</div>}
      </section>

      <aside className={styles.side}>
        {(isAdmin || isManager) ? <form onSubmit={invite} className={styles.inviteCard}>
          <span className={styles.inviteIcon}><Mail size={22} /></span><span className={styles.sectionKicker}>GROW YOUR TEAM</span><h2>Invite a teammate</h2><p>Send an email invitation, then choose the roles they&apos;ll have when they join.</p>
          <label className={styles.fieldLabel} htmlFor="invite-email">Email address</label><input id="invite-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teammate@example.com" className={styles.emailInput} />
          <span className={styles.fieldLabel}>Assign roles</span><div className={styles.inviteRoles}>{roles.filter(role => isAdmin || role === 'Developer').map(role => <label key={role} className={`${styles.role} ${inviteRoles.includes(role) ? styles.selectedRole : ''}`}><input type="checkbox" checked={inviteRoles.includes(role)} onChange={() => toggle(role, inviteRoles, setInviteRoles)} />{roleLabel[role]}</label>)}</div>
          <span className={styles.fieldLabel}>Project access {isManager && !isAdmin && '(choose at least one)'}</span><div className={styles.projectChoices}>{assignableProjects.map(project => <label key={project.id}><input type="checkbox" checked={projectIds.includes(project.id)} onChange={() => setProjectIds(current => current.includes(project.id) ? current.filter(id => id !== project.id) : [...current, project.id])} />{project.name}</label>)}{!assignableProjects.length && <p>No projects available for invitations.</p>}</div>
          {projectIds.length > 0 && isAdmin && <label className={styles.fieldLabel}>Access as<select className={styles.projectRole} value={selectedProjectRole || ''} onChange={event => setProjectRole(event.target.value as Role)}><option value="" disabled>Choose a role</option>{availableProjectRoles.map(role => <option key={role} value={role}>{roleLabel[role]}</option>)}</select></label>}
          <button type="submit" disabled={busy || !inviteRoles.length || (!isAdmin && !projectIds.length) || (projectIds.length > 0 && !selectedProjectRole)} className={styles.inviteButton}><Plus size={17} />{busy ? 'Sending…' : 'Send invitation'}</button>
        </form> : <div className={styles.inviteCard}><span className={styles.inviteIcon}><UsersRound size={22} /></span><h2>Work better together</h2><p>Ask an organization admin to invite more people or update team roles.</p></div>}
        <div className={styles.tip}><ShieldCheck size={19} /><p>People can belong to more than one organization and hold multiple roles in each.</p></div>
      </aside>
    </div>
  </div></DashboardLayout>;
}
