import api from '@/lib/api';

export interface SharedDrive { id: string; name: string }
export interface StorageConfiguration { driveId: string; driveName: string; connectedBy: string }
export interface DriveFile { id: string; name: string; mimeType: string; size: number; webViewLink: string }

const base = '/api/google-workspace';
export const googleWorkspaceService = {
  async sharedDrives(): Promise<SharedDrive[]> { return (await api.get(`${base}/drives`)).data; },
  async storage(): Promise<StorageConfiguration | null> { return (await api.get(`${base}/storage`)).data || null; },
  async selectDrive(driveId: string): Promise<StorageConfiguration> { return (await api.put(`${base}/storage`, { driveId })).data; },
  async files(projectId: string): Promise<DriveFile[]> { return (await api.get(`${base}/projects/${projectId}/files`)).data; },
  async upload(projectId: string, file: File): Promise<DriveFile> {
    const data = new FormData(); data.append('file', file);
    return (await api.post(`${base}/projects/${projectId}/files`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  async download(projectId: string, fileId: string): Promise<Blob> {
    return (await api.get(`${base}/projects/${projectId}/files/${fileId}/download`, { responseType: 'blob' })).data;
  },
  async delete(projectId: string, fileId: string): Promise<void> { await api.delete(`${base}/projects/${projectId}/files/${fileId}`); },
  async linkedTasks(projectId: string): Promise<string[]> { return (await api.get(`${base}/projects/${projectId}/google-tasks`)).data; },
  async copyTask(taskId: string): Promise<void> { await api.post(`${base}/tasks/${taskId}/copy-to-google`); },
};
