'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { authService } from '@/services/auth';
import { Project } from '@/types';
import { ArrowUpRight, CalendarDays, Layers3, Plus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './projects.module.css';

const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const roles = authService.getUserFromToken()?.roles || [];
  const canManage = roles.includes('Admin') || roles.includes('ProjectManager');

  useEffect(() => {
    projectService.getAll().then(setProjects).catch(() => toast.error('Could not load projects')).finally(() => setLoading(false));
  }, []);

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><div><span className={styles.kicker}>YOUR WORK, ORGANIZED</span><h1>Projects that move things forward.</h1><p>Keep your team, dates, and next steps together.</p></div>{canManage && <Link href="/projects/new" className={styles.primary}><Plus size={18} /> New project</Link>}</div>
    {loading ? <div className={styles.empty}>Loading projects…</div> : projects.length ? <div className={styles.grid}>{projects.map((project, index) => <article key={project.id} className={styles.card}>
      <div className={styles.cardTop}><span className={`${styles.mark} ${styles[`mark${index % 3}`]}`}><Layers3 size={22} /></span><span className={styles.status}>{project.status.replace(/-/g, ' ')}</span></div>
      <h3>{project.name}</h3><p>{project.description || 'No description yet.'}</p>
      <div className={styles.meta}><span><CalendarDays size={15} /> {date(project.startDate)} – {date(project.endDate)}</span><span><UsersRound size={15} /> {project.developerIds?.length || 0} developers</span></div>
      <div className={styles.cardActions}><Link href={`/projects/${project.id}`}>Open project <ArrowUpRight size={16} /></Link></div>
    </article>)}</div> : <div className={styles.empty}><Layers3 size={31} /><h3>No projects yet</h3><p>Create a project to start planning with your team.</p>{canManage && <Link href="/projects/new" className={styles.primary}><Plus size={17} /> New project</Link>}</div>}
  </div></DashboardLayout>;
}
