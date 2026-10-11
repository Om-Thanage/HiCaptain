'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { Member, organizationService } from '@/services/organization';
import { Role } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

const roles: Role[] = ['Admin', 'ProjectManager', 'Developer', 'Client'];

export default function UsersPage() {
  const user = authService.getUserFromToken();
  const orgId = user?.organizationId;
  const isAdmin = user?.roles?.includes('Admin');
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRoles, setInviteRoles] = useState<Role[]>(['Developer']);
  const [draftRoles, setDraftRoles] = useState<Record<string, Role[]>>({});
  const [busy, setBusy] = useState(false);
  const setToken = useAuthStore(state => state.setToken);

  async function refresh() {
    if (!orgId) return;
    try { setMembers(await organizationService.members(orgId)); setDraftRoles({}); }
    catch { toast.error('Could not load members'); }
  }
  useEffect(() => { refresh(); }, [orgId]);

  function toggle(role: Role, selected: Role[], update: (next: Role[]) => void) {
    update(selected.includes(role) ? selected.filter(item => item !== role) : [...selected, role]);
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId || !inviteRoles.length) return;
    setBusy(true);
    try {
      const result = await organizationService.invite(orgId, email, inviteRoles);
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

  return <DashboardLayout><div className="space-y-8 max-w-5xl">
    <div><span className="hc-eyebrow">YOUR TEAM</span><h1 className="text-3xl font-bold text-white mt-2">Members & invitations</h1><p className="text-slate-400 mt-1">Invite teammates by email and give each person the roles they need.</p></div>
    {isAdmin && <form onSubmit={invite} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Invite a teammate</h2>
      <input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teammate@example.com" className="w-full rounded-lg border border-white/15 bg-white/5 p-3 text-white" />
      <div className="flex flex-wrap gap-3">{roles.map(role => <label key={role} className="text-slate-200 flex items-center gap-2"><input type="checkbox" checked={inviteRoles.includes(role)} onChange={() => toggle(role, inviteRoles, setInviteRoles)} />{role}</label>)}</div>
      <button disabled={busy || !inviteRoles.length} className="hc-pill-button">{busy ? 'Sending…' : 'Send invitation'}</button>
    </form>}
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6"><h2 className="text-xl font-semibold text-white mb-5">Organization members</h2>
      <div className="space-y-3">{members.map(member => <div key={member.id} className="rounded-xl border border-white/10 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div><strong className="text-white">{member.name}</strong><p className="text-slate-400 text-sm">{member.email}</p></div>
        <div className="flex flex-wrap gap-3 items-center">{roles.map(role => <label key={role} className="text-slate-300 text-sm flex gap-1 items-center"><input type="checkbox" disabled={!isAdmin} checked={(draftRoles[member.id] || member.roles).includes(role)} onChange={() => {
          const selected = draftRoles[member.id] || member.roles;
          setDraftRoles(current => ({ ...current, [member.id]: selected.includes(role) ? selected.filter(item => item !== role) : [...selected, role] }));
        }} />{role}</label>)}
          {isAdmin && draftRoles[member.id] && <button disabled={!draftRoles[member.id].length} className="text-blue-300 text-sm underline" onClick={() => changeRoles(member, draftRoles[member.id])}>Save roles</button>}
          {isAdmin && user?.id !== member.id && <button className="text-red-300 text-sm underline" onClick={() => remove(member)}>Remove</button>}
        </div>
      </div>)}</div>
    </div>
  </div></DashboardLayout>;
}
