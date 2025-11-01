'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  DollarSign, 
  MessageCircle, 
  TrendingUp,
  CheckCircle2,
  Clock,
  FileText,
  Calendar
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';

interface ClientStats {
  activeProjects: number;
  completedProjects: number;
  totalInvestment: number;
  pendingInvoices: number;
  feedbackGiven: number;
  upcomingMilestones: number;
  projectProgress: number;
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<ClientStats>({
    activeProjects: 0,
    completedProjects: 0,
    totalInvestment: 0,
    pendingInvoices: 0,
    feedbackGiven: 0,
    upcomingMilestones: 0,
    projectProgress: 0,
  });
  const [projects, setProjects] = useState<DashboardData['projects']>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardData['recentActivity']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      try {
        const dashboardData = await dashboardService.getDashboardData();
        
        setStats({
          activeProjects: dashboardData.stats.activeProjects || 0,
          completedProjects: dashboardData.stats.completedProjects || 0,
          totalInvestment: dashboardData.stats.totalInvestment || 0,
          pendingInvoices: Math.floor(dashboardData.stats.pendingInvoices || 0),
          feedbackGiven: dashboardData.stats.feedbackGiven || 0,
          upcomingMilestones: dashboardData.stats.upcomingMilestones || 0,
          projectProgress: dashboardData.stats.projectProgress || 0,
        });
        
        setProjects(dashboardData.projects || []);
        setRecentActivity(dashboardData.recentActivity.slice(0, 4));
      } catch (error) {
        console.error('Error fetching client data:', error);
        // Fallback to default values
        setStats({
          activeProjects: 0,
          completedProjects: 0,
          totalInvestment: 0,
          pendingInvoices: 0,
          feedbackGiven: 0,
          upcomingMilestones: 0,
          projectProgress: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/projects" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <FolderKanban className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              View Projects
            </span>
          </div>
        </Link>
        
        <Link href="/invoices" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Invoices & Payments
            </span>
          </div>
        </Link>
        
        <Link href="/feedback" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Give Feedback
            </span>
          </div>
        </Link>
        
        <Link href="/schedule" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Schedule Meeting
            </span>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <FolderKanban className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Active Projects</p>
              <p className="text-2xl font-bold text-slate-100">{stats.activeProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Investment</p>
              <p className="text-2xl font-bold text-slate-100">${stats.totalInvestment.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Project Progress</p>
              <p className="text-2xl font-bold text-slate-100">{stats.projectProgress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <CheckCircle2 className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Completed Projects</p>
              <p className="text-2xl font-bold text-slate-100">{stats.completedProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <FileText className="h-8 w-8 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Pending Invoices</p>
              <p className="text-2xl font-bold text-slate-100">{stats.pendingInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <MessageCircle className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Feedback Given</p>
              <p className="text-2xl font-bold text-slate-100">{stats.feedbackGiven}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Upcoming Milestones</p>
              <p className="text-2xl font-bold text-slate-100">{stats.upcomingMilestones}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects and Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Projects */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">My Projects</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projects && projects.length > 0 ? (
                projects.slice(0, 2).map((project) => (
                  <div key={project.id} className="p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-100">{project.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'completed' 
                          ? 'text-green-300 bg-green-900/20 border border-green-800'
                          : project.status === 'in-progress' || project.status === 'active'
                          ? 'text-yellow-300 bg-yellow-900/20 border border-yellow-800'
                          : 'text-blue-300 bg-blue-900/20 border border-blue-800'
                      }`}>
                        {project.status === 'in-progress' ? 'In Progress' : 
                         project.status === 'active' ? 'In Progress' :
                         project.status === 'completed' ? 'Completed' : 'Planning'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">Tasks: {project.totalTasks}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 bg-slate-600 rounded-full h-2 mr-4">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${project.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-300">{Math.round(project.completionRate)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>No projects found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity & Invoices */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                    {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                    {activity.type === 'commit' && <FolderKanban className="h-5 w-5 text-blue-400" />}
                    {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-green-400" />}
                    {activity.type === 'meeting' && <Calendar className="h-5 w-5 text-yellow-400" />}
                    {!['task', 'commit', 'payment', 'meeting'].includes(activity.type) && <MessageCircle className="h-5 w-5 text-purple-400" />}
                    <div>
                      <p className="text-slate-200 font-medium">{activity.title}</p>
                      <p className="text-slate-400 text-sm">{activity.description}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Upcoming Milestones</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-700 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-100">E-commerce Final Testing</h4>
                <span className="text-sm text-slate-400">Dec 10, 2024</span>
              </div>
              <p className="text-sm text-slate-400">Complete testing and bug fixes before launch</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-300 bg-blue-900/20 border border-blue-800">
                  5 days remaining
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-700 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-100">Mobile App Design Review</h4>
                <span className="text-sm text-slate-400">Dec 20, 2024</span>
              </div>
              <p className="text-sm text-slate-400">Review and approve final UI/UX designs</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-purple-300 bg-purple-900/20 border border-purple-800">
                  15 days remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}