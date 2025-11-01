'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { notificationService, NotificationData } from '@/services/notification';
import { 
  Bell, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  FileText,
  Settings,
  Trash2,
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
    
    // Set up real-time subscription
    const unsubscribe = notificationService.subscribeToUpdates((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      if (!newNotification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
      toast.success(`New notification: ${newNotification.title}`);
    });

    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications(false, 100);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      
      // Cache notifications for offline access
      notificationService.cacheNotifications(response.notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      
      // Try to load from cache
      const cachedNotifications = notificationService.getCachedNotifications();
      if (cachedNotifications.length > 0) {
        setNotifications(cachedNotifications);
        toast('Showing cached notifications', { icon: 'ℹ️' });
      } else {
        // Fallback to mock data
        setNotifications([
          {
            id: '1',
            userId: 'user1',
            title: 'New Task Assignment',
            message: 'You have been assigned to work on "User Authentication Module"',
            type: 'task',
            category: 'work',
            source: 'system',
            priority: 'high',
            isRead: false,
            isDismissed: false,
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            relatedId: 'task-123'
          },
          {
            id: '2',
            userId: 'user1',
            title: 'Meeting Reminder',
            message: 'Sprint Planning Meeting starts in 30 minutes',
            type: 'meeting',
            category: 'meeting',
            source: 'calendar',
            priority: 'high',
            isRead: false,
            isDismissed: false,
            createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
          }
        ]);
        setUnreadCount(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
      toast.success('Notifications refreshed');
    } catch (error) {
      toast.error('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'task':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'meeting':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'payment':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'system':
        return <Settings className="w-5 h-5 text-slate-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await notificationService.dismissNotification(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      toast.success('Notification dismissed');
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  const createTestNotification = async () => {
    try {
      const testNotification = await notificationService.createTestNotification({
        title: 'Test Notification',
        message: 'This is a test notification created manually',
        type: 'info',
        category: 'test',
        priority: 'normal'
      });
      setNotifications(prev => [testNotification, ...prev]);
      if (!testNotification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
      toast.success('Test notification created');
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.isRead;
      case 'important':
        return notif.priority === 'high';
      default:
        return true;
    }
  });

  const currentUnreadCount = notifications.filter(n => !n.isRead).length;
  const importantCount = notifications.filter(n => n.priority === 'high').length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-800 rounded-lg p-6">
                <div className="h-6 bg-slate-700 rounded mb-2"></div>
                <div className="h-8 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Notifications</h1>
            <p className="text-slate-400 mt-2">Stay updated with your projects and tasks</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshNotifications}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={createTestNotification}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Test Notification
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-100">{notifications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Unread</p>
                <p className="text-2xl font-bold text-slate-100">{currentUnreadCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">High Priority</p>
                <p className="text-2xl font-bold text-slate-100">{importantCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Today</p>
                <p className="text-2xl font-bold text-slate-100">
                  {notifications.filter(n => 
                    new Date(n.createdAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'unread' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
            }`}
          >
            Unread ({currentUnreadCount})
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'important' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
            }`}
          >
            Important ({importantCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const colors = notificationService.getNotificationColor(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`bg-slate-800 rounded-lg border border-slate-700 border-l-4 p-6 transition-all hover:bg-slate-700/50 ${
                    colors.bg
                  } ${colors.border} ${!notification.isRead ? 'shadow-lg' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-base font-semibold ${
                            notification.isRead ? 'text-slate-300' : 'text-slate-100'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {notification.priority === 'high' && (
                            <div className="px-2 py-1 bg-red-900/20 text-red-300 text-xs rounded-full border border-red-800">
                              High Priority
                            </div>
                          )}
                        </div>
                        <p className={`mt-1 text-sm ${
                          notification.isRead ? 'text-slate-400' : 'text-slate-300'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-slate-500">
                            {notificationService.formatTimeAgo(notification.createdAt)}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            {notification.category}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            {notification.source}
                          </span>
                          {notification.relatedId && (
                            <span className="text-xs text-slate-500 flex items-center">
                              <FileText className="w-3 h-3 mr-1" />
                              {notification.relatedId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-medium text-slate-100">No notifications</h3>
              <p className="mt-2 text-slate-400">
                {filter === 'all' 
                  ? "You're all caught up! No notifications to show."
                  : `No ${filter} notifications found.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}