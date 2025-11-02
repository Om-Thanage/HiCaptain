'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FolderKanban,
  DollarSign,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { dashboardService, DashboardData } from '@/services/dashboard';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
  pendingInvoices: number;
}

export default function AdminDashboard({
  user,
}: {
  user: { id: string; name: string; role: string };
}) {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingInvoices: 0,
  });

  const [recentActivity, setRecentActivity] =
    useState<DashboardData['recentActivity']>([]);
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
          pendingInvoices: Math.floor(
            dashboardData.stats.pendingInvoices || 0
          ),
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

  const overviewStats = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: <FolderKanban className="w-5 h-5 text-blue-400" />,
    },
    {
      title: 'Completed Projects',
      value: stats.completedProjects,
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.totalRevenue}`,
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices,
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
              Here's a quick summary of your organization’s progress today.
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


      {/* Main Stats Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="flex flex-col gap-6 relative z-10">
          {/* Total Users Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                <p className="text-sm opacity-80">(including you)</p>
              </div>
            </div>
          </motion.div>

          {/* Revenue Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-linear-to-r from-emerald-600/90 to-teal-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <DollarSign className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">${stats.totalRevenue}</p>
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

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100">
            Recent System Activity
          </h3>
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
                  <FolderKanban className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-100 font-medium">
                    {activity.title}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {activity.description}
                  </p>
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
    </motion.div>
  );
}
