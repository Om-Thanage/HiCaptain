'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, UsersRound } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { authService } from '@/services/auth';
import { Project } from '@/types';
import toast from 'react-hot-toast';
import ProjectKanban from './kanban/ProjectKanban';
import styles from './detail.module.css';

const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

export default function ProjectDetailPage() {
  const id = useParams().id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getUserFromToken();

  useEffect(() => {
    projectService.getById(id).then(setProject).catch(() => toast.error('Could not load project')).finally(() => setLoading(false));
  }, [id]);

  const canManageAccess = user?.roles?.includes('Admin') || (user?.roles?.includes('ProjectManager') && project?.projectManagerId === user.id);

  return <DashboardLayout><div className={styles.page}>
    {loading ? <div className={styles.notice}>Loading project…</div> : !project ? <div className={styles.notice}>Project not found.</div> : <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><span className={styles.kicker}>PROJECT SPACE</span><h1>{project.name}</h1><p>{project.description || 'A shared space to keep this project moving.'}</p><span className={styles.status}>{project.status.replace(/-/g, ' ')}</span></div>
        <div className={styles.heroArt} aria-hidden="true"><span>✦</span><div><i /><i /><i /></div><div><i /><i /></div></div>
      </section>
      <div className={styles.details}>
        <div><CalendarDays size={20} /><span><small>PROJECT TIMELINE</small><strong>{date(project.startDate)} – {date(project.endDate)}</strong></span></div>
        <div><UsersRound size={20} /><span><small>PROJECT TEAM</small><strong>{project.developerIds?.length || 0} developers</strong></span>{canManageAccess && <Link href={`/projects/${id}/access`}>Manage team <ArrowUpRight size={15} /></Link>}</div>
      </div>
      <ProjectKanban project={project} />
    </>}
  </div></DashboardLayout>;
}
