import api from '@/lib/api';
import { User } from '@/types';

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async getByRole(role: 'Admin' | 'ProjectManager' | 'Developer' | 'Client'): Promise<User[]> {
    const response = await api.get(`/users?role=${encodeURIComponent(role)}`);
    return response.data;
  },

  async getDevelopers(): Promise<User[]> {
    return this.getByRole('Developer');
  },

  async getById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    // Only send the specific fields that need to be updated
    const payload: any = {};
    
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.password !== undefined) payload.password = updates.password;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.projectIds !== undefined) payload.projectIds = updates.projectIds;
    if (updates.taskIds !== undefined) payload.taskIds = updates.taskIds;
    
    const response = await api.put(`/users/${id}`, payload);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
};