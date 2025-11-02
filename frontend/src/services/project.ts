import api from '@/lib/api';
import { Project } from '@/types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data;
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(project: Omit<Project, 'id'>): Promise<Project> {
    const response = await api.post('/projects', project);
    return response.data;
  },

  async update(id: string, project: Partial<Project>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, project);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async addDeveloper(projectId: string, developerId: string): Promise<Project> {
    const response = await api.post(`/projects/${projectId}/developers/${developerId}`);
    return response.data;
  }
};