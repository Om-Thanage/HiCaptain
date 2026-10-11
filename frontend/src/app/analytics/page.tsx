'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { analyticsService, AnalyticsData } from '@/services/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  IndianRupee,
  Activity,
  Target,
  Award,
  Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Lightweight chart card wrapper for consistent UI
function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await analyticsService.getAnalytics();
        setAnalyticsData(data);
      } catch (error) {
        toast.error('Failed to fetch analytics data');
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">No Analytics Data</h2>
            <p className="text-slate-400">Unable to load analytics data at this time.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

  const completionRate = (analyticsData.totalTasks || 0) > 0 
    ? (((analyticsData.completedTasks || 0) / (analyticsData.totalTasks || 1)) * 100).toFixed(1) 
    : '0';

  return (
    <DashboardLayout>
      <div className="space-y-6 pl-6">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold drop-shadow-md">
              <span className="text-white/90">Analytics</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Real-time insights for your workspace
            </p>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Projects</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.totalProjects || 0}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="bg-linear-to-r from-emerald-600/90 to-teal-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Tasks</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.totalTasks || 0}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-linear-to-r from-purple-600/90 to-fuchsia-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Team Members</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.totalUsers || 0}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="bg-linear-to-r from-amber-500/90 to-yellow-600/90 text-white p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-3xl font-bold mt-1">{completionRate}%</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Hours Worked</p>
                <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalHoursWorked || 0}h</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/20">
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">₹{(analyticsData.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <IndianRupee className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Avg. Task Time</p>
                <p className="text-3xl font-bold text-white mt-1">{(analyticsData.averageTaskCompletionTime || 0).toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Tasks by Status" delay={0.05}>
            {!(analyticsData.tasksByStatus || []).length ? (
              <div className="text-sm text-slate-400">No task status data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.tasksByStatus || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8a72e9"
                    dataKey="count"
                    nameKey="status"
                  >
                    {(analyticsData.tasksByStatus || []).map((entry, index) => (
                      <Cell key={`cell-ts-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e9e4df', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Projects by Status" delay={0.1}>
            {!(analyticsData.projectsByStatus || []).length ? (
              <div className="text-sm text-slate-400">No project status data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.projectsByStatus || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8a72e9"
                    dataKey="count"
                    nameKey="status"
                  >
                    {(analyticsData.projectsByStatus || []).map((entry, index) => (
                      <Cell key={`cell-ps-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e9e4df', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Monthly Revenue" delay={0.15}>
          {!(analyticsData.monthlyRevenue || []).length ? (
            <div className="text-sm text-slate-400">No revenue trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e4df" />
                <XAxis dataKey="month" stroke="#716a66" />
                <YAxis stroke="#716a66" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e9e4df', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="amount" stroke="#8bbd4b" fill="#8bbd4b" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Team Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Hours Worked by Team Member" delay={0.2}>
            {!(analyticsData.hoursWorkedByUser || []).length ? (
              <div className="text-sm text-slate-400">No per-user hours data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.hoursWorkedByUser || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e4df" />
                  <XAxis type="number" stroke="#716a66" />
                  <YAxis dataKey="username" type="category" stroke="#716a66" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e9e4df', borderRadius: '8px' }} />
                  <Bar dataKey="hours" fill="#8a72e9" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Completed tasks assigned to each teammate" delay={0.25}>
            {!(analyticsData.tasksCompletedByUser || []).length ? (
              <div className="text-sm text-slate-400">No per-user completion data</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.tasksCompletedByUser || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e4df" />
                  <XAxis type="number" stroke="#716a66" />
                  <YAxis dataKey="username" type="category" stroke="#716a66" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e9e4df', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#8bbd4b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Recent Activities */}
        <div className="rounded-2xl border border-slate-700/60 bg-linear-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-100">Recent Activities</h3>
          </div>
          <div className="p-6 space-y-3">
            {(analyticsData.recentActivities || []).map((activity) => (
              <motion.div
                key={activity.id}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 transition-all"
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-200">{activity.description}</p>
                  <p className="text-sm text-slate-400">
                    by {activity.username || activity.userId} • {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="ml-auto text-xs px-2 py-1 bg-slate-600 rounded-full text-slate-300">
                  {activity.type}
                </span>
              </motion.div>
            ))}
            {!(analyticsData.recentActivities || []).length && (
              <div className="text-center text-slate-400 py-6">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
