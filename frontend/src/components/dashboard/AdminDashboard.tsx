'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
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

export default function AdminDashboard({user}: {user: {id: string; name: string; role: string}}) {
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
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
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

  const quickLinks = [
    { href: '/users', label: 'Manage Users', icon: Users, color: 'text-blue-400' },
    { href: '/analytics', label: 'System Analytics', icon: TrendingUp, color: 'text-green-400' },
    { href: '/projects', label: 'All Projects', icon: FolderKanban, color: 'text-purple-400' },
    { href: '/invoices', label: 'Revenue & Invoices', icon: DollarSign, color: 'text-yellow-400' },
  ];

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: -20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.15 },
          },
        }}
      >
        <motion.h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
          variants={{
            hidden: { opacity: 0, y: -10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          Welcome back, {user.name.split(' ')[0]}
        </motion.h1>

        {/* Role Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/70 border border-slate-700/60 backdrop-blur-md"
          variants={{
            hidden: { opacity: 0, y: -10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-green-400"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-slate-100 text-sm font-medium uppercase tracking-wide">
            {user.role}
          </span>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickLinks.map(({ href, label, icon: Icon, color }) => (
          <motion.div
            key={href}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href={href}
              className="relative block overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/60 backdrop-blur-md group hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-6 w-6 ${color} group-hover:scale-110 transition-transform`} />
                <span className="text-slate-200 font-medium">{label}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Animated Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-purple-400' },
          { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Alerts', value: stats.systemAlerts, icon: AlertCircle, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            className="rounded-2xl p-6 border border-slate-700/60 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center space-x-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-slate-400 text-sm">{label}</p>
                <motion.p
                  className="text-2xl font-semibold text-slate-100"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                >
                  {value}
                </motion.p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Project + Finance + Health */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[
          {
            title: 'Project Overview',
            items: [
              { label: 'Active Projects', value: stats.activeProjects, icon: Clock, color: 'text-yellow-400' },
              { label: 'Completed Projects', value: stats.completedProjects, icon: CheckCircle2, color: 'text-green-400' },
            ],
          },
          {
            title: 'Financial Overview',
            items: [
              { label: 'Monthly Revenue', value: `$${(stats.totalRevenue / 12).toFixed(0)}K`, icon: DollarSign, color: 'text-green-400' },
              { label: 'Pending Invoices', value: stats.pendingInvoices, icon: Clock, color: 'text-yellow-400' },
            ],
          },
          {
            title: 'System Health',
            items: [
              { label: 'Active Users', value: Math.floor(stats.totalUsers * 0.8), icon: UserCheck, color: 'text-blue-400' },
              { label: 'Critical Alerts', value: stats.systemAlerts, icon: AlertCircle, color: 'text-red-400' },
            ],
          },
        ].map(({ title, items }) => (
          <div
            key={title}
            className="rounded-2xl p-6 border border-slate-700/60 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md shadow-lg"
          >
            <h3 className="text-lg font-semibold text-slate-100 mb-4">{title}</h3>
            <div className="space-y-4">
              {items.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-slate-300">{label}</span>
                  </div>
                  <span className="text-slate-100 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100">Recent System Activity</h3>
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
                  {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                  {activity.type === 'commit' && <FolderKanban className="h-5 w-5 text-purple-400" />}
                  {activity.type === 'project' && <FolderKanban className="h-5 w-5 text-green-400" />}
                  {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-yellow-400" />}
                  {!['task', 'commit', 'project', 'payment'].includes(activity.type) && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
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
            <div className="text-center text-slate-400 py-6">No recent activity</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
