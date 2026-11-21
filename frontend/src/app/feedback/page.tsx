'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MessageSquareText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { feedbackService } from '@/services/feedback';
import { organizationService, type Member } from '@/services/organization';
import { projectService } from '@/services/project';
import type { Feedback, FeedbackStatus, Project } from '@/types';
import styles from './feedback.module.css';

const statuses: { value: FeedbackStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];
const statusLabel = (status?: string) => statuses.find(item => item.value === status)?.label ?? 'Open';
const day = (value?: string) => value
  ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : 'No date';
const failure = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : fallback;

export default function FeedbackPage() {
  const user = authService.getUserFromToken();
  const roles = user?.roles ?? [];
  const canSubmit = roles.includes('Client') || roles.includes('Developer');
  const canTriage = roles.includes('Admin') || roles.includes('ProjectManager');
  const canDelete = canTriage;

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ projectId: '', message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [items, projectList] = await Promise.all([feedbackService.getAll(), projectService.getAll()]);
      setFeedback(items);
      setProjects(projectList);
      setForm(current => ({ ...current, projectId: current.projectId || projectList[0]?.id || '' }));
      if (user?.organizationId)
        setMembers(await organizationService.members(user.organizationId).catch(() => []));
    } catch (loadError) {
      setError(failure(loadError, 'Could not load feedback. Check your access and try again.'));
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);
  useEffect(() => { void load(); }, [load]);

  const projectName = useMemo(() => new Map(projects.map(project => [project.id, project.name])), [projects]);
  const memberName = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);
  const visible = useMemo(() => feedback
    .filter(item => !projectFilter || item.projectId === projectFilter)
    .filter(item => !statusFilter || (item.status || 'open') === statusFilter)
    .sort((a, b) => (b.dateIssued || '').localeCompare(a.dateIssued || '')), [feedback, projectFilter, statusFilter]);
  const counts = useMemo(() => Object.fromEntries(statuses.map(({ value }) =>
    [value, feedback.filter(item => (item.status || 'open') === value).length])) as Record<FeedbackStatus, number>, [feedback]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.message.trim()) return;
    setBusy(true);
    try {
      const created = await feedbackService.create({ projectId: form.projectId, message: form.message.trim() });
      setFeedback(current => [created, ...current]);
      setForm(current => ({ ...current, message: '' }));
      toast.success('Feedback sent to the project team');
    } catch (submitError) {
      toast.error(failure(submitError, 'Could not send feedback'));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: Feedback, status: FeedbackStatus) {
    setBusy(true);
    try {
      const saved = await feedbackService.update(item.id, { projectId: item.projectId, message: item.message, status });
      setFeedback(current => current.map(entry => entry.id === item.id ? saved : entry));
      toast.success(`Marked ${statusLabel(status).toLowerCase()}`);
    } catch (updateError) {
      toast.error(failure(updateError, 'Could not update the status'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Feedback) {
    if (!window.confirm('Delete this feedback? This cannot be undone.')) return;
    setBusy(true);
    try {
      await feedbackService.delete(item.id);
      setFeedback(current => current.filter(entry => entry.id !== item.id));
      toast.success('Feedback deleted');
    } catch (deleteError) {
      toast.error(failure(deleteError, 'Could not delete feedback'));
    } finally {
      setBusy(false);
    }
  }

  return <DashboardLayout><div className={styles.page}>
    <header className={styles.heading}>
      <div>
        <span className={styles.kicker}>CLIENT VOICE</span>
        <h1>Feedback</h1>
        <p>Requests and issues raised on your projects. AI teammates read open feedback as project context.</p>
      </div>
      <div className={styles.summary} aria-label="Feedback by status">
        {statuses.map(({ value, label }) => <div key={value}><strong>{counts[value] ?? 0}</strong><small>{label}</small></div>)}
      </div>
    </header>

    <div className={styles.grid}>
      <section className={styles.listCard} aria-labelledby="feedback-list">
        <div className={styles.cardHeading}>
          <h2 id="feedback-list">All feedback</h2>
          <div className={styles.filters}>
            <label><span className={styles.srOnly}>Project</span>
              <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}>
                <option value="">All projects</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label><span className={styles.srOnly}>Status</span>
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="">Any status</option>
                {statuses.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>
        {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void load()}><RefreshCw size={13} /> Retry</button></div>}
        {loading ? <p className={styles.empty}>Loading feedback…</p>
          : !error && !visible.length ? <p className={styles.empty}>{feedback.length ? 'No feedback matches these filters.' : 'No feedback yet.'}</p>
          : visible.map(item => {
            const author = item.userId === user?.id ? 'You' : memberName.get(item.userId) ?? 'Team member';
            return <article key={item.id} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.avatar} aria-hidden="true">{author.charAt(0).toUpperCase()}</span>
                <div className={styles.meta}>
                  <strong>{author}</strong>
                  <span><Link href={`/projects/${item.projectId}`}>{projectName.get(item.projectId) ?? 'Project'}</Link> · {day(item.dateIssued)}</span>
                </div>
                <span className={`${styles.badge} ${styles[item.status || 'open'] ?? ''}`}>{statusLabel(item.status)}</span>
              </div>
              <p className={styles.message}>{item.message}</p>
              {(canTriage || canDelete) && <div className={styles.actions}>
                {canTriage && <label>Status
                  <select value={item.status || 'open'} disabled={busy} onChange={event => void changeStatus(item, event.target.value as FeedbackStatus)}>
                    {statuses.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>}
                {canDelete && <button type="button" className={styles.delete} disabled={busy} onClick={() => void remove(item)}><Trash2 size={13} /> Delete</button>}
              </div>}
            </article>;
          })}
      </section>

      <aside className={styles.side}>
        {canSubmit ? <form className={styles.formCard} onSubmit={submit}>
          <span className={styles.formIcon}><MessageSquareText size={19} /></span>
          <h2>Share feedback</h2>
          <p>The project manager reviews new feedback and updates its status.</p>
          <label className={styles.field}>Project
            <select required value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}>
              {!projects.length && <option value="">No projects available</option>}
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>Feedback
            <textarea required maxLength={5000} rows={6} placeholder="What should the team know?" value={form.message}
              onChange={event => setForm({ ...form, message: event.target.value })} />
          </label>
          <button disabled={busy || !form.projectId || !form.message.trim()}><Plus size={15} /> Send feedback</button>
        </form> : <div className={styles.tip}>
          <p>Clients and developers submit feedback. Admins and project managers triage it here by updating its status.</p>
        </div>}
      </aside>
    </div>
  </div></DashboardLayout>;
}
