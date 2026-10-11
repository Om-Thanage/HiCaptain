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
    if (typeof window === 'undefined') return null;
    return Cookies.get('token') || localStorage.getItem('token');
  },

  clearToken() {
    Cookies.remove('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // DERIVED USER (decode from JWT)
  getUserFromToken(): User | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = this.getClaims(token);
      const user: User = {
        id: payload.userId || '',
        name: payload.sub || '',
        role: payload.role || 'Developer',
        email: payload.email || '',
        taskIds: [],
      };
      return user;
    } catch {
      return null;
    }
  },

  getClaims<T = any>(token?: string): T {
    const t = token || this.getToken();
    if (!t) throw new Error('No token');
    const base64Url = t.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  },

  logout() {
    this.clearToken();
    window.location.href = '/auth?mode=login';
  }
};
