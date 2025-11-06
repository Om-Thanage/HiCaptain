'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  Code,
  AlertTriangle,
  Calendar,
  Target,
  Activity
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';

interface DeveloperStats {
  assignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  hoursLogged: number;
  commitsThisWeek: number;
  productivity: number;
}

export default function DeveloperDashboard({
  user,
}: {
  user: { id: string; name: string; role: string };
}) {
  const [stats, setStats] = useState<DeveloperStats>({
    assignedTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    hoursLogged: 0,
    commitsThisWeek: 0,
    productivity: 0,
  });
  const [recentActivity, setRecentActivity] = useState<DashboardData['recentActivity']>([]);
  const [currentTasks, setCurrentTasks] = useState<DashboardData['tasks']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeveloperData = async () => {
      setLoading(true);
      try {
        const [dashboardData, tasks] = await Promise.all([
          dashboardService.getDashboardData(),
          dashboardService.getCurrentUserTasks(3)
        ]);
        
        setStats({
          assignedTasks: dashboardData.stats.assignedTasks || 0,
          completedTasks: dashboardData.stats.completedTasks || 0,
          pendingTasks: dashboardData.stats.pendingTasks || 0,
          overdueTasks: dashboardData.stats.overdueTasks || 0,
          hoursLogged: dashboardData.stats.hoursLogged || 0,
          commitsThisWeek: dashboardData.stats.commitsThisWeek || 0,
          productivity: dashboardData.stats.productivity || 0,
        });
        
        setRecentActivity(dashboardData.recentActivity.slice(0, 4));
        setCurrentTasks(tasks || []);
      } catch (error) {
        console.error('Error fetching developer data:', error);
        // Fallback to default values
        setStats({
          assignedTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          hoursLogged: 0,
          commitsThisWeek: 0,
          productivity: 0,
        });
        setCurrentTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeveloperData();
  }, []);

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
              Here's your development progress and current tasks.
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
              className="w-2.5 h-2.5 rounded-full bg-green-400"
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Link href="/projects" className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/20 hover:bg-slate-700/30 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              My Tasks
            </span>
          </div>
        </Link>
        
        <Link href="/schedule" className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/20 hover:bg-slate-700/30 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Time Tracking
            </span>
          </div>
        </Link>
        
        <Link href="/git" className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/20 hover:bg-slate-700/30 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <GitBranch className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Git Integration
            </span>
          </div>
        </Link>
        
        <Link href="/notifications" className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/20 hover:bg-slate-700/30 transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Activity Log
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Main Stats Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="flex flex-col gap-6 relative z-10">
          {/* Assigned Tasks Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Assigned Tasks</p>
                <p className="text-3xl font-bold mt-1">{stats.assignedTasks}</p>
                <p className="text-sm opacity-80">current assignments</p>
              </div>
            </div>
          </motion.div>

          {/* Hours Logged Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-linear-to-r from-emerald-600/90 to-teal-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Hours This Week</p>
                <p className="text-3xl font-bold mt-1">{stats.hoursLogged}</p>
                <p className="text-sm opacity-80">hours logged</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Stats Card */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
        >
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Performance Overview
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4 bg-slate-900/10 p-4 border-white/10 border-2 rounded-xl hover:bg-white/20 transition-all">
              <div className="p-2 rounded-lg">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Commits</p>
                <p className="text-lg font-bold text-white">{stats.commitsThisWeek}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900/10 p-4 border-white/10 border-2 rounded-xl hover:bg-white/20 transition-all">
              <div className="p-2 rounded-lg">
                <Target className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Productivity</p>
                <p className="text-lg font-bold text-white">{stats.productivity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900/10 p-4 border-white/10 border-2 rounded-xl hover:bg-white/20 transition-all">
              <div className="p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Completed</p>
                <p className="text-lg font-bold text-white">{stats.completedTasks}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900/10 p-4 border-white/10 border-2 rounded-xl hover:bg-white/20 transition-all">
              <div className="p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-200">Overdue</p>
                <p className="text-lg font-bold text-white">{stats.overdueTasks}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Task Status Overview */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-slate-100">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/20 p-3 rounded-xl">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">In Progress</p>
              <p className="text-2xl font-bold text-slate-100">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="bg-red-500/20 p-3 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Overdue</p>
              <p className="text-2xl font-bold text-slate-100">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tasks and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Tasks */}
        <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100">Current Tasks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {currentTasks && currentTasks.length > 0 ? (
                currentTasks.map((task) => {
                  const getPriorityColor = (priority: string) => {
                    switch (priority.toLowerCase()) {
                      case 'high':
                        return {
                          border: 'border-red-500',
                          text: 'text-red-300',
                          bg: 'bg-red-900/20',
                          borderColor: 'border-red-800'
                        };
                      case 'medium':
                        return {
                          border: 'border-yellow-500',
                          text: 'text-yellow-300',
                          bg: 'bg-yellow-900/20',
                          borderColor: 'border-yellow-800'
                        };
                      case 'low':
                        return {
                          border: 'border-green-500',
                          text: 'text-green-300',
                          bg: 'bg-green-900/20',
                          borderColor: 'border-green-800'
                        };
                      default:
                        return {
                          border: 'border-blue-500',
                          text: 'text-blue-300',
                          bg: 'bg-blue-900/20',
                          borderColor: 'border-blue-800'
                        };
                    }
                  };

                  const priorityColors = getPriorityColor(task.priority);
                  const formatDueDate = (dueDate: string) => {
                    const deadline = new Date(dueDate);
                    const now = new Date();
                    const diffTime = deadline.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
                    } else if (diffDays === 0) {
                      return 'Due today';
                    } else if (diffDays === 1) {
                      return 'Due tomorrow';
                    } else {
                      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                    }
                  };

                  return (
                    <motion.div 
                      key={task.id} 
                      className={`flex items-center justify-between p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 transition-all border-l-4 ${priorityColors.border}`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <h4 className="font-medium text-slate-100">{task.title}</h4>
                        <p className="text-sm text-slate-400">{task.projectName || `Project ${task.projectId}`}</p>
                        <p className="text-xs text-slate-500">{task.dueDate ? formatDueDate(task.dueDate) : 'No deadline set'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.text} ${priorityColors.bg} border ${priorityColors.borderColor}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <CheckCircle2 className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                  <p>No tasks assigned</p>
                  <p className="text-sm">All caught up! 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
          </div>
          <div className="p-6 space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <div>
                    {activity.type === 'commit' && <GitBranch className="h-5 w-5 text-purple-400" />}
                    {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                    {activity.type === 'code-review' && <Code className="h-5 w-5 text-blue-400" />}
                    {activity.type === 'meeting' && <Calendar className="h-5 w-5 text-yellow-400" />}
                    {!['commit', 'task', 'code-review', 'meeting'].includes(activity.type) && <Activity className="h-5 w-5 text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-slate-100 font-medium">{activity.title}</p>
                    <p className="text-slate-400 text-sm">{activity.description}</p>
                  </div>
                  <span className="ml-auto text-slate-500 text-sm">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-6">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}