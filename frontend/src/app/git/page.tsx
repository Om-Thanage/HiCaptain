'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { githubService, GitHubRepository, GitHubCommit, GitHubPullRequest } from '@/services/github';
import { githubOAuthService } from '@/services/githubOAuth';
import { projectService } from '@/services/project';
import { CheckCircle, AlertCircle, Github, GitBranch, GitMerge, Star, Users, Eye, Lock, GitCommit, Calendar, User, Plus, GitPullRequest, GitFork, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GitPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [recentCommits, setRecentCommits] = useState<GitHubCommit[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [githubStatus, setGithubStatus] = useState<string>('');
  const [syncForm, setSyncForm] = useState({
    owner: '',
    repoName: '',
    projectId: '',
    isVisible: false
  });
  const [oauthStatus, setOauthStatus] = useState<any>(null);
  const [accessibleRepos, setAccessibleRepos] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Handle OAuth callback if present
        const callbackResult = githubOAuthService.handleOAuthCallback();
        if (callbackResult.success && callbackResult.connected) {
          toast.success(`Successfully connected to GitHub as ${callbackResult.username}!`);
          githubOAuthService.clearCallbackParams();
        } else if (callbackResult.error) {
          toast.error(`GitHub connection failed: ${callbackResult.message || callbackResult.error}`);
          githubOAuthService.clearCallbackParams();
        }

        // Check GitHub OAuth connection status
        const oauthStatus = await githubOAuthService.getConnectionStatus();
        setOauthStatus(oauthStatus);
        setConnected(oauthStatus.connected);

        if (oauthStatus.connected) {
          setGithubStatus(`Connected as ${oauthStatus.githubUsername} (${oauthStatus.repositoryCount} repositories)`);
          
          // Get accessible repositories
          const accessibleRepos = await githubOAuthService.getAccessibleRepositories();
          if (accessibleRepos) {
            setAccessibleRepos(accessibleRepos.repositories);
          }
        } else {
          setGithubStatus('GitHub account not connected. Click "Connect GitHub" to authorize access.');
        }

        // Fetch projects for repository linking
        const projectsData = await projectService.getAll();
        setProjects(projectsData);

        // If GitHub is connected, fetch synced repository data
        if (oauthStatus.connected && projectsData.length > 0) {
          const repos = await githubService.getRepositories(projectsData[0].id);
          setRepositories(repos);

          // Fetch recent commits from first repository
          if (repos.length > 0) {
            const repo = repos[0];
            const [owner, repoName] = repo.fullName.split('/');
            
            // Check if user has access to this repository
            const hasAccess = await githubService.canAccessRepository(owner, repoName);
            if (hasAccess) {
              const commits = await githubService.getCommits(owner, repoName);
              setRecentCommits(commits);

              const prs = await githubService.getPullRequests(owner, repoName);
              setPullRequests(prs);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching GitHub data:', error);
        setConnected(false);
        setGithubStatus('Error loading GitHub integration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleConnectGitHub = async () => {
    try {
      setLoading(true);
      const result = await githubOAuthService.connectGitHub();
      // Redirect to GitHub OAuth
      window.location.href = result.authUrl;
    } catch (error: any) {
      toast.error('Failed to initiate GitHub connection: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      setLoading(true);
      await githubOAuthService.disconnectGitHub();
      toast.success('GitHub account disconnected successfully');
      
      // Reset state
      setConnected(false);
      setOauthStatus(null);
      setAccessibleRepos([]);
      setRepositories([]);
      setRecentCommits([]);
      setPullRequests([]);
      setGithubStatus('GitHub account disconnected');
    } catch (error: any) {
      toast.error('Failed to disconnect GitHub: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRepository = async () => {
    if (!syncForm.owner || !syncForm.repoName || !syncForm.projectId) {
      toast.error('Please fill all fields');
      return;
    }

    // Check if user has access to this repository
    const hasAccess = await githubService.canAccessRepository(syncForm.owner, syncForm.repoName);
    if (!hasAccess) {
      toast.error('You do not have access to this repository. Please connect your GitHub account and ensure you have access to this repository.');
      return;
    }

    setLoading(true);
    try {
      await githubService.syncRepository(syncForm.owner, syncForm.repoName, syncForm.projectId);
      toast.success('Repository synced successfully');
      setSyncForm({ owner: '', repoName: '', projectId: '', isVisible: false });
      
      // Refresh repositories
      const repos = await githubService.getRepositories(syncForm.projectId);
      setRepositories(repos);
    } catch (error) {
      toast.error('Failed to sync repository');
      console.error('Error syncing repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-300 bg-green-900/20 border border-green-800';
      case 'merged':
        return 'text-purple-300 bg-purple-900/20 border border-purple-800';
      case 'closed':
        return 'text-red-300 bg-red-900/20 border border-red-800';
      default:
        return 'text-slate-300 bg-slate-800 border border-slate-700';
    }
  };

  const connectGitHub = () => {
    setLoading(true);
    // Simulate GitHub OAuth flow
    setTimeout(() => {
      setConnected(true);
      setLoading(false);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Git Integration</h1>
            <p className="text-slate-400 mt-2">Manage repositories, commits, and pull requests</p>
          </div>
          <div className="flex items-center space-x-3">
            {connected && oauthStatus ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <img 
                    src={oauthStatus.githubAvatarUrl} 
                    alt="GitHub Avatar" 
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-slate-300">Connected as {oauthStatus.githubUsername}</span>
                </div>
                <button
                  onClick={handleDisconnectGitHub}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md hover:border-slate-500 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectGitHub}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Github className="w-5 h-5 mr-2" />
                )}
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        {connected ? (
          <>
            {/* Repository Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
                <div className="flex items-center">
                  <GitBranch className="h-8 w-8 text-blue-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Synced Repos</p>
                    <p className="text-2xl font-bold text-slate-100">{repositories.length}</p>
                    <p className="text-xs text-slate-500">({accessibleRepos.length} accessible)</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
                <div className="flex items-center">
                  <GitCommit className="h-8 w-8 text-green-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Recent Commits</p>
                    <p className="text-2xl font-bold text-slate-100">{recentCommits.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
                <div className="flex items-center">
                  <GitPullRequest className="h-8 w-8 text-purple-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Pull Requests</p>
                    <p className="text-2xl font-bold text-slate-100">{pullRequests.filter(pr => pr.state === 'open').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-yellow-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">Total Stars</p>
                    <p className="text-2xl font-bold text-slate-100">{repositories.reduce((sum, repo) => sum + repo.stargazersCount, 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Repositories */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">Connected Repositories</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-lg font-semibold text-slate-100">{repo.name}</h4>
                            <span className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded-full">{repo.language}</span>
                            {repo.private && (
                              <span className="text-xs px-2 py-1 bg-yellow-900/20 text-yellow-300 rounded-full border border-yellow-800">Private</span>
                            )}
                          </div>
                          <p className="text-slate-400 mt-1">{repo.description}</p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-slate-400">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4" />
                              <span>{repo.stargazersCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <GitFork className="w-4 h-4" />
                              <span>{repo.forksCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 text-sm text-slate-300 hover:text-slate-100 border border-slate-600 rounded-md hover:border-slate-500 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Commits */}
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-100">Recent Commits</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentCommits.map((commit) => (
                      <div key={commit.id} className="flex items-start space-x-3">
                        <GitCommit className="w-5 h-5 text-green-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-100 truncate">{commit.message}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-slate-400">{commit.sha.substring(0, 7)}</span>
                            <span className="text-xs text-slate-500">•</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="text-xs text-slate-400">{commit.authorName}</span>
                            </div>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">{new Date(commit.authorDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pull Requests */}
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-100">Pull Requests</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {pullRequests.map((pr) => (
                      <div key={pr.id} className="border-l-2 border-slate-600 pl-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-slate-100">{pr.title}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.state)}`}>
                                {pr.state}
                              </span>
                              <span className="text-xs text-slate-400">by {pr.authorUsername}</span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-400">{new Date(pr.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
                              <GitBranch className="w-3 h-3" />
                              <span>{pr.headBranch}</span>
                              <GitMerge className="w-3 h-3" />
                              <span>{pr.baseBranch}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Accessible Repositories */}
            {accessibleRepos.length > 0 && (
              <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-100">Your Accessible Repositories</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Repositories you can sync from your connected GitHub account ({accessibleRepos.length} total)
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accessibleRepos.slice(0, 6).map((repoFullName) => {
                      const [owner, name] = repoFullName.split('/');
                      const isAlreadySynced = repositories.some(r => r.fullName === repoFullName);
                      
                      return (
                        <div key={repoFullName} className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-100 truncate">{name}</h4>
                              <p className="text-xs text-slate-400">{owner}</p>
                            </div>
                            {isAlreadySynced ? (
                              <span className="text-xs px-2 py-1 bg-green-900/20 text-green-300 rounded border border-green-800">
                                Synced
                              </span>
                            ) : (
                              <button
                                onClick={() => setSyncForm({ 
                                  owner, 
                                  repoName: name, 
                                  projectId: projects[0]?.id || '', 
                                  isVisible: true 
                                })}
                                className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                              >
                                Sync
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {accessibleRepos.length > 6 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-slate-400">
                        Showing 6 of {accessibleRepos.length} repositories. Use the sync form below to add any repository.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sync Repository Section */}
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">Sync Repository</h3>
                  <button
                    onClick={() => setSyncForm({ ...syncForm, isVisible: !syncForm.isVisible })}
                    className="inline-flex items-center px-3 py-2 text-sm text-slate-300 hover:text-slate-100 border border-slate-600 rounded-md hover:border-slate-500 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {syncForm.isVisible ? 'Cancel' : 'Add Repository'}
                  </button>
                </div>
              </div>
              
              {syncForm.isVisible && (
                <div className="p-6 border-t border-slate-700">
                  {accessibleRepos.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Quick Select from Your Repositories
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const [owner, repoName] = e.target.value.split('/');
                            setSyncForm({ ...syncForm, owner, repoName });
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select a repository you have access to...</option>
                        {accessibleRepos.map((repoFullName) => {
                          const [owner, name] = repoFullName.split('/');
                          const isAlreadySynced = repositories.some(r => r.fullName === repoFullName);
                          return (
                            <option key={repoFullName} value={repoFullName} disabled={isAlreadySynced}>
                              {repoFullName} {isAlreadySynced ? '(Already synced)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-600 pt-6">
                    <p className="text-sm text-slate-400 mb-4">Or manually enter repository details:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Repository Owner
                        </label>
                        <input
                          type="text"
                          value={syncForm.owner}
                          onChange={(e) => setSyncForm({ ...syncForm, owner: e.target.value })}
                          placeholder="username or organization"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Repository Name
                        </label>
                        <input
                          type="text"
                          value={syncForm.repoName}
                          onChange={(e) => setSyncForm({ ...syncForm, repoName: e.target.value })}
                          placeholder="repository-name"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Link to Project
                      </label>
                      <select
                        value={syncForm.projectId}
                        onChange={(e) => setSyncForm({ ...syncForm, projectId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                  <div className="flex items-center justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setSyncForm({ owner: '', repoName: '', projectId: '', isVisible: false })}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSyncRepository}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Syncing...' : 'Sync Repository'}
                    </button>
                  </div>
                </div>
              )}

              {/* GitHub Status */}
              {githubStatus && (
                <div className="px-6 py-4 border-t border-slate-700">
                  <div className="flex items-center space-x-2">
                    {connected ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    )}
                    <span className="text-sm text-slate-300">{githubStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <GitBranch className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-200">Connect Your GitHub Account</h3>
            <p className="mt-1 text-sm text-slate-400">Connect your GitHub account to view repositories, commits, and pull requests.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}