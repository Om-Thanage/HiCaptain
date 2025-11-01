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

export const analyticsService = {
  // Get comprehensive analytics data
  getAnalytics: async (): Promise<AnalyticsData> => {
    const response = await api.get('/api/analytics');
    return response.data;
  },

  // Get analytics for a specific project
  getProjectAnalytics: async (projectId: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/project/${projectId}`);
    return response.data;
  },

  // Get analytics for a specific user
  getUserAnalytics: async (userId: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/user/${userId}`);
    return response.data;
  },

  // Get analytics for a date range
  getAnalyticsByDateRange: async (startDate: string, endDate: string): Promise<AnalyticsData> => {
    const response = await api.get(`/api/analytics/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Get recent activities
  getRecentActivities: async (limit: number = 10): Promise<AnalyticsData['recentActivities']> => {
    const response = await api.get(`/api/analytics/activities?limit=${limit}`);
    return response.data;
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

  // Export analytics data
  exportAnalytics: async (format: 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/api/analytics/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};