'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { taskService } from '@/services/task';
import { Project, Task } from '@/types';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the ID is "new", this should be handled by the /projects/new route
    // This is a fallback in case the routing doesn't work as expected
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-300 bg-green-900/20 border border-green-800';
      case 'in-progress':
        return 'text-blue-300 bg-blue-900/20 border border-blue-800';
      case 'pending':
        return 'text-yellow-300 bg-yellow-900/20 border border-yellow-800';
      case 'on-hold':
        return 'text-slate-300 bg-slate-900/20 border border-slate-800';
      default:
        return 'text-slate-300 bg-slate-900/20 border border-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-300 bg-red-900/20 border border-red-800';
      case 'medium':
        return 'text-yellow-300 bg-yellow-900/20 border border-yellow-800';
      case 'low':
        return 'text-green-300 bg-green-900/20 border border-green-800';
      default:
        return 'text-slate-300 bg-slate-900/20 border border-slate-800';
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
              : "The project you're looking for doesn't exist."
            }
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

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/projects"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600 mt-2">{project.description}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/projects/${project.id}/kanban`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Kanban Board
            </Link>
            <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Start Date</p>
                <p className="text-lg font-bold text-gray-900">{formatDate(project.startDate)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <Calendar className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">End Date</p>
                <p className="text-lg font-bold text-gray-900">{formatDate(project.endDate)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-lg font-bold text-gray-900">{project.developerIds.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-lg font-bold text-gray-900">{progressPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Status and Progress */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>{completedTasks} of {totalTasks} tasks completed</span>
            <span>{progressPercentage}%</span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Project Tasks</h3>
          </div>
          <div className="p-6">
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <div className="flex items-center space-x-3 mt-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Due: {formatDate(task.deadline)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                <p className="mt-1 text-sm text-gray-500">No tasks have been created for this project yet.</p>
                <div className="mt-6">
                  <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    <Plus className="w-5 h-5 mr-2" />
                    Add First Task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}