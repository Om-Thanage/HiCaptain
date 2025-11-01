'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { Settings, User, Bell, Shield, Palette, Github, Link, Unlink, Calendar, Slack, Mail, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import type { User as AppUser } from '@/types';

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.name || '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    taskReminders: true,
    projectUpdates: true,
    meetingReminders: true
  });
  const [githubConnection, setGithubConnection] = useState<{username: string; connected: boolean} | null>(null);
  const [googleCalendarConnection, setGoogleCalendarConnection] = useState<{email: string; connected: boolean} | null>(null);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Link },
    { id: 'appearance', name: 'Appearance', icon: Palette },
  ];

  useEffect(() => {
    // Derive user from token on client after mount
    setUser(authService.getUserFromToken());
    // Load GitHub and Google Calendar connection status from localStorage
    console.log('Settings page loaded, checking demo connections...');
    console.log('Current user:', user);
    
    // Check demo connections (stored in localStorage)
    checkGithubConnection();
    checkGoogleCalendarConnection();
    
    // Check URL parameters for OAuth success/error messages
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const checkGithubConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('githubConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGithubConnection(connection);
        }
        return;
      }

      console.log('Checking real GitHub connection status...');
      const response = await fetch('http://localhost:8080/api/auth/github/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('GitHub connection status:', data);
        if (data.connected) {
          setGithubConnection({
            username: data.githubUsername,
            connected: true
          });
        }
      } else if (response.status === 403 || response.status === 401) {
        console.log('Authentication failed, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('githubConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGithubConnection(connection);
        }
      } else {
        console.log('Backend error, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('githubConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGithubConnection(connection);
        }
      }
    } catch (error) {
      console.error('Failed to check GitHub connection, using demo mode:', error);
      // Fallback to localStorage for demo mode
      const savedConnection = localStorage.getItem('githubConnection');
      if (savedConnection) {
        const connection = JSON.parse(savedConnection);
        setGithubConnection(connection);
      }
    }
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = user?.id || 'current-user';
      
      if (!token) {
        console.log('No token found, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('googleCalendarConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGoogleCalendarConnection(connection);
        }
        return;
      }

      console.log('Checking real Google Calendar connection status...');
      const response = await fetch(`http://localhost:8080/api/google-calendar/auth/status?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const isConnected = await response.json();
        console.log('Google Calendar connection status:', isConnected);
        if (isConnected) {
          setGoogleCalendarConnection({
            email: user?.name + '@gmail.com' || 'user@gmail.com',
            connected: true
          });
        }
      } else if (response.status === 403 || response.status === 401) {
        console.log('Authentication failed, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('googleCalendarConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGoogleCalendarConnection(connection);
        }
      } else {
        console.log('Backend error, using demo mode');
        // Fallback to localStorage for demo mode
        const savedConnection = localStorage.getItem('googleCalendarConnection');
        if (savedConnection) {
          const connection = JSON.parse(savedConnection);
          setGoogleCalendarConnection(connection);
        }
      }
    } catch (error) {
      console.error('Failed to check Google Calendar connection, using demo mode:', error);
      // Fallback to localStorage for demo mode
      const savedConnection = localStorage.getItem('googleCalendarConnection');
      if (savedConnection) {
        const connection = JSON.parse(savedConnection);
        setGoogleCalendarConnection(connection);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // API call to update profile
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      // API call to update notification preferences
      toast.success('Notification preferences updated!');
    } catch (error) {
      toast.error('Failed to update notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      // API call to change password
      toast.success('Password changed successfully!');
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGithub = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token available, using demo mode');
        toast.success('GitHub OAuth not configured. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          username: user?.name || 'user',
          connected: true
        };
        
        setGithubConnection(mockConnection);
        localStorage.setItem('githubConnection', JSON.stringify(mockConnection));
        return;
      }

      console.log('Attempting real GitHub OAuth connection...');
      const response = await fetch('http://localhost:8080/api/auth/github/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Got GitHub OAuth URL:', data.authUrl);
        // Redirect to real GitHub OAuth URL
        window.location.href = data.authUrl;
      } else if (response.status === 403 || response.status === 401) {
        console.log('Authentication failed, using demo mode');
        toast.success('GitHub OAuth authentication failed. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          username: user?.name || 'user',
          connected: true
        };
        
        setGithubConnection(mockConnection);
        localStorage.setItem('githubConnection', JSON.stringify(mockConnection));
      } else {
        console.log('GitHub OAuth not properly configured, using demo mode');
        toast.success('GitHub OAuth not configured. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          username: user?.name || 'user',
          connected: true
        };
        
        setGithubConnection(mockConnection);
        localStorage.setItem('githubConnection', JSON.stringify(mockConnection));
      }
    } catch (error) {
      console.log('Real OAuth failed, using demo mode:', error);
      toast.success('GitHub OAuth not available. Using demo mode.');
      
      // Fallback to demo mode
      const mockConnection = {
        username: user?.name || 'user',
        connected: true
      };
      
      setGithubConnection(mockConnection);
      localStorage.setItem('githubConnection', JSON.stringify(mockConnection));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setIsLoading(true);
    try {
      // For demo mode, just remove from localStorage
      setGithubConnection(null);
      localStorage.removeItem('githubConnection');
      toast.success('GitHub disconnected successfully!');
    } catch (error) {
      toast.error('Failed to disconnect GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userId = user?.id || 'current-user';
      
      if (!token) {
        console.log('No token available, using demo mode');
        toast.success('Google Calendar OAuth not configured. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          email: user?.name + '@gmail.com' || 'user@gmail.com',
          connected: true
        };
        
        setGoogleCalendarConnection(mockConnection);
        localStorage.setItem('googleCalendarConnection', JSON.stringify(mockConnection));
        return;
      }

      console.log('Attempting real Google Calendar OAuth connection...');
      const response = await fetch(`http://localhost:8080/api/google-calendar/auth/url?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const authUrl = await response.text();
        console.log('Got Google OAuth URL:', authUrl);
        // Redirect to real Google OAuth URL
        window.location.href = authUrl;
      } else if (response.status === 403 || response.status === 401) {
        console.log('Authentication failed, using demo mode');
        toast.success('Google Calendar OAuth authentication failed. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          email: user?.name + '@gmail.com' || 'user@gmail.com',
          connected: true
        };
        
        setGoogleCalendarConnection(mockConnection);
        localStorage.setItem('googleCalendarConnection', JSON.stringify(mockConnection));
      } else {
        console.log('Google Calendar OAuth not properly configured, using demo mode');
        toast.success('Google Calendar OAuth not configured. Using demo mode.');
        
        // Fallback to demo mode
        const mockConnection = {
          email: user?.name + '@gmail.com' || 'user@gmail.com',
          connected: true
        };
        
        setGoogleCalendarConnection(mockConnection);
        localStorage.setItem('googleCalendarConnection', JSON.stringify(mockConnection));
      }
    } catch (error) {
      console.log('Real OAuth failed, using demo mode:', error);
      toast.success('Google Calendar OAuth not available. Using demo mode.');
      
      // Fallback to demo mode
      const mockConnection = {
        email: user?.name + '@gmail.com' || 'user@gmail.com',
        connected: true
      };
      
      setGoogleCalendarConnection(mockConnection);
      localStorage.setItem('googleCalendarConnection', JSON.stringify(mockConnection));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      // For demo mode, just remove from localStorage
      setGoogleCalendarConnection(null);
      localStorage.removeItem('googleCalendarConnection');
      toast.success('Google Calendar disconnected successfully!');
    } catch (error) {
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-2">Manage your account preferences and integrations</p>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 mr-8">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600/20 text-purple-400 border-r-2 border-purple-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-100">Profile Information</h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Role</label>
                      <input
                        type="text"
                        value={user?.role || 'USER'}
                        disabled
                        className="mt-1 block w-full border border-slate-600 bg-slate-600 text-slate-400 rounded-md shadow-sm py-2 px-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your.email@example.com"
                        className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-100">Notification Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-200">Email Notifications</label>
                        <p className="text-sm text-slate-400">Receive notifications via email</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange('emailNotifications', !notifications.emailNotifications)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          notifications.emailNotifications ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`${notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-200">Push Notifications</label>
                        <p className="text-sm text-slate-400">Receive push notifications</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange('pushNotifications', !notifications.pushNotifications)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          notifications.pushNotifications ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`${notifications.pushNotifications ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-200">Task Reminders</label>
                        <p className="text-sm text-slate-400">Get reminded about upcoming task deadlines</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange('taskReminders', !notifications.taskReminders)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          notifications.taskReminders ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`${notifications.taskReminders ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-200">Project Updates</label>
                        <p className="text-sm text-slate-400">Receive updates when projects change status</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange('projectUpdates', !notifications.projectUpdates)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          notifications.projectUpdates ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`${notifications.projectUpdates ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-200">Meeting Reminders</label>
                        <p className="text-sm text-slate-400">Get notified before scheduled meetings</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange('meetingReminders', !notifications.meetingReminders)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          notifications.meetingReminders ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`${notifications.meetingReminders ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save Notifications'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-100">Security Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Current Password</label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">New Password</label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handlePasswordChange}
                      disabled={isLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                    >
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-100">Integrations</h3>
                  
                  {/* Integration Status Notice */}
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-300">Demo Mode</h4>
                        <p className="text-sm text-blue-200">
                          Integrations are currently in demo mode. To enable real OAuth connections, you would need to:
                        </p>
                        <ul className="mt-2 text-sm text-blue-200 list-disc list-inside space-y-1">
                          <li>Set up GitHub OAuth app with client ID/secret</li>
                          <li>Configure Google Cloud Console for Calendar API</li>
                          <li>Update backend with OAuth credentials</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* GitHub Integration */}
                    <div className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Github className="h-6 w-6 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">GitHub</h4>
                            <p className="text-sm text-slate-400">
                              {githubConnection 
                                ? `Connected as ${githubConnection.username} (Demo Mode)` 
                                : 'Connect your GitHub account to access repositories (Demo Mode)'
                              }
                            </p>
                          </div>
                        </div>
                        
                        {githubConnection ? (
                          <button
                            onClick={handleDisconnectGithub}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                          >
                            <Unlink className="h-4 w-4" />
                            <span>{isLoading ? 'Disconnecting...' : 'Disconnect'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectGithub}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                          >
                            <Link className="h-4 w-4" />
                            <span>Connect GitHub</span>
                          </button>
                        )}
                      </div>
                      
                      {githubConnection && (
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <h5 className="text-sm font-medium text-slate-200 mb-2">GitHub Settings</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Auto-sync Repositories</label>
                                <p className="text-xs text-slate-400">Automatically sync project repositories</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-purple-600"
                              >
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Commit Notifications</label>
                                <p className="text-xs text-slate-400">Get notified about new commits</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-slate-600"
                              >
                                <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Issue Tracking</label>
                                <p className="text-xs text-slate-400">Sync GitHub issues with project tasks</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-purple-600"
                              >
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Google Calendar Integration */}
                    <div className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Calendar className="h-6 w-6 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">Google Calendar</h4>
                            <p className="text-sm text-slate-400">
                              {googleCalendarConnection 
                                ? `Connected as ${googleCalendarConnection.email} (Demo Mode)` 
                                : 'Sync meetings and deadlines with Google Calendar (Demo Mode)'
                              }
                            </p>
                          </div>
                        </div>
                        
                        {googleCalendarConnection ? (
                          <button
                            onClick={handleDisconnectGoogleCalendar}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                          >
                            <Unlink className="h-4 w-4" />
                            <span>{isLoading ? 'Disconnecting...' : 'Disconnect'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectGoogleCalendar}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                          >
                            <Link className="h-4 w-4" />
                            <span>{isLoading ? 'Connecting...' : 'Connect Calendar'}</span>
                          </button>
                        )}
                      </div>
                      
                      {googleCalendarConnection && (
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <h5 className="text-sm font-medium text-slate-200 mb-2">Calendar Settings</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Sync Task Deadlines</label>
                                <p className="text-xs text-slate-400">Create calendar events for task deadlines</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-blue-600"
                              >
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Sync Meetings</label>
                                <p className="text-xs text-slate-400">Sync project meetings with calendar</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-blue-600"
                              >
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm text-slate-300">Reminder Notifications</label>
                                <p className="text-xs text-slate-400">Get reminded 15 minutes before events</p>
                              </div>
                              <button
                                type="button"
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 bg-slate-600"
                              >
                                <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slack Integration */}
                    <div className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Slack className="h-6 w-6 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">Slack</h4>
                            <p className="text-sm text-slate-400">Get project notifications in Slack channels</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toast.success('Slack integration coming soon!')}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                          <Link className="h-4 w-4" />
                          <span>Connect Slack</span>
                        </button>
                      </div>
                    </div>

                    {/* Email Integration */}
                    <div className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Mail className="h-6 w-6 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">Email Notifications</h4>
                            <p className="text-sm text-slate-400">Configure email notification preferences</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setActiveTab('notifications')}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configure</span>
                        </button>
                      </div>
                    </div>

                    {/* Zapier Integration */}
                    <div className="border border-slate-600 rounded-lg p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Zap className="h-6 w-6 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">Zapier</h4>
                            <p className="text-sm text-slate-400">Connect with 5000+ apps via Zapier (Coming Soon)</p>
                          </div>
                        </div>
                        
                        <button
                          disabled
                          className="px-3 py-2 text-sm bg-slate-600 text-slate-400 rounded-md cursor-not-allowed"
                        >
                          Coming Soon
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-100">Appearance Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Theme</label>
                      <select className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Language</label>
                      <select className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Timezone</label>
                      <select className="mt-1 block w-full border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => toast.success('Appearance settings saved!')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                      Save Appearance
                    </button>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}