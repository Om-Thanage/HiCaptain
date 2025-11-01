'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  FolderKanban, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
  pendingInvoices: number;
  systemAlerts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingInvoices: 0,
    systemAlerts: 0,
  });
  const [recentActivity, setRecentActivity] = useState<DashboardData['recentActivity']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const dashboardData = await dashboardService.getDashboardData();
        
        setStats({
          totalUsers: dashboardData.stats.totalUsers || 0,
          totalProjects: dashboardData.stats.totalProjects || 0,
          totalRevenue: dashboardData.stats.totalRevenue || 0,
          activeProjects: dashboardData.stats.activeProjects || 0,
          completedProjects: dashboardData.stats.completedProjects || 0,
          pendingInvoices: Math.floor(dashboardData.stats.pendingInvoices || 0),
          systemAlerts: dashboardData.stats.systemAlerts || 0,
        });
        
        setRecentActivity(dashboardData.recentActivity.slice(0, 3));
      } catch (error) {
        console.error('Error fetching admin data:', error);
        // Fallback to some default values in case of error
        setStats({
          totalUsers: 0,
          totalProjects: 0,
          totalRevenue: 0,
          activeProjects: 0,
          completedProjects: 0,
          pendingInvoices: 0,
          systemAlerts: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
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
        <Link href="/users" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Manage Users
            </span>
          </div>
        </Link>
        
        <Link href="/analytics" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              System Analytics
            </span>
          </div>
        </Link>
        
        <Link href="/projects" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <FolderKanban className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              All Projects
            </span>
          </div>
        </Link>
        
        <Link href="/invoices" className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors duration-200 group">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300" />
            <span className="text-slate-200 group-hover:text-slate-100 font-medium">
              Revenue & Invoices
            </span>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-slate-100">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FolderKanban className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Projects</p>
              <p className="text-2xl font-bold text-slate-100">{stats.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-100">${stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">System Alerts</p>
              <p className="text-2xl font-bold text-slate-100">{stats.systemAlerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Project Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-slate-300">Active Projects</span>
              </div>
              <span className="text-slate-100 font-semibold">{stats.activeProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-slate-300">Completed Projects</span>
              </div>
              <span className="text-slate-100 font-semibold">{stats.completedProjects}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Financial Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-slate-300">Monthly Revenue</span>
              </div>
              <span className="text-slate-100 font-semibold">${(stats.totalRevenue / 12).toFixed(0)}K</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-slate-300">Pending Invoices</span>
              </div>
              <span className="text-slate-100 font-semibold">{stats.pendingInvoices}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-green-400" />
                <span className="text-slate-300">Active Users</span>
              </div>
              <span className="text-slate-100 font-semibold">{Math.floor(stats.totalUsers * 0.8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-slate-300">Critical Alerts</span>
              </div>
              <span className="text-slate-100 font-semibold">{stats.systemAlerts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Recent System Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                  {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                  {activity.type === 'commit' && <FolderKanban className="h-5 w-5 text-purple-400" />}
                  {activity.type === 'project' && <FolderKanban className="h-5 w-5 text-green-400" />}
                  {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-green-400" />}
                  {!['task', 'commit', 'project', 'payment'].includes(activity.type) && <AlertCircle className="h-5 w-5 text-yellow-400" />}
                  <div>
                    <p className="text-slate-200 font-medium">{activity.title}</p>
                    <p className="text-slate-400 text-sm">{activity.description}</p>
                  </div>
                  <span className="text-slate-500 text-sm ml-auto">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
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
  );
}