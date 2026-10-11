'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';
import { taskService } from '@/services/task';
import { userService } from '@/services/user';
import { googleWorkspaceService } from '@/services/googleWorkspace';
import { Project, Task, TaskRequest, User } from '@/types';
import styles from './kanban.module.css';

const columns = [{ id: 'pending', name: 'To do' }, { id: 'in-progress', name: 'In progress' }, { id: 'completed', name: 'Completed' }];
const today = () => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
const emptyForm = (projectId: string, status = 'pending'): TaskRequest => ({ title: '', description: '', status, priority: 'medium', deadline: today(), projectId, assignedDeveloperIds: [] });
const normalize = (task: Task): Task => ({ ...task, status: ['completed', 'done'].includes(task.status?.toLowerCase()) ? 'completed' : ['in-progress', 'in_progress'].includes(task.status?.toLowerCase()) ? 'in-progress' : 'pending', priority: task.priority?.toLowerCase() || 'medium', deadline: Array.isArray(task.deadline) ? (task.deadline as unknown as number[]).map((part, index) => index ? String(part).padStart(2, '0') : part).join('-') : task.deadline || '', assignedDeveloperIds: task.assignedDeveloperIds || [] });
const date = (value: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

export default function ProjectKanban({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskRequest>(() => emptyForm(project.id));
  const [saving, setSaving] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState<string[]>([]);
  const [copyingTask, setCopyingTask] = useState<string | null>(null);
  const roles = authService.getUserFromToken()?.roles || [];
  const canManage = roles.includes('Admin') || roles.includes('ProjectManager');
  const canEdit = canManage || roles.includes('Developer');

  useEffect(() => {
    setLoading(true);
    taskService.getByProjectId(project.id).then(data => setTasks(data.map(normalize))).catch(() => toast.error('Could not load tasks')).finally(() => setLoading(false));
    if (project.developerIds?.length) userService.getDevelopers().then(users => setDevelopers(users.filter(user => project.developerIds.includes(user.id)))).catch(() => {});
    googleWorkspaceService.linkedTasks(project.id).then(setLinkedTasks).catch(() => {});
  }, [project.id, project.developerIds]);

  function openCreate(status = 'pending') { setEditing(null); setForm(emptyForm(project.id, status)); setDialogOpen(true); }
  function openEdit(task: Task) { setEditing(task); setForm({ title: task.title, description: task.description || '', status: task.status, priority: task.priority, deadline: task.deadline?.slice(0, 10) || '', projectId: project.id, assignedDeveloperIds: task.assignedDeveloperIds || [] }); setDialogOpen(true); }
  function closeDialog() { if (!saving) setDialogOpen(false); }
  function toggleDeveloper(id: string) { setForm(current => ({ ...current, assignedDeveloperIds: current.assignedDeveloperIds.includes(id) ? current.assignedDeveloperIds.filter(value => value !== id) : [...current.assignedDeveloperIds, id] })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await taskService.update(editing.id, { ...form, title: form.title.trim() });
        setTasks(current => current.map(task => task.id === editing.id ? normalize(updated) : task));
        toast.success('Task updated');
      } else {
        const created = await taskService.create({ ...form, title: form.title.trim() });
        setTasks(current => [...current, normalize(created)]);
        toast.success('Task added');
      }
      setDialogOpen(false);
    } catch { toast.error(editing ? 'Could not update task' : 'Could not add task'); }
    finally { setSaving(false); }
  }

  async function move(task: Task, status: string) {
    if (!canEdit || task.status === status) return;
    try {
      const updated = await taskService.update(task.id, { title: task.title, description: task.description, status, priority: task.priority, deadline: task.deadline?.slice(0, 10), projectId: project.id, assignedDeveloperIds: task.assignedDeveloperIds });
      setTasks(current => current.map(item => item.id === task.id ? normalize(updated) : item));
    } catch { toast.error('Could not move task'); }
  }

  async function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try { await taskService.delete(task.id); setTasks(current => current.filter(item => item.id !== task.id)); toast.success('Task deleted'); }
    catch { toast.error('Could not delete task'); }
  }

  async function copyToGoogle(task: Task) {
    setCopyingTask(task.id);
    try { await googleWorkspaceService.copyTask(task.id); setLinkedTasks(current => [...current, task.id]); toast.success('Copied to your Google Tasks list'); }
    catch { toast.error('Connect Google Workspace in Settings to copy tasks'); }
    finally { setCopyingTask(null); }
  }

  return <section className={styles.board}>
    <div className={styles.heading}><div><span className={styles.kicker}>KEEP THINGS MOVING</span><h2>Project tasks</h2><p>Plan the work and track each task from start to finish.</p></div>{canManage && <button type="button" className={styles.primary} onClick={() => openCreate()}><Plus size={17} /> Add task</button>}</div>
    {loading ? <div className={styles.notice}>Loading tasks…</div> : <div className={styles.columns}>{columns.map(column => <div key={column.id} className={styles.column} onDragOver={event => { if (canEdit) event.preventDefault(); }} onDrop={event => { event.preventDefault(); const task = tasks.find(item => item.id === event.dataTransfer.getData('text/plain')); if (task) move(task, column.id); }}>
      <div className={styles.columnHeading}><span className={`${styles.dot} ${styles[column.id.replace('-', '')]}`} /><h3>{column.name}</h3><span className={styles.count}>{tasks.filter(task => task.status === column.id).length}</span></div>
      <div className={styles.cardList}>{tasks.filter(task => task.status === column.id).map(task => <article key={task.id} className={styles.task} draggable={canEdit} onDragStart={event => event.dataTransfer.setData('text/plain', task.id)}>
        <div className={styles.taskTop}><span className={`${styles.priority} ${styles[task.priority] || ''}`}>{task.priority}</span><div className={styles.taskActions}>{canEdit && <button type="button" onClick={() => openEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={15} /></button>}{canManage && <button type="button" onClick={() => remove(task)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>}{canEdit && <GripVertical size={15} aria-hidden="true" />}</div></div>
        <h4>{task.title}</h4>{task.description && <p>{task.description}</p>}
        <div className={styles.taskFooter}><span>{task.deadline && <><CalendarDays size={14} /> {date(task.deadline)}</>}</span><div className={styles.avatars}>{task.assignedDeveloperIds?.slice(0, 3).map(id => <span key={id} title={developers.find(user => user.id === id)?.name || 'Team member'}>{developers.find(user => user.id === id)?.name?.charAt(0).toUpperCase() || '?'}</span>)}</div></div>
        <button type="button" className={styles.googleTask} disabled={linkedTasks.includes(task.id) || copyingTask === task.id} onClick={() => copyToGoogle(task)}>{linkedTasks.includes(task.id) ? 'In Google Tasks' : copyingTask === task.id ? 'Copying…' : 'Add to Google Tasks'}</button>
      </article>)}{!tasks.some(task => task.status === column.id) && <div className={styles.empty}>No tasks here yet</div>}</div>
      {canManage && <button type="button" className={styles.columnAdd} onClick={() => openCreate(column.id)}><Plus size={16} /> Add task</button>}
    </div>)}</div>}
    {dialogOpen && <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) closeDialog(); }}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><div className={styles.modalHeading}><div><span className={styles.kicker}>PROJECT TASK</span><h2 id="task-dialog-title">{editing ? 'Edit task' : 'Add a new task'}</h2><p>Give your team a clear next step.</p></div><button type="button" className={styles.close} onClick={closeDialog} aria-label="Close"><X size={19} /></button></div>
      <form onSubmit={submit} className={styles.form}><label>Task name<input required autoFocus maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Review homepage designs" /></label><label>Description<textarea rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="What needs to be done?" /></label>
      <div className={styles.formRow}><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label><label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
      <label>Due date<input type="date" required value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} /></label><fieldset><legend>Assign to</legend>{developers.length ? <div className={styles.developers}>{developers.map(developer => <label key={developer.id} className={styles.developer}><input type="checkbox" checked={form.assignedDeveloperIds.includes(developer.id)} onChange={() => toggleDeveloper(developer.id)} /><span className={styles.avatar}>{developer.name.charAt(0).toUpperCase()}</span><span>{developer.name}</span></label>)}</div> : <p className={styles.hint}>Add developers to this project to assign tasks.</p>}</fieldset>
      <div className={styles.modalActions}><button type="button" onClick={closeDialog}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}</button></div></form>
    </div></div>}
  </section>;
}
