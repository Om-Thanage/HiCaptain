import api from '@/lib/api';

export interface DriveFolder { id: string; name: string; webViewLink: string }
export interface FolderConfiguration { folderId: string; folderName: string; folderUrl: string; connectedBy: string }
export interface DriveFile { id: string; name: string; mimeType: string; size: number; webViewLink: string }

const base = '/api/google-workspace';
export const googleWorkspaceService = {
  async folders(parentId?: string): Promise<DriveFolder[]> { return (await api.get(`${base}/folders`, { params: parentId ? { parentId } : {} })).data; },
  async projectFolder(projectId: string): Promise<FolderConfiguration | null> { return (await api.get(`${base}/projects/${projectId}/folder`)).data || null; },
  async selectFolder(projectId: string, folderId: string): Promise<FolderConfiguration> { return (await api.put(`${base}/projects/${projectId}/folder`, { folderId })).data; },
  async syncFolderSharing(projectId: string): Promise<FolderConfiguration> { return (await api.post(`${base}/projects/${projectId}/folder/share`)).data; },
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
