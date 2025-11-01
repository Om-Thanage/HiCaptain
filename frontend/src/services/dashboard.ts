import api from '@/lib/api';

export interface DashboardStats {
  totalUsers?: number;
  totalProjects?: number;
  totalRevenue?: number;
  activeProjects?: number;
  completedProjects?: number;
  pendingInvoices?: number;
  systemAlerts?: number;
  assignedTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  overdueTasks?: number;
  hoursLogged?: number;
  commitsThisWeek?: number;
  productivity?: number;
  totalInvestment?: number;
  feedbackGiven?: number;
  upcomingMilestones?: number;
  projectProgress?: number;
  teamMembers?: number;
  upcomingDeadlines?: number;
  teamProductivity?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    userId?: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    completionRate: number;
    totalTasks: number;
    client?: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    projectId: string;
    assigneeId: string;
    dueDate?: string;
    description?: string;
    projectName?: string;
  }>;
  teamMembers?: Array<{
    id: string;
    name: string;
    role: string;
    productivity: number;
  }>;
}

export const dashboardService = {
  // Get dashboard analytics for the current user
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/api/analytics/dashboard');
    return transformAnalyticsData(response.data);
  },

  // Get recent activities
  async getRecentActivities(limit: number = 10): Promise<DashboardData['recentActivity']> {
    const response = await api.get(`/api/analytics/activities?limit=${limit}`);
    return response.data;
  },

  // Get project progress
  async getProjectProgress(): Promise<DashboardData['projects']> {
    const response = await api.get('/api/analytics/projects/progress');
    return response.data;
  },

  // Get current user's tasks
  async getCurrentUserTasks(limit: number = 5): Promise<DashboardData['tasks']> {
    try {
      const [tasksResponse, projectsResponse] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects')
      ]);
      
      const projects = projectsResponse.data || [];
      const projectMap = projects.reduce((acc: any, project: any) => {
        acc[project.id] = project.name;
        return acc;
      }, {});
      
      // Transform the task data to match our dashboard interface
      const tasks = (tasksResponse.data || []).slice(0, limit).map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        assigneeId: task.assignedDeveloperIds?.[0] || '',
        dueDate: task.deadline,
        description: task.description,
        projectName: projectMap[task.projectId] || `Project ${task.projectId}`
      }));
      return tasks;
    } catch (error) {
      console.error('Error fetching current user tasks:', error);
      return [];
    }
  },

  // Get team members for project managers
  async getTeamMembers(): Promise<DashboardData['teamMembers']> {
    try {
      const response = await api.get('/users');
      // Filter out current user and transform data
      const users = (response.data || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        productivity: Math.floor(Math.random() * 30) + 70 // Mock productivity for now
      }));
      return users.filter((user: any) => user.role !== 'Admin');
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  },

  // Get project name by ID
  async getProjectName(projectId: string): Promise<string> {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data?.name || `Project ${projectId}`;
    } catch (error) {
      console.error('Error fetching project name:', error);
      return `Project ${projectId}`;
    }
  },
};

// Transform backend analytics data to frontend dashboard format
function transformAnalyticsData(analyticsData: any): DashboardData {
  const stats: DashboardStats = {};
  const recentActivity = analyticsData.recentActivity || [];
  const projects = analyticsData.projectStats || [];

  // Extract basic counts
  stats.totalUsers = analyticsData.totalUsers || 0;
  stats.totalProjects = analyticsData.totalProjects || 0;
  stats.totalRevenue = analyticsData.revenueStats?.totalRevenue || 0;

  // Calculate project stats
  if (projects.length > 0) {
    stats.activeProjects = projects.filter((p: any) => p.status === 'in-progress' || p.status === 'active').length;
    stats.completedProjects = projects.filter((p: any) => p.status === 'completed').length;
  }

  // Calculate task stats
  const taskStats = analyticsData.taskStats || {};
  stats.assignedTasks = taskStats.total || 0;
  stats.completedTasks = taskStats.completed || 0;
  stats.pendingTasks = taskStats.inProgress || 0;
  stats.overdueTasks = taskStats.blocked || 0; // Using blocked as overdue for now

  // Time and productivity stats
  const timeStats = analyticsData.timeStats || {};
  stats.hoursLogged = timeStats.weeklyHours || 0;
  
  const gitStats = analyticsData.gitStats || {};
  stats.commitsThisWeek = gitStats.weeklyCommits || 0;

  // Calculate productivity (simple metric based on completion rate)
  if (stats.assignedTasks && stats.assignedTasks > 0 && stats.completedTasks) {
    stats.productivity = Math.round((stats.completedTasks / stats.assignedTasks) * 100);
  } else {
    stats.productivity = 0;
  }

  // Revenue stats
  const revenueStats = analyticsData.revenueStats || {};
  stats.pendingInvoices = Math.round(revenueStats.pendingAmount || 0);
  stats.totalInvestment = Math.round(revenueStats.paidAmount || 0);

  // Meeting stats
  const meetingStats = analyticsData.meetingStats || {};
  stats.upcomingMilestones = meetingStats.upcomingMeetings || 0;
  stats.upcomingDeadlines = meetingStats.upcomingMeetings || 0;

  // Team stats (for managers)
  stats.teamMembers = analyticsData.totalUsers || 0;
  stats.teamProductivity = stats.productivity || 0;

  // Project progress for clients
  if (projects.length > 0) {
    const avgProgress = projects.reduce((sum: number, p: any) => sum + (p.completionRate || 0), 0) / projects.length;
    stats.projectProgress = Math.round(avgProgress);
  }

  // System alerts (using blocked tasks as alerts)
  stats.systemAlerts = taskStats.blocked || 0;

  // Mock feedback given for clients (would need separate endpoint)
  stats.feedbackGiven = Math.floor(Math.random() * 10) + 1;

  return {
    stats,
    recentActivity: recentActivity.map((activity: any) => ({
      type: activity.type,
      title: activity.title,
      description: activity.description,
      timestamp: activity.timestamp,
      userId: activity.userId,
    })),
    projects: projects.map((project: any) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      completionRate: project.completionRate || 0,
      totalTasks: project.totalTasks || 0,
      client: project.client,
    })),
  };
}