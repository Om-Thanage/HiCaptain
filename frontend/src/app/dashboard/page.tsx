'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, CheckCircle2, FolderKanban, Plus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { projectService } from '@/services/project';
import { taskService } from '@/services/task';
import { Project, Task } from '@/types';
import styles from './dashboard.module.css';

const done = (status: string) => ['done', 'completed', 'complete'].includes(status?.toLowerCase());
const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date';

export default function DashboardPage() {
  const user = authService.getUserFromToken();
  const canManage = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectService.getAll(), taskService.getAll()])
      .then(([projectData, taskData]) => { setProjects(projectData); setTasks(taskData); })
      .catch(() => toast.error('Could not load your workspace'))
      .finally(() => setLoading(false));
  }, []);

  const openTasks = useMemo(() => tasks.filter(task => !done(task.status)), [tasks]);
  const nextTasks = useMemo(() => [...openTasks].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 5), [openTasks]);
  const activeProjects = projects.filter(project => !done(project.status)).length;
  const projectNames = new Map(projects.map(project => [project.id, project.name]));

  return <DashboardLayout><div className={styles.page}>
    <section className={styles.hero}><div><span className={styles.kicker}>YOUR WORKSPACE</span><h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1><p>Pick up where your team left off. Your projects and next tasks are right here.</p><div className={styles.heroActions}><Link href="/projects">Explore projects <ArrowUpRight size={16} /></Link>{canManage && <Link href="/projects/new">New project <Plus size={16} /></Link>}</div></div><div className={styles.heroArt}><span>✦</span><div><FolderKanban size={40} /></div></div></section>
    <div className={styles.summary}><div><span><FolderKanban size={18} /></span><strong>{projects.length}</strong><small>Projects in view</small></div><div><span><CalendarDays size={18} /></span><strong>{activeProjects}</strong><small>Active projects</small></div><div><span><CheckCircle2 size={18} /></span><strong>{openTasks.length}</strong><small>Open tasks</small></div></div>
    <div className={styles.columns}><section><div className={styles.sectionTitle}><div><span className={styles.kicker}>KEEP MOVING</span><h2>Projects</h2></div><Link href="/projects">View all <ArrowUpRight size={15} /></Link></div>{loading ? <div className={styles.empty}>Loading projects…</div> : projects.length ? <div className={styles.projectList}>{projects.slice(0, 4).map((project, index) => <Link href={`/projects/${project.id}`} key={project.id} className={styles.project}><span className={`${styles.projectMark} ${styles[`mark${index % 3}`]}`}><FolderKanban size={20} /></span><div><strong>{project.name}</strong><small>{project.status?.replace(/-/g, ' ') || 'Planning'} · Due {date(project.endDate)}</small></div><ArrowUpRight size={17} /></Link>)}</div> : <div className={styles.empty}>No projects yet. {canManage && <Link href="/projects/new">Create your first project</Link>}</div>}</section><section><div className={styles.sectionTitle}><div><span className={styles.kicker}>UP NEXT</span><h2>Open tasks</h2></div><Link href="/schedule">Schedule <ArrowUpRight size={15} /></Link></div>{loading ? <div className={styles.empty}>Loading tasks…</div> : nextTasks.length ? <div className={styles.taskList}>{nextTasks.map(task => <Link href={`/projects/${task.projectId}`} key={task.id} className={styles.task}><span className={styles.taskCheck}><CheckCircle2 size={17} /></span><div><strong>{task.title}</strong><small>{projectNames.get(task.projectId) || 'Project'} · {date(task.deadline)}</small></div><ArrowUpRight size={16} /></Link>)}</div> : <div className={styles.empty}>You&apos;re all caught up.</div>}</section></div>
    <div className={styles.shortcut}><div><span className={styles.kicker}>WORK TOGETHER</span><h2>Everything your team needs, one click away.</h2></div><div><Link href="/schedule"><CalendarDays size={17} /> Schedule</Link><Link href="/storage"><FolderKanban size={17} /> Project files</Link>{user?.roles?.includes('Admin') && <Link href="/users"><UsersRound size={17} /> Team members</Link>}</div></div>
  </div></DashboardLayout>;
}
