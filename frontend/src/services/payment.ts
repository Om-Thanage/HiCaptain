import api from '@/lib/api';
import { Payment } from '@/types';

export const paymentService = {
  async getAll(): Promise<Payment[]> {
    const response = await api.get('/api/payments');
    return response.data;
  },

  async getById(id: string): Promise<Payment> {
    const response = await api.get(`/api/payments/${id}`);
    return response.data;
  },

  async create(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const response = await api.post('/api/payments', payment);
    return response.data;
  },

  async update(id: string, payment: Partial<Payment>): Promise<Payment> {
    const response = await api.put(`/api/payments/${id}`, payment);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/payments/${id}`);
  },

  async payInvoice(invoiceId: string, amount: number, clientId: string): Promise<Payment> {
    const payment = {
      amount,
      status: 'Completed',
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceId,
      clientId,
    };
    return this.create(payment);
  }
};

export default paymentService;