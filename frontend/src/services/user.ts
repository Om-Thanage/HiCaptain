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

  async update(id: string, user: Partial<User>): Promise<User> {
    const response = await api.put(`/users/${id}`, user);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
};