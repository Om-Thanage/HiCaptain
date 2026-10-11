import api from '@/lib/api';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'meeting' | 'system';
  category: string;
  source: string;
  actionUrl?: string;
  relatedId?: string;
  priority: 'low' | 'normal' | 'high';
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: NotificationData[];
  unreadCount: number;
  totalCount: number;
  unreadOnly: boolean;
}

export interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  categoryBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

export const notificationService = {
  // Get user's notifications
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50): Promise<NotificationResponse> => {
    try {
      const response = await api.get('/api/notifications', {
        params: { unreadOnly, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get notifications by category
  getNotificationsByCategory: async (category: string): Promise<NotificationResponse> => {
    try {
      const response = await api.get(`/api/notifications/category/${category}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications by category:', error);
      throw error;
    }
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      return response.data.unreadCount;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<NotificationData> => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data.notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    try {
      await api.put('/api/notifications/mark-all-read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Dismiss notification
  dismissNotification: async (notificationId: string): Promise<NotificationData> => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/dismiss`);
      return response.data.notification;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  },

  // Get notification statistics
  getStats: async (): Promise<NotificationStats> => {
    try {
      const response = await api.get('/api/notifications/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  },

  // Create a new notification (Admin, ProjectManager, Client only)
  createNotification: async (data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    category?: string;
    priority?: string;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    projectId?: string;
  }): Promise<NotificationData> => {
    try {
      const response = await api.post('/api/notifications', data);
      return response.data.notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Create test notification (for development)
  createTestNotification: async (data: {
    title?: string;
    message?: string;
    type?: string;
    category?: string;
    priority?: string;
  }): Promise<NotificationData> => {
    try {
      const response = await api.post('/api/notifications/test', data);
      return response.data.notification;
    } catch (error) {
      console.error('Error creating test notification:', error);
      throw error;
    }
  },

  // Subscribe to real-time notification updates
  subscribeToUpdates: (callback: (notification: NotificationData) => void) => {
    // For now, we'll simulate real-time updates with polling
    // In a real app, you'd use WebSocket or Server-Sent Events
    const intervalId = setInterval(async () => {
      try {
        const response = await notificationService.getNotifications(true, 5);
        // Check if there are new notifications and call callback
        if (response.notifications.length > 0) {
          response.notifications.forEach(callback);
        }
      } catch (error) {
        console.error('Error in notification subscription:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  },

  // Local storage helpers for offline functionality
  cacheNotifications: (notifications: NotificationData[]) => {
    try {
      localStorage.setItem('cached_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error caching notifications:', error);
    }
  },

  getCachedNotifications: (): NotificationData[] => {
    try {
      const cached = localStorage.getItem('cached_notifications');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached notifications:', error);
      return [];
    }
  },

  clearCache: () => {
    try {
      localStorage.removeItem('cached_notifications');
    } catch (error) {
      console.error('Error clearing notification cache:', error);
    }
  },

  // Utility functions
  formatTimeAgo: (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
  },

  getNotificationIcon: (type: string) => {
    const iconMap = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      task: '📋',
      meeting: '📅',
      system: '⚙️',
      info: 'ℹ️'
    };
    return iconMap[type as keyof typeof iconMap] || 'ℹ️';
  },

  getNotificationColor: (type: string) => {
    const colorMap = {
      success: { bg: 'bg-green-900/10', border: 'border-l-green-500', text: 'text-green-400' },
      warning: { bg: 'bg-yellow-900/10', border: 'border-l-yellow-500', text: 'text-yellow-400' },
      error: { bg: 'bg-red-900/10', border: 'border-l-red-500', text: 'text-red-400' },
      task: { bg: 'bg-blue-900/10', border: 'border-l-blue-500', text: 'text-blue-400' },
      meeting: { bg: 'bg-purple-900/10', border: 'border-l-purple-500', text: 'text-purple-400' },
      system: { bg: 'bg-slate-900/10', border: 'border-l-slate-500', text: 'text-slate-400' },
      info: { bg: 'bg-blue-900/10', border: 'border-l-blue-500', text: 'text-blue-400' }
    };
    return colorMap[type as keyof typeof colorMap] || colorMap.info;
  },

  getPriorityColor: (priority: string) => {
    const priorityMap = {
      high: 'text-red-400',
      normal: 'text-yellow-400',
      low: 'text-green-400'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priorityMap.normal;
  }
};
