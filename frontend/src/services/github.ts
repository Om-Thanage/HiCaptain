import api from '@/lib/api';
import { githubOAuthService } from './githubOAuth';

export interface GitHubRepository {
  id: string;
  githubRepoId: string;
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  size: number;
  private: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  archived: boolean;
  disabled: boolean;
  ownerId: string;
  ownerLogin: string;
  ownerType: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  lastSyncAt: string;
}

export interface GitHubCommit {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName: string;
  committerEmail: string;
  committerDate: string;
  authorUsername?: string;
  htmlUrl: string;
  apiUrl: string;
  repositoryId: string;
  createdAt: string;
}

export interface GitHubPullRequest {
  id: string;
  githubPrId: string;
  number: number;
  title: string;
  body?: string;
  state: string;
  draft: boolean;
  authorUsername: string;
  headBranch: string;
  headSha: string;
  baseBranch: string;
  baseSha: string;
  mergeable: boolean;
  merged: boolean;
  mergedBy?: string;
  htmlUrl: string;
  apiUrl: string;
  repositoryId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
}

export const githubService = {
  // Check GitHub OAuth connection status (replaces old status check)
  getStatus: async (): Promise<string> => {
    try {
      const status = await githubOAuthService.getConnectionStatus();
      if (status.connected) {
        return `Connected as ${status.githubUsername} (${status.repositoryCount} repositories accessible)`;
      } else {
        return status.error || 'GitHub account not connected. Click "Connect GitHub" to authorize access.';
      }
    } catch {
      console.warn('GitHub OAuth service not available');
      return 'GitHub integration is not available';
    }
  },

  // OAuth-aware repository access
  getAccessibleRepositories: async (): Promise<string[]> => {
    try {
      const repos = await githubOAuthService.getAccessibleRepositories();
      return repos ? repos.repositories : [];
    } catch (error) {
      console.warn('Could not fetch accessible repositories:', error);
      return [];
    }
  },

  // Check if user can access a specific repository
  canAccessRepository: async (owner: string, repo: string): Promise<boolean> => {
    try {
      const access = await githubOAuthService.checkRepositoryAccess(owner, repo);
      return access.hasAccess;
    } catch (error) {
      console.warn('Could not check repository access:', error);
      return false;
    }
  },

  // Sync repository with GitHub
  syncRepository: async (owner: string, repoName: string, projectId: string): Promise<GitHubRepository> => {
    const response = await api.post('/api/github/repositories/sync', null, {
      params: { owner, repoName, projectId }
    });
    return response.data;
  },

  // Get repositories for a project
  getRepositories: async (projectId: string): Promise<GitHubRepository[]> => {
    try {
      const response = await api.get('/api/github/repositories', {
        params: { projectId }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub repositories:', error);
      return [];
    }
  },

  // Get repository by ID
  getRepository: async (repositoryId: string): Promise<GitHubRepository | null> => {
    try {
      const response = await api.get(`/api/github/repositories/${repositoryId}`);
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub repository:', error);
      return null;
    }
  },

  // Delete repository
  deleteRepository: async (repositoryId: string): Promise<void> => {
    await api.delete(`/api/github/repositories/${repositoryId}`);
  },

  // Get commits for a repository
  getCommits: async (owner: string, repoName: string, branch: string = 'main', limit: number = 50): Promise<GitHubCommit[]> => {
    try {
      const response = await api.get('/api/github/commits', {
        params: { owner, repoName, branch, limit }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub commits:', error);
      return [];
    }
  },

  // Get pull requests for a repository
  getPullRequests: async (owner: string, repoName: string, state: string = 'open'): Promise<GitHubPullRequest[]> => {
    try {
      const response = await api.get('/api/github/pull-requests', {
        params: { owner, repoName, state }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub pull requests:', error);
      return [];
    }
  },

  // Get contributor statistics
  getContributorStats: async (owner: string, repoName: string): Promise<any> => {
    try {
      const response = await api.get('/api/github/stats/contributors', {
        params: { owner, repoName }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub contributor stats:', error);
      return {};
    }
  },

  // Get language statistics
  getLanguageStats: async (owner: string, repoName: string): Promise<any> => {
    try {
      const response = await api.get('/api/github/stats/languages', {
        params: { owner, repoName }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub language stats:', error);
      return {};
    }
  },

  // Get issues for a repository
  getIssues: async (owner: string, repoName: string, state: string = 'open'): Promise<any[]> => {
    try {
      const response = await api.get('/api/github/issues', {
        params: { owner, repoName, state }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub issues:', error);
      return [];
    }
  },

  // Get branches for a repository
  getBranches: async (owner: string, repoName: string): Promise<any[]> => {
    try {
      const response = await api.get('/api/github/branches', {
        params: { owner, repoName }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch GitHub branches:', error);
      return [];
    }
  },

  // Create webhook for a repository
  createWebhook: async (owner: string, repoName: string, webhookUrl: string): Promise<any> => {
    const response = await api.post('/api/github/webhooks', null, {
      params: { owner, repoName, webhookUrl }
    });
    return response.data;
  }
};