import api from '@/lib/api';
import { AuthRequest, AuthResponse, User } from '@/types';
import Cookies from 'js-cookie';

export const authService = {
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData: Omit<User, 'id'>): Promise<User> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  setToken(token: string) {
    Cookies.set('token', token, { expires: 7 }); // 7 days
    localStorage.setItem('token', token);
  },

  getToken(): string | null {
    return Cookies.get('token') || localStorage.getItem('token');
  },

  clearToken() {
    Cookies.remove('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  setUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout() {
    this.clearToken();
    window.location.href = '/login';
  }
};