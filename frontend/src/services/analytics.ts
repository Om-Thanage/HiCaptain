import api from '@/lib/api';

export interface AnalyticsData {
  totalProjects: number;
  totalTasks: number;
  totalUsers: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalHoursWorked: number;
  averageTaskCompletionTime: number;
  totalRevenue: number;
  monthlyRevenue: { month: string; amount: number }[];
  tasksByStatus: { status: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  hoursWorkedByUser: { userId: string; username: string; hours: number }[];
  tasksCompletedByUser: { userId: string; username: string; count: number }[];
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId: string;
    username: string;
  }[];
}

// Transform raw backend analytics into AnalyticsData expected by UI
function transformToAnalyticsData(raw: any): AnalyticsData {
  const taskStats = raw?.taskStats || {};
  const projectStats = Array.isArray(raw?.projectStats) ? raw.projectStats : [];
  const timeStats = raw?.timeStats || {};
  const revenueStats = raw?.revenueStats || {};
  const recentActivity = Array.isArray(raw?.recentActivity) ? raw.recentActivity : [];

  const projectsByStatusMap: Record<string, number> = projectStats.reduce((acc: Record<string, number>, p: any) => {
    const s = (p?.status || 'unknown').toString();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const projectsByStatus = Object.entries(projectsByStatusMap).map(([status, count]) => ({
    status,
    count: Number(count),
  }));

  const tasksByStatus = [
    { status: 'completed', count: Number(taskStats.completed || 0) },
    { status: 'in-progress', count: Number(taskStats.inProgress || 0) },
    { status: 'pending', count: Number(taskStats.pending ?? taskStats.todo ?? 0) },
    { status: 'blocked', count: Number(taskStats.blocked || 0) },
  ].filter(item => item.count > 0);

  // Normalize monthlyRevenue (supports Map-like object or array)
  let monthlyRevenue: { month: string; amount: number }[] = [];
  const rawMonthly = revenueStats?.monthlyRevenue;
  if (Array.isArray(rawMonthly)) {
    // Already [{month, amount}]
    monthlyRevenue = rawMonthly.map((r: any) => ({
      month: String(r.month ?? ''),
      amount: Number(r.amount ?? 0),
    }));
  } else if (rawMonthly && typeof rawMonthly === 'object') {
    monthlyRevenue = Object.entries(rawMonthly).map(([month, amount]) => ({
      month,
      amount: Number(amount as any),
    }));
  }

  // Normalize recent activities
  const recentActivities = recentActivity.map((a: any, idx: number) => ({
    id: String(a.id ?? idx),
    type: String(a.type ?? 'activity'),
    description: String(a.description ?? a.title ?? ''),
    timestamp: String(a.timestamp ?? ''),
    userId: String(a.userId ?? ''),
    username: String(a.username ?? a.userId ?? ''),
  }));

  // Optional arrays: fill with [] if not provided
  const hoursWorkedByUser =
    Array.isArray(raw?.hoursWorkedByUser) ? raw.hoursWorkedByUser : (timeStats.hoursByUser || []);
  const tasksCompletedByUser =
    Array.isArray(raw?.tasksCompletedByUser) ? raw.tasksCompletedByUser : [];

  return {
    totalProjects: Number(raw?.totalProjects ?? projectStats.length ?? 0),
    totalTasks: Number(raw?.totalTasks ?? taskStats.total ?? 0),
    totalUsers: Number(raw?.totalUsers ?? 0),

    completedTasks: Number(taskStats.completed ?? 0),
    pendingTasks: Number(taskStats.pending ?? taskStats.todo ?? 0),
    inProgressTasks: Number(taskStats.inProgress ?? 0),

    totalHoursWorked: Number(raw?.totalHours ?? timeStats.weeklyHours ?? 0),
    averageTaskCompletionTime: Number(timeStats.avgTaskCompletionTime ?? 0),

    totalRevenue: Number(raw?.totalRevenue ?? revenueStats.totalRevenue ?? 0),
    monthlyRevenue,

    tasksByStatus,
    projectsByStatus,

    hoursWorkedByUser: (hoursWorkedByUser || []).map((r: any) => ({
      userId: String(r.userId ?? ''),
      username: String(r.username ?? r.userId ?? ''),
      hours: Number(r.hours ?? r.totalHours ?? 0),
    })),
    tasksCompletedByUser: (tasksCompletedByUser || []).map((r: any) => ({
      userId: String(r.userId ?? ''),
      username: String(r.username ?? r.userId ?? ''),
      count: Number(r.count ?? r.completed ?? 0),
    })),

    recentActivities,
  };
}

export const analyticsService = {
  // Get comprehensive analytics data
  getAnalytics: async (): Promise<AnalyticsData> => {
    const response = await api.get('/api/analytics/dashboard');
    return transformToAnalyticsData(response.data);
  },

  // Get analytics for a specific project
  getProjectAnalytics: async (projectId: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/project/${projectId}`);
    return transformToAnalyticsData(response.data);
  },

  // Get analytics for a specific user
  getUserAnalytics: async (userId: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/user/${userId}`);
    return transformToAnalyticsData(response.data);
  },

  // Get analytics for a date range
  getAnalyticsByDateRange: async (startDate: string, endDate: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/date-range?startDate=${startDate}&endDate=${endDate}`);
    return transformToAnalyticsData(response.data);
  },

  // Get recent activities
  getRecentActivities: async (limit: number = 10): Promise<AnalyticsData['recentActivities']> => {
    const response = await api.get(`/api/analytics/activities?limit=${limit}`);
    const wrapped = transformToAnalyticsData({ recentActivity: response.data });
    return wrapped.recentActivities;
  },

  // Get task completion trends
  getTaskCompletionTrends: async (days: number = 30): Promise<{ date: string; completed: number; created: number }[]> => {
    const response = await api.get(`/api/analytics/trends/tasks?days=${days}`);
    return response.data;
  },

  // Get project progress overview
  getProjectProgress: async (): Promise<{ projectId: string; projectName: string; progress: number }[]> => {
    const response = await api.get('/api/analytics/projects/progress');
    return response.data;
  },

  // Get revenue trends
  getRevenueTrends: async (months: number = 12): Promise<{ month: string; revenue: number }[]> => {
    const response = await api.get(`/api/analytics/trends/revenue?months=${months}`);
    return response.data;
  },
};
