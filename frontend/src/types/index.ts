export type Role = 'Admin' | 'ProjectManager' | 'Developer' | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  roles?: Role[];
  organizationId?: string;
  projectIds?: string[];
  taskIds: string[];
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
  organizationId: string;
  roles: Role[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  clientId: string;
  projectManagerId?: string;
  developerIds: string[];
  taskIds: string[];
  createdBy?: string;
  feedbackIds: string[];
  meetingIds: string[];
  timeLogIds: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  projectId: string;
  assignedDeveloperIds: string[];
  // Additional fields from backend
  assigneeId?: string;
  createdBy?: string;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskRequest {
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  projectId: string;
  assignedDeveloperIds: string[];
}

export interface Feedback {
  id: string;
  content: string;
  rating: number;
  projectId: string;
  clientId: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  duration: number;
  projectId: string;
  participantIds: string[];
}

export interface TimeLog {
  id: string;
  hours: number;
  description: string;
  date: string;
  taskId: string;
  developerId: string;
}
