'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { projectService } from '@/services/project';
import { userService } from '@/services/user';
import { authService } from '@/services/auth';
import { Project, User } from '@/types';
import { ArrowLeft, Calendar, Users, AlertCircle, Search, UserCheck, Code } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  clientId: string;
  developerIds: string[];
  projectManagerId?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    clientId: '',
    developerIds: [],
    projectManagerId: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const u = authService.getUserFromToken();
        setCurrentUser(u);
        const allUsers = await userService.getAll();
        setUsers(allUsers);
        // If current user is a Project Manager, auto-assign as PM
        if (u?.role === 'ProjectManager') {
          setFormData(prev => ({ ...prev, projectManagerId: u.id }));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Get clients (users with Client role)
  const clients = users.filter(user => user.role === 'Client');
  
  // Get developers (users with Developer role)
  const developers = users.filter(user => user.role === 'Developer');
  
  // Get selected client info
  const selectedClient = clients.find(client => client.id === formData.clientId);
  
  // Get selected developers info
  const selectedDevelopers = developers.filter(dev => formData.developerIds.includes(dev.id));

  // Project Managers list (for Admin to select)
  const projectManagers = users.filter(user => user.role === 'ProjectManager');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID is required';
    }

    // For Admin, project manager selection is required
    if (currentUser?.role === 'Admin' && !formData.projectManagerId) {
      newErrors.projectManagerId = 'Project Manager is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const projectData: Omit<Project, 'id'> = {
        ...formData,
        status: 'pending',
        taskIds: [],
        feedbackIds: [],
        invoiceIds: [],
        meetingIds: [],
        paymentIds: [],
        timeLogIds: []
      };

      const newProject = await projectService.create(projectData);
      toast.success('Project created successfully!');
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addDeveloper = (developerId: string) => {
    if (developerId && !formData.developerIds.includes(developerId)) {
      setFormData(prev => ({
        ...prev,
        developerIds: [...prev.developerIds, developerId]
      }));
    }
  };

  const removeDeveloper = (developerId: string) => {
    setFormData(prev => ({
      ...prev,
      developerIds: prev.developerIds.filter(id => id !== developerId)
    }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Create New Project</h1>
            <p className="text-slate-400 mt-2">Add a new project to your workspace</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <UserCheck className="w-4 h-4 inline mr-2" />
                Select Client *
              </label>
              {loadingUsers ? (
                <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                  Loading clients...
                </div>
              ) : clients.length > 0 ? (
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} (ID: {client.id})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                  No clients found. Please register clients first.
                </div>
              )}
              {selectedClient && (
                <div className="mt-2 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">{selectedClient.name}</p>
                      <p className="text-slate-400 text-sm">Client ID: {selectedClient.id}</p>
                    </div>
                  </div>
                </div>
              )}
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.clientId}
                </p>
              )}
            </div>

            {/* Project Manager Selection (Admin only) */}
            {currentUser?.role === 'Admin' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Select Project Manager *
                </label>
                {loadingUsers ? (
                  <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                    Loading project managers...
                  </div>
                ) : projectManagers.length > 0 ? (
                  <select
                    value={formData.projectManagerId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectManagerId: e.target.value || undefined }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a project manager</option>
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} (ID: {pm.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                    No project managers found. Please register a project manager first.
                  </div>
                )}
                {errors.projectManagerId && (
                  <p className="mt-1 text-sm text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.projectManagerId}
                  </p>
                )}
              </div>
            )}

            {/* Developer Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Code className="w-4 h-4 inline mr-2" />
                Select Developers
              </label>
              {loadingUsers ? (
                <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                  Loading developers...
                </div>
              ) : developers.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-700 rounded-lg border border-slate-600">
                    {developers.map((developer) => (
                      <div key={developer.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`dev-${developer.id}`}
                          checked={formData.developerIds.includes(developer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              addDeveloper(developer.id);
                            } else {
                              removeDeveloper(developer.id);
                            }
                          }}
                          className="rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`dev-${developer.id}`} className="flex items-center space-x-3 cursor-pointer flex-1">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {developer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium">{developer.name}</p>
                            <p className="text-slate-400 text-sm">ID: {developer.id}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Selected Developers Summary */}
                  {selectedDevelopers.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-slate-300 mb-2">Selected Developers ({selectedDevelopers.length}):</p>
                      <div className="space-y-2">
                        {selectedDevelopers.map((developer) => (
                          <div key={developer.id} className="flex items-center justify-between bg-slate-600 px-3 py-2 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">
                                  {developer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-slate-200">{developer.name}</span>
                              <span className="text-slate-400 text-sm">({developer.id})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDeveloper(developer.id)}
                              className="text-red-400 hover:text-red-300 transition-colors text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                  No developers found. Please register developers first.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6">
              <Link
                href="/projects"
                className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}