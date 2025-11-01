import api from '@/lib/api';
import { Invoice } from '@/types';

export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    const response = await api.get('/invoices');
    return response.data;
  },

  async getById(id: string): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  async getByProjectId(projectId: string): Promise<Invoice[]> {
    const response = await api.get(`/invoices/project/${projectId}`);
    return response.data;
  },

  async create(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const response = await api.post('/invoices', invoice);
    return response.data;
  },

  async update(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const response = await api.put(`/invoices/${id}`, invoice);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`);
  }
};