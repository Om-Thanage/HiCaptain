import api from '@/lib/api';
import { AuthRequest, AuthResponse, User } from '@/types';
import Cookies from 'js-cookie';

export const authService = {
  socialStartUrl(provider: 'google' | 'github', invitation?: string) {
    const base = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/auth/oauth/${provider}/start`;
    return invitation ? `${base}?invitation=${encodeURIComponent(invitation)}` : base;
  },

  async socialTicket(ticket: string): Promise<{ name: string; email: string; needsOrganization: boolean; invitedOrganization?: string }> {
    return (await api.get('/auth/oauth/ticket', { params: { ticket } })).data;
  },

  async socialExchange(ticket: string, organizationName?: string): Promise<AuthResponse> {
    return (await api.post('/auth/oauth/exchange', { ticket, organizationName })).data;
  },
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData: { name: string; email: string; password: string; organizationName: string }): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  setToken(token: string) {
    const expiry = this.getClaims<{ exp: number }>(token).exp;
    Cookies.set('token', token, { expires: new Date(expiry * 1000), sameSite: 'lax', secure: window.location.protocol === 'https:' });
    localStorage.setItem('token', token);
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (!token) return null;
    try {
      if (this.getClaims<{ exp: number }>(token).exp * 1000 > Date.now()) return token;
    } catch {}
    this.clearToken();
    return null;
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
        roles: payload.roles || [payload.role || 'Developer'],
        organizationId: payload.organizationId,
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
