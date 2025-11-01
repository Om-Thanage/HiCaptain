import api from '@/lib/api';

export interface GitHubConnectionStatus {
  connected: boolean;
  githubUsername?: string;
  githubAvatarUrl?: string;
  connectedAt?: string;
  repositoryCount?: number;
  scopes?: string[];
  canAccessPrivateRepos?: boolean;
  message?: string;
  error?: string;
}

export interface GitHubAccessibleRepos {
  repositories: string[];
  totalCount: number;
  canAccessAllRepos: boolean;
}

export interface GitHubRepositoryAccess {
  hasAccess: boolean;
  repository: string;
  message?: string;
}

export const githubOAuthService = {
  /**
   * Step 1: Initiate GitHub OAuth connection (like Vercel's "Connect GitHub" button)
   */
  connectGitHub: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await api.post('/api/auth/github/connect');
    return response.data;
  },

  /**
   * Get current GitHub connection status
   */
  getConnectionStatus: async (): Promise<GitHubConnectionStatus> => {
    try {
      const response = await api.get('/api/auth/github/status');
      return response.data;
    } catch (error: any) {
      return {
        connected: false,
        error: error.response?.data?.error || 'Failed to get connection status'
      };
    }
  },

  /**
   * Get user's accessible repositories (from their connected GitHub account)
   */
  getAccessibleRepositories: async (): Promise<GitHubAccessibleRepos | null> => {
    try {
      const response = await api.get('/api/auth/github/repositories');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get accessible repositories:', error);
      return null;
    }
  },

  /**
   * Check if user has access to a specific repository
   */
  checkRepositoryAccess: async (owner: string, repo: string): Promise<GitHubRepositoryAccess> => {
    try {
      const response = await api.get(`/api/auth/github/access/${owner}/${repo}`);
      return response.data;
    } catch (error: any) {
      return {
        hasAccess: false,
        repository: `${owner}/${repo}`,
        message: error.response?.data?.error || 'Failed to check repository access'
      };
    }
  },

  /**
   * Disconnect GitHub account
   */
  disconnectGitHub: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/github/disconnect');
    return response.data;
  },

  /**
   * Handle OAuth callback success/error (called from URL params)
   */
  handleOAuthCallback: (): { 
    success: boolean; 
    connected?: boolean; 
    username?: string; 
    error?: string; 
    message?: string 
  } => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for success
    if (urlParams.get('connected') === 'true') {
      const username = urlParams.get('username');
      return {
        success: true,
        connected: true,
        username: username || undefined
      };
    }
    
    // Check for error
    const error = urlParams.get('error');
    const message = urlParams.get('message') || urlParams.get('error_description');
    
    if (error) {
      return {
        success: false,
        error,
        message: message || undefined
      };
    }
    
    // No OAuth callback parameters found
    return { success: false };
  },

  /**
   * Clear OAuth callback parameters from URL
   */
  clearCallbackParams: (): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete('connected');
    url.searchParams.delete('username');
    url.searchParams.delete('error');
    url.searchParams.delete('message');
    url.searchParams.delete('error_description');
    
    window.history.replaceState({}, document.title, url.toString());
  }
};