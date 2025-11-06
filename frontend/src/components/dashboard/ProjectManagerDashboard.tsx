'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  Users, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  DollarSign
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';
import { projectService } from '@/services/project';
import { Project } from '@/types';

interface ProjectManagerStats {
  activeProjects: number;
  teamMembers: number;
  upcomingDeadlines: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  teamProductivity: number;
  totalRevenue: number;
}

export default function ProjectManagerDashboard({
  user,
}: {
  user: { id: string; name: string; role: string } | null;
}) {
  const [stats, setStats] = useState<ProjectManagerStats>({
    activeProjects: 0,
    teamMembers: 0,
    upcomingDeadlines: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    teamProductivity: 0,
    totalRevenue: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<DashboardData['teamMembers']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectManagerData = async () => {
      setLoading(true);
      try {
        const [dashboardData, allProjects, members] = await Promise.all([
          dashboardService.getDashboardData(),
          projectService.getAll(),
          dashboardService.getTeamMembers()
        ]);
        
        // Filter projects managed by current user
        const managedProjects = user?.id ? allProjects.filter(project => 
          project.projectManagerId === user.id
        ) : [];
        
        setStats({
          activeProjects: managedProjects.filter(p => p.status === 'in-progress' || p.status === 'active').length,
          teamMembers: dashboardData.stats.teamMembers || 0,
          upcomingDeadlines: dashboardData.stats.upcomingDeadlines || 0,
          completedTasks: dashboardData.stats.completedTasks || 0,
          pendingTasks: dashboardData.stats.pendingTasks || 0,
          overdueTasks: dashboardData.stats.overdueTasks || 0,
          teamProductivity: dashboardData.stats.teamProductivity || 0,
          totalRevenue: dashboardData.stats.totalRevenue || 0,
        });
        
        setProjects(managedProjects);
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
          totalRevenue: 0,
        });
        setProjects([]);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectManagerData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <motion.div
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Please log in to access your dashboard.</p>
      </div>
    );
  }

  const overviewStats = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: <FolderKanban className="w-5 h-5 text-blue-400" />,
    },
    {
      title: 'Completed Tasks',
      value: stats.completedTasks,
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    },
    {
      title: 'Team Productivity',
      value: `${stats.teamProductivity}%`,
      icon: <Target className="w-5 h-5 text-purple-400" />,
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
    },
  ];

  return (
    <motion.div
      className="space-y-8 pl-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="space-y-5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: -25 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.15 },
          },
        }}
      >
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          variants={{
            hidden: { opacity: 0, y: -10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold drop-shadow-md">
              <span className="text-white/90">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1">
              Manage your projects and track team progress.
            </p>
          </div>

          {/* Role Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700/60 backdrop-blur-md shadow-sm hover:shadow-lg transition-all"
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="text-slate-100 text-sm font-medium uppercase tracking-wide">
              {user.role}
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/projects/new" className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-lg p-4 hover:bg-slate-700/70 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <FolderKanban className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              New Project
            </span>
          </div>
        </Link>
        
        <Link href="/analytics" className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-lg p-4 hover:bg-slate-700/70 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Team Analytics
            </span>
          </div>
        </Link>
        
        <Link href="/schedule" className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-lg p-4 hover:bg-slate-700/70 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Schedule Meeting
            </span>
          </div>
        </Link>
        
        <Link href="/feedback" className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-lg p-4 hover:bg-slate-700/70 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Team Feedback
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Main Stats Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="flex flex-col gap-6 relative z-10">
          {/* Managed Projects Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-linear-to-r from-purple-600/90 to-indigo-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <FolderKanban className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Managed Projects</p>
                <p className="text-3xl font-bold mt-1">{stats.activeProjects}</p>
                <p className="text-sm opacity-80">actively managed by you</p>
              </div>
            </div>
          </motion.div>

          {/* Team Members Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-linear-to-r from-emerald-600/90 to-teal-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Team Members</p>
                <p className="text-3xl font-bold mt-1">{stats.teamMembers}</p>
                <p className="text-sm opacity-80">across all projects</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Overview Stats */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
        >
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {overviewStats.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-slate-900/10 p-4 border-white/10 border-2 rounded-xl hover:bg-white/20 transition-all"
              >
                <div className="p-2 rounded-lg">{item.icon}</div>
                <div>
                  <p className="text-sm text-slate-200">{item.title}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Managed Projects and Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Managed Projects */}
        <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100">Your Managed Projects</h3>
            <p className="text-sm text-slate-400 mt-1">Projects where you are the project manager</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projects && projects.length > 0 ? (
                projects.slice(0, 4).map((project) => (
                  <motion.div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700/70 transition-all"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-100">{project.name}</h4>
                        <p className="text-sm text-slate-400">{project.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
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
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <FolderKanban className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="font-medium">No managed projects found</p>
                  <p className="text-sm mt-1">You'll see projects you manage here</p>
                  <Link 
                    href="/projects/new" 
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <FolderKanban className="h-4 w-4" />
                    Create New Project
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100">Team Performance</h3>
            <p className="text-sm text-slate-400 mt-1">Your team members' productivity overview</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.slice(0, 4).map((member, index) => {
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
                    <motion.div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700/70 transition-all"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 bg-linear-to-br ${getAvatarColor(index)} rounded-full flex items-center justify-center`}>
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
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="font-medium">No team members found</p>
                  <p className="text-sm mt-1">Team data will appear here once available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}