'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateNotificationModal from '@/components/forms/CreateNotificationModal';
import { notificationService, NotificationData } from '@/services/notification';
import { authService } from '@/services/auth';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);

  // Load notifications on component mount
  useEffect(() => {
    // Get current user info
    const user = authService.getUserFromToken();
    setCurrentUser(user);
    
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

  // Check if user can create notifications (Admin, ProjectManager, Client)
  const canCreateNotification = currentUser && ['Admin', 'ProjectManager', 'Client'].includes(currentUser.role);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-80">
          <motion.div
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
                <span className="text-white/90">Notifications</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-1">
                Stay updated with your projects and tasks
              </p>
            </div>
            <motion.div
              className="flex items-center space-x-3"
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {canCreateNotification && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Notification
                </button>
              )}
              <button
                onClick={refreshNotifications}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-slate-900/70 border border-slate-700/60 backdrop-blur-md shadow-sm hover:shadow-lg text-slate-200 rounded-xl hover:bg-slate-700/50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={createTestNotification}
                className="inline-flex items-center px-4 py-2 bg-linear-to-r from-green-600/90 to-emerald-600/90 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Test Notification
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center px-4 py-2 bg-linear-to-r from-blue-600/90 to-indigo-600/90 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark All Read
                </button>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Bell className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-100">{notifications.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/20 p-3 rounded-xl">
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Unread</p>
                <p className="text-2xl font-bold text-slate-100">{currentUnreadCount}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">High Priority</p>
                <p className="text-2xl font-bold text-slate-100">{importantCount}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Today</p>
                <p className="text-2xl font-bold text-slate-100">
                  {notifications.filter(n => 
                    new Date(n.createdAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          className="flex items-center space-x-1 bg-slate-900/10 backdrop-blur-xl p-1 rounded-xl border border-white/20 w-fit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'unread' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Unread ({currentUnreadCount})
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'important' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Important ({importantCount})
          </button>
        </motion.div>

        {/* Notifications List */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => {
              const colors = notificationService.getNotificationColor(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  className={`bg-slate-900/10 backdrop-blur-xl rounded-2xl border border-white/20 border-l-4 p-6 transition-all hover:bg-slate-700/30 ${
                    colors.bg
                  } ${colors.border} ${!notification.isRead ? 'shadow-lg' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
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
                            <motion.div
                              className="w-2 h-2 bg-blue-500 rounded-full"
                              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
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
                </motion.div>
              );
            })
          ) : (
            <motion.div
              className="text-center py-12 bg-slate-900/10 backdrop-blur-xl rounded-2xl border border-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-medium text-slate-100">No notifications</h3>
              <p className="mt-2 text-slate-400">
                {filter === 'all' 
                  ? "You're all caught up! No notifications to show."
                  : `No ${filter} notifications found.`
                }
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <CreateNotificationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNotificationCreated={() => {
            setShowCreateModal(false);
            loadNotifications();
          }}
        />
      )}
    </DashboardLayout>
  );
}
