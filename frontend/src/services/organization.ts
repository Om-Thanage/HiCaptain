import api from '@/lib/api';
import { AuthResponse, Role } from '@/types';

export interface Organization { id: string; name: string; roles: Role[] }
export interface Member { id: string; name: string; email: string; roles: Role[] }
export interface Invitation { email: string; organizationName: string; roles: Role[]; added: boolean; projectIds?: string[]; projectRole?: Role }

export const organizationService = {
  async list(): Promise<Organization[]> { return (await api.get('/organizations')).data; },
  async create(name: string): Promise<AuthResponse> { return (await api.post('/organizations', { name })).data; },
  async switchTo(id: string): Promise<AuthResponse> { return (await api.post(`/organizations/${id}/switch`)).data; },
  async members(id: string): Promise<Member[]> { return (await api.get(`/organizations/${id}/members`)).data; },
  async invite(id: string, email: string, roles: Role[], projectIds: string[] = [], projectRole?: Role): Promise<Invitation> { return (await api.post(`/organizations/${id}/invitations`, { email, roles, projectIds, projectRole })).data; },
  async setRoles(id: string, userId: string, roles: Role[]): Promise<void> { await api.put(`/organizations/${id}/members/${userId}/roles`, { roles }); },
  async remove(id: string, userId: string): Promise<void> { await api.delete(`/organizations/${id}/members/${userId}`); },
  async preview(token: string): Promise<Invitation> { return (await api.get('/auth/invitations/preview', { params: { token } })).data; },
  async registerInvited(token: string, email: string, password: string): Promise<AuthResponse> {
    return (await api.post('/auth/invitations/register', { token, email, password })).data;
  },
  async accept(token: string): Promise<AuthResponse> { return (await api.post('/organizations/invitations/accept', { token })).data; },
};
