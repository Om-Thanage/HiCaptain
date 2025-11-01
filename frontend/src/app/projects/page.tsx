'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { Project } from '@/types';
import { Plus, Calendar, Users, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAll();
        setProjects(data);
      } catch (error) {
        toast.error('Failed to fetch projects');
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-300 bg-green-900/20 border border-green-800';
      case 'in-progress':
        return 'text-blue-300 bg-blue-900/20 border border-blue-800';
      case 'pending':
        return 'text-yellow-300 bg-yellow-900/20 border border-yellow-800';
      case 'on-hold':
        return 'text-slate-300 bg-slate-800 border border-slate-700';
      default:
        return 'text-slate-300 bg-slate-800 border border-slate-700';
    }
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Projects</h1>
            <p className="text-slate-400 mt-2">Manage and track your projects</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Link>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 hover:bg-slate-750 transition-colors duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <FolderKanban className="w-8 h-8 text-blue-400 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">{project.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 mb-4 line-clamp-3">{project.description}</p>

                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Start: {formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>End: {formatDate(project.endDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{project.developerIds.length} developers</span>
                  </div>
                </div>

                <div className="mt-6 flex space-x-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-900/20 text-blue-300 rounded-md hover:bg-blue-900/30 transition-colors duration-200 border border-blue-800"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/projects/${project.id}/kanban`}
                    className="flex-1 text-center px-3 py-2 bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 transition-colors duration-200 border border-slate-600"
                  >
                    Kanban
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderKanban className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-200">No projects</h3>
            <p className="mt-1 text-sm text-slate-400">Get started by creating a new project.</p>
            <div className="mt-6">
              <Link
                href="/projects/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}