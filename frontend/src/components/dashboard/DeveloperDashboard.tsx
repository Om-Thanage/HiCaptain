'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function DeveloperDashboard() {
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
            <CheckCircle2 className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              My Tasks
            </span>
          </div>
        </Link>
        
        <Link href="/schedule" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Time Tracking
            </span>
          </div>
        </Link>
        
        <Link href="/git" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <GitBranch className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Git Integration
            </span>
          </div>
        </Link>
        
        <Link href="/notifications" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Activity Log
            </span>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <CheckCircle2 className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Assigned Tasks</p>
              <p className="text-2xl font-bold text-slate-100">{stats.assignedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <Clock className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Hours This Week</p>
              <p className="text-2xl font-bold text-slate-100">{stats.hoursLogged}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <GitBranch className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Commits This Week</p>
              <p className="text-2xl font-bold text-slate-100">{stats.commitsThisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <Target className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Productivity</p>
              <p className="text-2xl font-bold text-slate-100">{stats.productivity}%</p>
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
              <p className="text-sm font-medium text-slate-400">Completed</p>
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
              <p className="text-sm font-medium text-slate-400">In Progress</p>
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
              <p className="text-sm font-medium text-slate-400">Overdue</p>
              <p className="text-2xl font-bold text-slate-100">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Tasks */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Current Tasks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
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
                    <div key={task.id} className={`flex items-center justify-between p-3 bg-slate-700 rounded-lg border-l-4 ${priorityColors.border}`}>
                      <div>
                        <h4 className="font-medium text-slate-100">{task.title}</h4>
                        <p className="text-sm text-slate-400">{task.projectName || `Project ${task.projectId}`}</p>
                        <p className="text-xs text-slate-500">{task.dueDate ? formatDueDate(task.dueDate) : 'No deadline set'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.text} ${priorityColors.bg} border ${priorityColors.borderColor}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </span>
                    </div>
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
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                    {activity.type === 'commit' && <GitBranch className="h-5 w-5 text-purple-400" />}
                    {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                    {activity.type === 'code-review' && <Code className="h-5 w-5 text-blue-400" />}
                    {activity.type === 'meeting' && <Calendar className="h-5 w-5 text-yellow-400" />}
                    {!['commit', 'task', 'code-review', 'meeting'].includes(activity.type) && <Activity className="h-5 w-5 text-yellow-400" />}
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
    </div>
  );
}