'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, GitBranch, GitCommitHorizontal, GitPullRequest, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { githubService, type GitHubCommit, type GitHubPullRequest, type GitHubRepository } from '@/services/github';
import { githubOAuthService, type GitHubConnectionStatus } from '@/services/githubOAuth';
import styles from './projectGit.module.css';

export default function ProjectGit({ projectId }: { projectId: string }) {
  const [connection, setConnection] = useState<GitHubConnectionStatus | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selected, setSelected] = useState('');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [repoName, setRepoName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const callback = githubOAuthService.handleOAuthCallback();
    if (callback.connected) toast.success(`Connected to GitHub as ${callback.username}`);
    else if (callback.error) toast.error(callback.message || callback.error);
    if (callback.connected || callback.error) githubOAuthService.clearCallbackParams();

    Promise.all([githubOAuthService.getConnectionStatus(), githubService.getRepositories(projectId)])
      .then(([status, repos]) => {
        setConnection(status);
        setRepositories(repos);
        setSelected(repos[0]?.fullName || '');
      })
      .catch(() => toast.error('Could not load GitHub activity'))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!selected || !connection?.connected) {
      setCommits([]);
      setPullRequests([]);
      return;
    }
    const [owner, repo] = selected.split('/');
    Promise.all([
      githubService.getCommits(owner, repo, repositories.find(item => item.fullName === selected)?.defaultBranch || 'main', 5),
      githubService.getPullRequests(owner, repo),
    ]).then(([nextCommits, nextPullRequests]) => {
      setCommits(nextCommits);
      setPullRequests(nextPullRequests);
    });
  }, [selected, connection?.connected, repositories]);

  async function connect() {
    setBusy(true);
    try {
      const { authUrl } = await githubOAuthService.connectGitHub();
      sessionStorage.setItem('hicaptain-github-project', projectId);
      window.location.assign(authUrl);
    } catch {
      toast.error('Could not start GitHub connection');
      setBusy(false);
    }
  }

  async function linkRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = repoName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    const parts = fullName.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      toast.error('Enter a repository as owner/name');
      return;
    }
    setBusy(true);
    try {
      if (!await githubService.canAccessRepository(parts[0], parts[1])) {
        toast.error('Your GitHub account cannot access this repository');
        return;
      }
      await githubService.syncRepository(parts[0], parts[1], projectId);
      const repos = await githubService.getRepositories(projectId);
      setRepositories(repos);
      setSelected(fullName);
      setRepoName('');
      toast.success('Repository linked to this project');
    } catch {
      toast.error('Could not link the repository');
    } finally {
      setBusy(false);
    }
  }

  const activeRepo = repositories.find(repo => repo.fullName === selected);

  return <section className={styles.section} aria-label="Project GitHub activity">
    <div className={styles.heading}>
      <div className={styles.headingContent}><span className={styles.logo}><Image src="/github-mark.svg" alt="GitHub logo" width={33} height={33} /></span><div><span className={styles.eyebrow}>DEVELOPMENT</span><h2>GitHub</h2><p>Repositories, commits, and pull requests for this project.</p></div></div>
      {connection?.connected && <span className={styles.connected}>Connected as {connection.githubUsername}</span>}
    </div>
    {loading ? <p className={styles.empty}>Loading GitHub activity…</p> : !connection?.connected ?
      <div className={styles.emptyCard}><span className={styles.emptyLogo}><Image src="/github-mark.svg" alt="" width={28} height={28} /></span><strong>Connect your GitHub account</strong><p>Connect to link repositories and see project activity here.</p><button onClick={connect} disabled={busy}>Connect GitHub</button></div> : <>
      <form className={styles.linkForm} onSubmit={linkRepository}>
        <label htmlFor="github-repository">Link a repository</label>
        <div><input id="github-repository" value={repoName} onChange={event => setRepoName(event.target.value)} placeholder="owner/repository" /><button disabled={busy} type="submit"><Plus size={16} /> Link repository</button></div>
      </form>
      {repositories.length ? <>
        <div className={styles.repoList} aria-label="Project repositories">{repositories.map(repo => <button key={repo.id} className={repo.fullName === selected ? styles.activeRepo : ''} onClick={() => setSelected(repo.fullName)}><GitBranch size={16} /> {repo.fullName}</button>)}</div>
        <div className={styles.activity}>
          <div className={styles.panel}><h3><GitCommitHorizontal size={18} /> Recent commits</h3>{commits.length ? commits.map(commit => <a key={commit.sha} href={commit.htmlUrl} target="_blank" rel="noopener noreferrer"><span><strong>{commit.message.split('\n')[0]}</strong><small>{commit.authorName} · {commit.sha.slice(0, 7)}</small></span><ExternalLink size={15} /></a>) : <p>No recent commits found.</p>}</div>
          <div className={styles.panel}><h3><GitPullRequest size={18} /> Open pull requests</h3>{pullRequests.length ? pullRequests.map(pr => <a key={pr.number} href={pr.htmlUrl} target="_blank" rel="noopener noreferrer"><span><strong>{pr.title}</strong><small>#{pr.number} · {pr.authorUsername}</small></span><ExternalLink size={15} /></a>) : <p>No open pull requests found.</p>}</div>
        </div>
        {activeRepo && <a className={styles.githubLink} href={activeRepo.htmlUrl} target="_blank" rel="noopener noreferrer">Open {activeRepo.fullName} on GitHub <ExternalLink size={14} /></a>}
      </> : <p className={styles.empty}>No repositories linked yet. Add one above to see its activity.</p>}
    </>}
  </section>;
}
