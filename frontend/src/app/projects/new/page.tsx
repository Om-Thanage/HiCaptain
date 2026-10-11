'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { userService } from '@/services/user';
import { authService } from '@/services/auth';
import { Project, User } from '@/types';
import { CalendarDays, Check, Layers3, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './new.module.css';

const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const initialDates = () => { const today = new Date(); const tentative = new Date(today); tentative.setDate(tentative.getDate() + 30); return { startDate: localDate(today), endDate: localDate(tentative) }; };
type Form = { name: string; description: string; startDate: string; endDate: string; clientId: string; projectManagerId: string; developerIds: string[] };

export default function NewProjectPage() {
  const router = useRouter();
  const currentUser = authService.getUserFromToken();
  const admin = currentUser?.roles?.includes('Admin');
  const canCreate = admin || currentUser?.roles?.includes('ProjectManager');
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<Form>(() => ({ name: '', description: '', ...initialDates(), clientId: '', projectManagerId: '', developerIds: [] }));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { userService.getAll().then(setUsers).catch(() => toast.error('Could not load team members')); }, []);
  const clients = users.filter(user => user.roles?.includes('Client'));
  const managers = users.filter(user => user.roles?.includes('ProjectManager'));
  const developers = users.filter(user => user.roles?.includes('Developer'));

  function toggleDeveloper(id: string) { setForm(current => ({ ...current, developerIds: current.developerIds.includes(id) ? current.developerIds.filter(value => value !== id) : [...current.developerIds, id] })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const issues: Record<string, string> = {};
    if (!form.name.trim()) issues.name = 'Enter a project name';
    if (!form.startDate) issues.startDate = 'Choose a start date';
    if (!form.endDate || form.endDate <= form.startDate) issues.endDate = 'Choose an end date after the start date';
    setErrors(issues);
    if (Object.keys(issues).length) return;
    setBusy(true);
    try {
      const data: Omit<Project, 'id'> = { name: form.name.trim(), description: form.description.trim(), startDate: form.startDate, endDate: form.endDate, status: 'pending', clientId: admin ? form.clientId : '', projectManagerId: admin ? form.projectManagerId : currentUser?.id, developerIds: form.developerIds, taskIds: [], feedbackIds: [], meetingIds: [], timeLogIds: [] };
      const project = await projectService.create(data);
      toast.success('Project created');
      router.push(`/projects/${project.id}`);
    } catch (cause: any) { toast.error(cause.response?.data?.detail || 'Could not create project'); }
    finally { setBusy(false); }
  }

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><span className={styles.kicker}>A FRESH START</span><h1>Create a new project.</h1><p>Set the plan now. You can refine the team and timeline later.</p></div>
    {!canCreate ? <div className={styles.card}>Only organization admins and project managers can create projects.</div> : <form onSubmit={submit} className={styles.layout}>
      <div className={styles.main}>
        <section className={styles.card}><div className={styles.sectionHeading}><span className={styles.icon}><Layers3 size={20} /></span><div><span className={styles.kicker}>THE BASICS</span><h2>Project details</h2></div></div>
          <label className={styles.field}>Project name <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Website redesign" maxLength={120} required />{errors.name && <small role="alert">{errors.name}</small>}</label>
          <label className={styles.field}>Description <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="What will this project deliver?" rows={4} /></label>
        </section>
        <section className={styles.card}><div className={styles.sectionHeading}><span className={`${styles.icon} ${styles.yellow}`}><CalendarDays size={20} /></span><div><span className={styles.kicker}>MAKE A PLAN</span><h2>Timeline</h2></div></div><p className={styles.help}>Starts today, with a tentative end date 30 days later. Change either date as needed.</p>
          <div className={styles.dates}><label className={styles.field}>Start date<input type="date" required value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} />{errors.startDate && <small role="alert">{errors.startDate}</small>}</label><label className={styles.field}>Tentative end date<input type="date" required min={form.startDate} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })} />{errors.endDate && <small role="alert">{errors.endDate}</small>}</label></div>
        </section>
        <section className={styles.card}><div className={styles.sectionHeading}><span className={`${styles.icon} ${styles.lime}`}><UsersRound size={20} /></span><div><span className={styles.kicker}>WORK TOGETHER</span><h2>Project team</h2></div></div>
          {admin && <div className={styles.dates}><label className={styles.field}>Project manager<select value={form.projectManagerId} onChange={event => setForm({ ...form, projectManagerId: event.target.value })}><option value="">Assign later</option>{managers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className={styles.field}>Client<select value={form.clientId} onChange={event => setForm({ ...form, clientId: event.target.value })}><option value="">Assign later</option>{clients.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label></div>}
          {!admin && <p className={styles.help}>You will be the project manager. An admin can assign a client later.</p>}
          <span className={styles.fieldTitle}>Developers <small>({form.developerIds.length} selected)</small></span>
          {developers.length ? <div className={styles.developers}>{developers.map(user => <label key={user.id} className={styles.developer}><input type="checkbox" checked={form.developerIds.includes(user.id)} onChange={() => toggleDeveloper(user.id)} /><span className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</span><span className={styles.devName}>{user.name}<small>{user.email}</small></span><span className={styles.check}><Check size={15} /></span></label>)}</div> : <p className={styles.help}>No developers in this organization yet. Invite one from the team page.</p>}
        </section>
      </div>
      <aside className={styles.side}><div className={styles.note}><span className={styles.kicker}>READY WHEN YOU ARE</span><h2>A good plan starts here.</h2><p>Your project begins with a clear team and a flexible deadline. You can manage project access after creating it.</p></div><div className={styles.actions}><button disabled={busy} type="submit">{busy ? 'Creating…' : 'Create project'}</button><Link href="/projects">Cancel</Link></div></aside>
    </form>}
  </div></DashboardLayout>;
}
