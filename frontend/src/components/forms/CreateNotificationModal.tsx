'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, User, AlertCircle, Info, CheckCircle, AlertTriangle, FileText, Users, Calendar, Settings } from 'lucide-react';
import { notificationService } from '@/services/notification';
import { userService } from '@/services/user';
import { projectService } from '@/services/project';
import { User as UserType, Project } from '@/types';
import toast from 'react-hot-toast';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCreated: () => void;
}

interface NotificationFormData {
  userId: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  sourceType: string;
  sourceId: string;
  sourceUrl: string;
  projectId: string;
}

export default function CreateNotificationModal({ isOpen, onClose, onNotificationCreated }: CreateNotificationModalProps) {
  const [formData, setFormData] = useState<NotificationFormData>({
    userId: '',
    title: '',
    message: '',
    type: 'info',
    category: 'system',
    priority: 'normal',
    sourceType: 'manual',
    sourceId: '',
    sourceUrl: '',
    projectId: '',
  });
  
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [usersData, projectsData] = await Promise.all([
        userService.getAll(),
        projectService.getAll()
      ]);
      
      setUsers(usersData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userId || !formData.title || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const notificationData = {
        ...formData,
        sourceId: formData.sourceId || undefined,
        sourceUrl: formData.sourceUrl || undefined,
        projectId: formData.projectId || undefined,
      };

      await notificationService.createNotification(notificationData);
      toast.success('Notification sent successfully!');
      onNotificationCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      title: '',
      message: '',
      type: 'info',
      category: 'system',
      priority: 'normal',
      sourceType: 'manual',
      sourceId: '',
      sourceUrl: '',
      projectId: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
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

  const notificationTypes = [
    { value: 'info', label: 'Information', icon: 'Info' },
    { value: 'success', label: 'Success', icon: 'CheckCircle' },
    { value: 'warning', label: 'Warning', icon: 'AlertTriangle' },
    { value: 'error', label: 'Error', icon: 'AlertCircle' },
    { value: 'task', label: 'Task', icon: 'FileText' },
    { value: 'meeting', label: 'Meeting', icon: 'Calendar' },
    { value: 'system', label: 'System', icon: 'Settings' },
  ];

  const categories = [
    { value: 'system', label: 'System' },
    { value: 'task', label: 'Task' },
    { value: 'project', label: 'Project' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'reminder', label: 'Reminder' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-400' },
    { value: 'normal', label: 'Normal', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-red-400' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Bell className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Send Notification</h2>
                <p className="text-sm text-slate-400">Create and send a notification to a user</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-1">
                    <User className="w-4 h-4 inline mr-2" />
                    Recipient *
                  </label>
                  <select id="createnotificationmodal-forms-field-1"
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role}) - {user.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Title *
                  </label>
                  <input id="createnotificationmodal-forms-field-2"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter notification title"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-3">
                    Message *
                  </label>
                  <textarea id="createnotificationmodal-forms-field-3"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your notification message..."
                    required
                  />
                </div>

                {/* Type, Category, Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-4">
                      Type
                    </label>
                    <select id="createnotificationmodal-forms-field-4"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {notificationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-5">
                      Category
                    </label>
                    <select id="createnotificationmodal-forms-field-5"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-6">
                      Priority
                    </label>
                    <select id="createnotificationmodal-forms-field-6"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional: Project Association */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-7">
                    <Users className="w-4 h-4 inline mr-2" />
                    Related Project (Optional)
                  </label>
                  <select id="createnotificationmodal-forms-field-7"
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No project association</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional: Source URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="createnotificationmodal-forms-field-8">
                    Action URL (Optional)
                  </label>
                  <input id="createnotificationmodal-forms-field-8"
                    type="url"
                    name="sourceUrl"
                    value={formData.sourceUrl}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/action"
                  />
                  <p className="text-xs text-slate-500 mt-1">URL to navigate to when notification is clicked</p>
                </div>

                {/* Preview */}
                {formData.title && formData.message && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Preview:</h4>
                    <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getTypeIcon(formData.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-slate-100">{formData.title}</h5>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              formData.priority === 'high' ? 'bg-red-900/20 text-red-300' :
                              formData.priority === 'normal' ? 'bg-yellow-900/20 text-yellow-300' :
                              'bg-green-900/20 text-green-300'
                            }`}>
                              {formData.priority}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1">{formData.message}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-slate-500 capitalize">{formData.category}</span>
                            <span className="text-xs text-slate-500 capitalize">{formData.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Sending...' : 'Send Notification'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
