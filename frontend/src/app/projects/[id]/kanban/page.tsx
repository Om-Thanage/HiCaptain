'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { taskService } from '@/services/task';
import { projectService } from '@/services/project';
import { userService } from '@/services/user';
import { Task, TaskRequest, Project, User } from '@/types';
import { ArrowLeft, Plus, Calendar, User as UserIcon, Filter, Search, MoreVertical, Edit, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'pending', title: 'To Do', color: 'border-slate-600 bg-slate-800/50', textColor: 'text-slate-300' },
  { id: 'in-progress', title: 'In Progress', color: 'border-blue-600 bg-blue-900/20', textColor: 'text-blue-300' },
  { id: 'completed', title: 'Completed', color: 'border-green-600 bg-green-900/20', textColor: 'text-green-300' },
];

export default function ProjectKanbanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [projectDevelopers, setProjectDevelopers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);

  // Helper function to transform backend task data to frontend format
  const transformBackendTask = (task: any): Task => {
    if (!task) {
      console.error('transformBackendTask received null/undefined task');
      return {} as Task;
    }
    
    console.log('Transforming backend task:', task);
    
    // Normalize backend status values to the three Kanban columns
    const normalizeStatus = (value: string | undefined | null): string => {
      const raw = String(value || '').trim().toLowerCase();
      // Common variants -> canonical values used in COLUMNS ids
      const normalized = raw
        .replace(/[_\s]+/g, '-') // in_progress -> in-progress, "in progress" -> in-progress
        .replace(/^to-do$/g, 'todo') // unify to-do
        .replace(/^inprogress$/g, 'in-progress'); // handle missing separator

      if (normalized === 'todo') return 'pending';
      if (['in-progress', 'inprogress'].includes(normalized)) return 'in-progress';
      if (['done', 'complete', 'completed'].includes(normalized)) return 'completed';
      if (['on-hold', 'paused', 'blocked'].includes(normalized)) return 'pending';

      // If already one of our columns, keep it; else default to pending
      return ['pending', 'in-progress', 'completed'].includes(normalized)
        ? normalized
        : 'pending';
    };

    // Normalize priority variants (in case backend sends different casing/words)
    const normalizePriority = (value: string | undefined | null): string => {
      const raw = String(value || '').trim().toLowerCase();
      if (['high', 'urgent', 'critical'].includes(raw)) return 'high';
      if (['medium', 'normal'].includes(raw)) return 'medium';
      if (['low', 'minor'].includes(raw)) return 'low';
      return 'medium';
    };
    
    const transformed = {
      // Handle MongoDB _id field
      id: task.id || task._id || '',
      title: task.title || 'Untitled Task',
      description: task.description || '',
  status: normalizeStatus(task.status),
  priority: normalizePriority(task.priority),
      projectId: task.projectId || projectId,
      // Handle different date formats from backend
      deadline: Array.isArray(task.deadline) 
        ? `${task.deadline[0]}-${String(task.deadline[1]).padStart(2, '0')}-${String(task.deadline[2]).padStart(2, '0')}`
        : task.deadline || '',
      assignedDeveloperIds: task.assignedDeveloperIds || [],
      // Additional backend fields
      assigneeId: task.assigneeId || undefined,
      createdBy: task.createdBy || undefined,
      category: task.category || undefined,
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      progress: task.progress || 0,
      // Handle createdAt and updatedAt if they exist
      createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
      updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined,
    };
    
    console.log('Transformed task result:', transformed);
    
    // Validate the transformed task
    if (!transformed.id) {
      console.error('Transformed task missing ID:', { original: task, transformed });
    }
    if (!transformed.title) {
      console.warn('Transformed task missing title:', { original: task, transformed });
    }
    
    return transformed;
  };

  // Helper function to get developer names from IDs
  const getDeveloperNames = (developerIds: string[]): string[] => {
    if (!developerIds || developerIds.length === 0) return [];
    return developerIds.map(id => {
      if (!id) return 'Unknown Developer';
      const developer = projectDevelopers.find(dev => dev?.id === id);
      return developer?.name || `Developer ${id}`;
    });
  };

  // Helper function to validate if a developer can be assigned to this project
  const isValidDeveloperForProject = (developerId: string): boolean => {
    if (!developerId || !project?.developerIds) return false;
    return project.developerIds.includes(developerId);
  };
  const [newTask, setNewTask] = useState<TaskRequest>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    deadline: '',
    projectId: projectId,
    assignedDeveloperIds: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching data for project: ${projectId}`);
        
        // Fetch project details and tasks in parallel
        const [projectData, tasksData] = await Promise.all([
          projectService.getById(projectId),
          taskService.getByProjectId(projectId)
        ]);
        
        console.log('Received project data:', projectData);
        console.log('Raw tasks from backend:', tasksData);
        console.log('Number of tasks received:', tasksData?.length || 0);
        
        setProject(projectData);
        
        // Fetch developers who are assigned to this project
        if (projectData.developerIds && projectData.developerIds.length > 0) {
          try {
            const allUsers = await userService.getAll();
            const developers = allUsers.filter(user => 
              projectData.developerIds.includes(user.id) && user.role === 'Developer'
            );
            setProjectDevelopers(developers);
            console.log('Project developers:', developers);
          } catch (error) {
            console.error('Error fetching developers:', error);
            setProjectDevelopers([]);
          }
        } else {
          setProjectDevelopers([]);
        }
        
        // Transform backend data to match frontend expectations
        const transformedTasks = tasksData.map(transformBackendTask);
        console.log('Transformed tasks:', transformedTasks);
        
        setTasks(transformedTasks);
        setApiConnected(true);
        setLastFetchError(null);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        
        setApiConnected(false);
        setLastFetchError(error.response?.data?.message || error.message || 'Failed to connect to backend');
        
        // More specific error messages
        if (error.response?.status === 401) {
          toast.error('Authentication failed - please log in again');
        } else if (error.response?.status === 403) {
          toast.error('Access denied - insufficient permissions');
        } else if (error.response?.status === 404) {
          toast.error('Project not found');
        } else {
          toast.error(`Failed to fetch project data: ${error.response?.status || 'Network Error'}`);
        }
        
        setTasks([]);
        setProject(null);
        setProjectDevelopers([]);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const handleRefreshTasks = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Refresh both project and tasks data
      const [projectData, tasksData] = await Promise.all([
        projectService.getById(projectId),
        taskService.getByProjectId(projectId)
      ]);
      
      setProject(projectData);
      
      // Update developers list
      if (projectData.developerIds && projectData.developerIds.length > 0) {
        try {
          const allUsers = await userService.getAll();
          const developers = allUsers.filter(user => 
            projectData.developerIds.includes(user.id) && user.role === 'Developer'
          );
          setProjectDevelopers(developers);
        } catch (error) {
          console.error('Error refreshing developers:', error);
        }
      } else {
        setProjectDevelopers([]);
      }
      
      // Transform backend data to match frontend expectations
      const transformedTasks = tasksData.map(transformBackendTask);
      
      setTasks(transformedTasks);
      setApiConnected(true);
      setLastFetchError(null);
      toast.success('Data refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setApiConnected(false);
      setLastFetchError(error.message || 'Failed to connect to backend');
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Safely handle null/undefined values
      const title = task.title || '';
      const description = task.description || '';
      const priority = task.priority || '';
      
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === '' || priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  };

  const getTasksByStatus = (status: string) => {
    return getFilteredTasks().filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    if (!priority) return 'border-l-4 border-slate-500';
    switch (priority.toLowerCase()) {
      case 'high':
        return 'border-l-4 border-red-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-green-500';
      default:
        return 'border-l-4 border-slate-500';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    if (!priority) return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300';
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No deadline';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const isOverdue = (deadline: string, status: string) => {
    if (!deadline || status === 'completed') return false;
    try {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      return deadlineDate < today;
    } catch (error) {
      return false;
    }
  };

  const handleAddTask = async () => {
    try {
      // Validate required fields
      if (!newTask.title.trim()) {
        toast.error('Task title is required');
        return;
      }

      // Validate that assigned developers are part of this project
      if (newTask.assignedDeveloperIds && newTask.assignedDeveloperIds.length > 0) {
        const invalidDevelopers = newTask.assignedDeveloperIds.filter(
          devId => devId && !isValidDeveloperForProject(devId)
        );
        if (invalidDevelopers.length > 0) {
          toast.error('Cannot assign task to developers not working on this project');
          return;
        }
      }

      // Prepare task data for backend
      const taskData = {
        ...newTask,
        // Ensure deadline is in proper format for backend
        deadline: newTask.deadline || new Date().toISOString().split('T')[0],
        assignedDeveloperIds: newTask.assignedDeveloperIds || [],
      };

      const createdTask = await taskService.create(taskData);
      
      // Transform the response if needed
      const transformedTask = transformBackendTask(createdTask);

      setTasks([...tasks, transformedTask]);
      setShowAddTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        deadline: '',
        projectId: projectId,
        assignedDeveloperIds: [],
      });
      toast.success('Task created successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create tasks.');
      } else if (error.response?.data?.message) {
        toast.error(`Failed to create task: ${error.response.data.message}`);
      } else {
        toast.error('Failed to create task. Please check your connection and try again.');
      }
      
      setApiConnected(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Find the current task to validate and preserve its data
      const currentTask = tasks.find(task => task?.id === taskId);
      if (!currentTask) {
        toast.error('Task not found');
        return;
      }

      if (currentTask.assignedDeveloperIds && currentTask.assignedDeveloperIds.length > 0) {
        const invalidDevelopers = currentTask.assignedDeveloperIds.filter(
          devId => devId && !isValidDeveloperForProject(devId)
        );
        if (invalidDevelopers.length > 0) {
          toast.error('Task has developers not assigned to this project. Please reassign first.');
          return;
        }
      }

      console.log('Updating task status:', { taskId, newStatus, currentTask });

      // Optimistically update the UI first
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      // Send the update to backend
      const updatedTask = await taskService.update(taskId, { status: newStatus });
      console.log('Backend update response:', updatedTask);
      
      // Transform the response and update with backend data
      const transformedTask = transformBackendTask(updatedTask);
      console.log('Transformed task:', transformedTask);

      // Update with the actual backend response
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            // Ensure we don't lose critical data during transformation
            const finalTask = {
              ...task, // Keep existing data as fallback
              ...transformedTask, // Apply backend updates
              id: task.id || transformedTask.id, // Ensure ID is preserved
            };
            console.log('Final merged task:', finalTask);
            return finalTask;
          }
          return task;
        });
        
        console.log('Updated tasks state:', updatedTasks);
        return updatedTasks;
      });
      
      toast.success('Task status updated');
    } catch (error: any) {
      console.error('Error updating task:', error);
      
      // Revert the optimistic update on error by refreshing from backend
      console.log('Reverting optimistic update for task:', taskId, 'by refreshing data');
      handleRefreshTasks();
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to update tasks.');
      } else if (error.response?.status === 404) {
        toast.error('Task not found.');
      } else {
        toast.error('Failed to update task status. Please try again.');
      }
      
      setApiConnected(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskService.delete(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete tasks.');
      } else if (error.response?.status === 404) {
        toast.error('Task not found.');
      } else {
        toast.error('Failed to delete task. Please try again.');
      }
      
      setApiConnected(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    console.log('Drag started for task:', taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    console.log('Task dropped:', { taskId, newStatus });
    
    const taskBeforeDrop = tasks.find(task => task.id === taskId);
    console.log('Task before drop:', taskBeforeDrop);
    
    handleUpdateTaskStatus(taskId, newStatus);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">
                {project ? `${project.name} - Kanban Board` : 'Kanban Board'}
              </h1>
              <p className="text-slate-400 mt-2">
                {project 
                  ? `Manage tasks for ${project.name} with ${projectDevelopers.length} developers`
                  : 'Manage project tasks visually'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleRefreshTasks}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={() => setShowAddTaskModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* No Tasks Found Notice */}
        {apiConnected && tasks.length === 0 && !loading && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div>
                <p className="text-yellow-400 font-medium">No Tasks Found</p>
                <p className="text-yellow-300 text-sm mt-1">
                  Backend connection is working, but no tasks were returned for project: {projectId}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Check if tasks exist in MongoDB for this project ID, or create a new task to get started.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Connection Error Notice */}
        {!apiConnected && lastFetchError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-red-400 font-medium">Backend Connection Failed</p>
                  <p className="text-red-300 text-sm mt-1">{lastFetchError}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Make sure the backend server is running on http://localhost:8080 and you're authenticated.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRefreshTasks}
                className="px-3 py-1 bg-red-700 text-red-100 rounded text-sm hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-400">
              {getFilteredTasks().length} tasks
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${apiConnected ? 'text-green-400' : 'text-red-400'}`}>
                {apiConnected ? 'Backend Connected' : 'Backend Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            
            return (
              <div 
                key={column.id} 
                className={`rounded-lg border-2 border-dashed ${column.color} p-4 min-h-96`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${column.textColor}`}>{column.title}</h3>
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-slate-400 bg-slate-700 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`bg-slate-800 rounded-lg shadow-sm border border-slate-600 p-4 hover:shadow-md hover:border-slate-500 transition-all duration-200 cursor-move ${getPriorityColor(task.priority)} group`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-100 flex-1">{task.title || 'Untitled Task'}</h4>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors duration-200"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors duration-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {task.description || 'No description provided'}
                      </p>
                      
                      {/* Warning for invalid developer assignments */}
                      {task.assignedDeveloperIds.length > 0 && 
                       task.assignedDeveloperIds.some(devId => !isValidDeveloperForProject(devId)) && (
                        <div className="mb-2 text-xs text-orange-400 bg-orange-900/20 border border-orange-700 rounded px-2 py-1">
                          ⚠️ Some assigned developers are not part of this project
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${getPriorityBadgeColor(task.priority || 'medium')}`}>
                          {task.priority || 'medium'}
                        </span>
                        <div className={`flex items-center ${isOverdue(task.deadline, task.status || 'pending') ? 'text-red-400' : 'text-slate-500'}`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(task.deadline)}
                          {isOverdue(task.deadline, task.status || 'pending') && (
                            <span className="ml-1 text-red-400 font-medium">Overdue</span>
                          )}
                        </div>
                      </div>

                      {task.assignedDeveloperIds.length > 0 && (
                        <div className="flex items-center mt-2 text-xs text-slate-500">
                          <UserIcon className="w-3 h-3 mr-1" />
                          <div className="flex flex-wrap gap-1">
                            {getDeveloperNames(task.assignedDeveloperIds).map((name, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full bg-blue-900/20 text-blue-300 border border-blue-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">No tasks in {column.title}</p>
                      <p className="text-xs mt-1">
                        {tasks.length === 0 
                          ? (apiConnected 
                            ? "No tasks found for this project. Create your first task to get started!" 
                            : "Cannot load tasks - check connection")
                          : "Drag tasks here or create new ones"
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Add Task Button for Column */}
                <button 
                  onClick={() => {
                    setNewTask({...newTask, status: column.id});
                    setShowAddTaskModal(true);
                  }}
                  className="w-full mt-3 p-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Task</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Task Distribution</h3>
            {project && (
              <div className="text-sm text-slate-400">
                Project: <span className="text-slate-300">{project.name}</span> | 
                Developers: <span className="text-blue-300">{projectDevelopers.length}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              const totalTasks = getFilteredTasks().length;
              const percentage = totalTasks > 0 ? Math.round((columnTasks.length / totalTasks) * 100) : 0;
              
              return (
                <div key={column.id} className="text-center p-4 bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-slate-100">{columnTasks.length}</div>
                  <div className="text-sm text-slate-300">{column.title}</div>
                  <div className="text-xs text-slate-500">{percentage}%</div>
                  <div className="mt-2 w-full bg-slate-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        column.id === 'pending' ? 'bg-slate-400' :
                        column.id === 'in-progress' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-600">
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">
                {getFilteredTasks().filter(task => isOverdue(task?.deadline, task?.status)).length}
              </div>
              <div className="text-xs text-slate-400">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-300">
                {getFilteredTasks().filter(task => task?.priority === 'high').length}
              </div>
              <div className="text-xs text-slate-400">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-300">
                {getFilteredTasks().filter(task => task?.priority === 'medium').length}
              </div>
              <div className="text-xs text-slate-400">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-300">
                {getFilteredTasks().filter(task => task?.priority === 'low').length}
              </div>
              <div className="text-xs text-slate-400">Low Priority</div>
            </div>
          </div>

          {/* Project Developers Section */}
          {projectDevelopers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">Project Developers</h4>
                <span className="text-xs text-slate-500">{projectDevelopers.length} assigned</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectDevelopers.map((developer) => {
                  const developerTaskCount = tasks.filter(task => 
                    task?.assignedDeveloperIds?.includes(developer?.id)
                  ).length;
                  
                  return (
                    <div 
                      key={developer.id}
                      className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2 text-sm"
                    >
                      <UserIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-200">{developer.name}</span>
                      <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                        {developerTaskCount} tasks
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Add New Task</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Assign Developers ({projectDevelopers.length} available)
                  </label>
                  {projectDevelopers.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {projectDevelopers.map((developer) => (
                        <label 
                          key={developer.id} 
                          className="flex items-center space-x-2 text-sm text-slate-300 hover:bg-slate-600 p-2 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newTask.assignedDeveloperIds.includes(developer.id)}
                            onChange={(e) => {
                              const devIds = newTask.assignedDeveloperIds;
                              if (e.target.checked) {
                                setNewTask({
                                  ...newTask, 
                                  assignedDeveloperIds: [...devIds, developer.id]
                                });
                              } else {
                                setNewTask({
                                  ...newTask, 
                                  assignedDeveloperIds: devIds.filter(id => id !== developer.id)
                                });
                              }
                            }}
                            className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <UserIcon className="w-4 h-4" />
                          <span>{developer.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 p-3 bg-slate-700 rounded-lg">
                      No developers assigned to this project yet. 
                      {project && (
                        <div className="mt-1 text-xs">
                          Project: {project.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTask.title}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}