'use client';

import { useEffect, useState } from 'react';
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  IndianRupee, 
  Activity,
  Calendar,
  Target,
  Award,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-100">Analytics</h1>
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <Activity className="h-4 w-4" />
            <span>Real-time data</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Projects</p>
                <p className="text-2xl font-bold text-slate-100">{analyticsData.totalProjects || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-100">{analyticsData.totalTasks || 0}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-slate-100">{analyticsData.totalUsers || 0}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-100">{completionRate}%</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Hours Worked</p>
                <p className="text-2xl font-bold text-slate-100">{analyticsData.totalHoursWorked || 0}h</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-100">
                  ${(analyticsData.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Avg. Task Time</p>
                <p className="text-2xl font-bold text-slate-100">
                  {(analyticsData.averageTaskCompletionTime || 0).toFixed(1)}h
                </p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Tasks by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.tasksByStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analyticsData.tasksByStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Project Status Distribution */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Projects by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.projectsByStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analyticsData.projectsByStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trends */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.monthlyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours Worked by User */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Hours Worked by Team Member</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.hoursWorkedByUser || []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="username" type="category" stroke="#9CA3AF" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="hours" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tasks Completed by User */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Tasks Completed by Team Member</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.tasksCompletedByUser || []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="username" type="category" stroke="#9CA3AF" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {(analyticsData.recentActivities || []).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-200">{activity.description}</p>
                  <p className="text-sm text-slate-400">
                    by {activity.username} • {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-600 rounded-full text-slate-300">
                  {activity.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}