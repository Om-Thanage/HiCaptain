'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  Users, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';

interface ProjectManagerStats {
  activeProjects: number;
  teamMembers: number;
  upcomingDeadlines: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  teamProductivity: number;
}

export default function ProjectManagerDashboard() {
  const [stats, setStats] = useState<ProjectManagerStats>({
    activeProjects: 0,
    teamMembers: 0,
    upcomingDeadlines: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    teamProductivity: 0,
  });
  const [projects, setProjects] = useState<DashboardData['projects']>([]);
  const [teamMembers, setTeamMembers] = useState<DashboardData['teamMembers']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectManagerData = async () => {
      setLoading(true);
      try {
        const [dashboardData, members] = await Promise.all([
          dashboardService.getDashboardData(),
          dashboardService.getTeamMembers()
        ]);
        
        setStats({
          activeProjects: dashboardData.stats.activeProjects || 0,
          teamMembers: dashboardData.stats.teamMembers || 0,
          upcomingDeadlines: dashboardData.stats.upcomingDeadlines || 0,
          completedTasks: dashboardData.stats.completedTasks || 0,
          pendingTasks: dashboardData.stats.pendingTasks || 0,
          overdueTasks: dashboardData.stats.overdueTasks || 0,
          teamProductivity: dashboardData.stats.teamProductivity || 0,
        });
        
        setProjects(dashboardData.projects || []);
        setTeamMembers(members || []);
      } catch (error) {
        console.error('Error fetching project manager data:', error);
        // Fallback to default values
        setStats({
          activeProjects: 0,
          teamMembers: 0,
          upcomingDeadlines: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          teamProductivity: 0,
        });
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectManagerData();
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
        <Link href="/projects/new" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <FolderKanban className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              New Project
            </span>
          </div>
        </Link>
        
        <Link href="/analytics" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Team Analytics
            </span>
          </div>
        </Link>
        
        <Link href="/schedule" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Schedule Meeting
            </span>
          </div>
        </Link>
        
        <Link href="/feedback" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Team Feedback
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
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Team Members</p>
              <p className="text-2xl font-bold text-slate-100">{stats.teamMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <Target className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Team Productivity</p>
              <p className="text-2xl font-bold text-slate-100">{stats.teamProductivity}%</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Upcoming Deadlines</p>
              <p className="text-2xl font-bold text-slate-100">{stats.upcomingDeadlines}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Completed Tasks</p>
              <p className="text-2xl font-bold text-slate-100">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Pending Tasks</p>
              <p className="text-2xl font-bold text-slate-100">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Overdue Tasks</p>
              <p className="text-2xl font-bold text-slate-100">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects and Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Projects */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Current Projects</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projects && projects.length > 0 ? (
                projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-slate-100">{project.name}</h4>
                      <p className="text-sm text-slate-400">Tasks: {project.totalTasks} • Progress: {Math.round(project.completionRate)}%</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === 'completed' 
                        ? 'text-green-300 bg-green-900/20 border border-green-800'
                        : project.status === 'in-progress' || project.status === 'active'
                        ? 'text-yellow-300 bg-yellow-900/20 border border-yellow-800'
                        : 'text-blue-300 bg-blue-900/20 border border-blue-800'
                    }`}>
                      {project.status === 'in-progress' || project.status === 'active' ? 'In Progress' :
                       project.status === 'completed' ? 'Completed' : 'Planning'}
                    </span>
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

        {/* Team Performance */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Team Performance</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.slice(0, 3).map((member, index) => {
                  const getAvatarColor = (index: number) => {
                    const colors = [
                      'from-blue-500 to-blue-600',
                      'from-green-500 to-green-600',
                      'from-purple-500 to-purple-600',
                      'from-orange-500 to-orange-600',
                      'from-pink-500 to-pink-600'
                    ];
                    return colors[index % colors.length];
                  };

                  const getInitials = (name: string) => {
                    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  };

                  return (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(index)} rounded-full flex items-center justify-center`}>
                          <span className="text-white font-medium text-sm">{getInitials(member.name)}</span>
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{member.name}</p>
                          <p className="text-slate-400 text-sm">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-100 font-semibold">{member.productivity}%</p>
                        <p className="text-slate-400 text-sm">Efficiency</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                  <p>No team members found</p>
                  <p className="text-sm">Team data will appear here once available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}