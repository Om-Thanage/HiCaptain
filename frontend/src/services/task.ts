import api from '@/lib/api';
import { Task, TaskRequest } from '@/types';

export const taskService = {
  async getAll(): Promise<Task[]> {
    const response = await api.get('/tasks');
    return response.data;
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async getByProjectId(projectId: string): Promise<Task[]> {
    console.log(`Fetching tasks for project: ${projectId}`);
    const response = await api.get(`/tasks/project/${projectId}`);
    console.log(`API response for project ${projectId}:`, response.data);
    return response.data || [];
  },

  async create(task: TaskRequest): Promise<Task> {
    // Validate required fields before sending
    if (!task.title?.trim()) {
      throw new Error('Task title is required');
    }
    if (!task.projectId) {
      throw new Error('Project ID is required');
    }

    // Transform frontend data to backend format
    const backendTask = {
      title: task.title.trim(),
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      deadline: task.deadline ? task.deadline : null, // Backend expects LocalDate, Spring will convert from ISO string
      projectId: task.projectId,
      assignedDeveloperIds: task.assignedDeveloperIds || [],
      // Add additional fields that backend expects
      assigneeId: task.assignedDeveloperIds?.[0] || null,
      createdBy: null, // Will be set by backend based on authentication
      category: null,
      estimatedHours: 0,
      actualHours: 0,
      progress: 0,
    };
    
    console.log('Creating task with data:', backendTask);
    
    const response = await api.post('/tasks', backendTask);
    console.log('Created task response:', response.data);
    return response.data;
  },

  async update(id: string, task: Partial<TaskRequest>): Promise<Task> {
    console.log('Updating task:', id, 'with data:', task);
    
    // For partial updates, we need to send only the fields that are being updated
    // The backend should merge these with existing data
    const backendTask: any = {};
    
    if (task.title !== undefined) backendTask.title = task.title;
    if (task.description !== undefined) backendTask.description = task.description;
    if (task.status !== undefined) backendTask.status = task.status;
    if (task.priority !== undefined) backendTask.priority = task.priority;
    if (task.deadline !== undefined) backendTask.deadline = task.deadline;
    if (task.projectId !== undefined) backendTask.projectId = task.projectId;
    if (task.assignedDeveloperIds !== undefined) {
      backendTask.assignedDeveloperIds = task.assignedDeveloperIds;
      backendTask.assigneeId = task.assignedDeveloperIds?.[0] || null;
    }
    
    console.log('Sending backend update:', backendTask);
    
    const response = await api.put(`/tasks/${id}`, backendTask);
    console.log('Backend update response:', response.data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  }
};