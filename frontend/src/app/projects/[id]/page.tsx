'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { authService } from '@/services/auth';
import { taskService } from '@/services/task';
import { Project, Task } from '@/types';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectKanban from './kanban/ProjectKanban';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId === 'new') {
      setLoading(false);
      return;
    }

    const fetchProjectData = async () => {
      try {
        const [projectData, tasksData] = await Promise.all([
          projectService.getById(projectId),
          taskService.getByProjectId(projectId),
        ]);
        setProject(projectData);
        setTasks(tasksData);
      } catch (error) {
        toast.error('Failed to fetch project details');
        console.error('Error fetching project details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && projectId !== 'new') {
      fetchProjectData();
    }
  }, [projectId]);  

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-100">
            {projectId === 'new' ? 'Create New Project' : 'Project not found'}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {projectId === 'new'
              ? 'You should be redirected to the new project page.'
              : "The project you're looking for doesn't exist."}
          </p>
          <div className="mt-6">
            <Link
              href={projectId === 'new' ? '/projects/new' : '/projects'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {projectId === 'new' ? 'Go to New Project' : 'Back to Projects'}
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const user = authService.getUserFromToken();
  const canManageAccess = user?.roles?.includes('Admin') || (user?.roles?.includes('ProjectManager') && project.projectManagerId === user.id);

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pl-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/projects"
              className="p-2 rounded-xlbg-linear-to-r from-slate-800/70 to-slate-900/50 hover:bg-slate-700/70 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-200" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
                {project.name}
              </h1>
              <p className="text-slate-400 mt-1 max-w-xl">{project.description}</p>
            </div>
          </div>
          {canManageAccess && <Link href={`/projects/${project.id}/access`} className="hc-pill-button dark">Manage access</Link>}
        </div>

        {/* Project Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {[
            {
              icon: <Calendar className="h-8 w-8 text-blue-400" />, label: 'Start Date', value: formatDate(project.startDate),
            },
            {
              icon: <Calendar className="h-8 w-8 text-red-400" />, label: 'End Date', value: formatDate(project.endDate),
            },
            {
              icon: <Users className="h-8 w-8 text-green-400" />, label: 'Team Size', value: project.developerIds.length,
            },
            {
              icon: <CheckCircle className="h-8 w-8 text-purple-400" />, label: 'Progress', value: `${progressPercentage}%`,
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="rounded-2xl p-6 bg-linear-to-r from-slate-800/70 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 shadow-md hover:shadow-xl transition-all"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center space-x-4">
                <div>{stat.icon}</div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-100">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        <ProjectKanban />
        
      </motion.div>
    </DashboardLayout>
  );
}
