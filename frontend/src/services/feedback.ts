import api from '@/lib/api';
import { Feedback } from '@/types';

export const feedbackService = {
  async getAll(): Promise<Feedback[]> {
    const response = await api.get('/feedback');
    return response.data;
  },

  async getById(id: string): Promise<Feedback> {
    const response = await api.get(`/feedback/${id}`);
    return response.data;
  },

  async getByProjectId(projectId: string): Promise<Feedback[]> {
    const response = await api.get(`/feedback/project/${projectId}`);
    return response.data;
  },

  async create(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    const response = await api.post('/feedback', feedback);
    return response.data;
  },

  async update(id: string, feedback: Partial<Feedback>): Promise<Feedback> {
    const response = await api.put(`/feedback/${id}`, feedback);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/feedback/${id}`);
  }
};