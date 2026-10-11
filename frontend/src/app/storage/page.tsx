'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Download, FileText, FolderOpen, HardDrive, Plus, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { googleWorkspaceService, DriveFile, DriveFolder, FolderConfiguration } from '@/services/googleWorkspace';
import { projectService } from '@/services/project';
import { Project } from '@/types';
import styles from './storage.module.css';

const size = (bytes: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : 'Google document';
const isDocument = (file: DriveFile) => file.mimeType.startsWith('application/vnd.google-apps.');

export default function StoragePage() {
  const user = authService.getUserFromToken();
  const canManage = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager');
  const canUpload = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager' || role === 'Developer');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [folder, setFolder] = useState<FolderConfiguration | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([]);
  const [picking, setPicking] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [folderError, setFolderError] = useState(false);

  useEffect(() => {
    projectService.getAll().then(data => { setProjects(data); setProjectId(data[0]?.id || ''); })
      .catch(() => toast.error('Could not load projects')).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setPicking(false); setFolderPath([]); setFiles([]); setFolder(null);
    if (!projectId) return;
    setLoading(true);
    googleWorkspaceService.projectFolder(projectId).then(setFolder)
      .catch(() => toast.error('Could not load the project folder')).finally(() => setLoading(false));
  }, [projectId]);
  useEffect(() => {
    if (!folder || !projectId) return;
    googleWorkspaceService.files(projectId).then(setFiles).catch(() => toast.error('Could not load project files'));
  }, [folder, projectId]);
  useEffect(() => {
    if (!picking) return;
    setFolderError(false);
    googleWorkspaceService.folders(folderPath.at(-1)?.id).then(setFolders)
      .catch(() => { setFolderError(true); setFolders([]); });
  }, [picking, folderPath]);

  async function selectFolder() {
    const selected = folderPath.at(-1);
    if (!selected || !projectId) return;
    setBusy(true);
    try {
      setFolder(await googleWorkspaceService.selectFolder(projectId, selected.id));
      setFiles([]); setPicking(false);
      toast.success('Project folder selected and shared with project members');
    } catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not share this folder'); }
    finally { setBusy(false); }
  }
  async function syncSharing() {
    setBusy(true);
    try { await googleWorkspaceService.syncFolderSharing(projectId); toast.success('Folder sharing updated for current project members'); }
    catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not update folder sharing'); }
    finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;
    event.target.value = '';
    if (file.size > 10_000_000) { toast.error('Choose a file smaller than 10 MB'); return; }
    setBusy(true);
    try { const added = await googleWorkspaceService.upload(projectId, file); setFiles(current => [...current, added]); toast.success('File added to project folder'); }
    catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not upload file'); }
    finally { setBusy(false); }
  }
  async function download(file: DriveFile) {
    if (isDocument(file)) { window.open(file.webViewLink, '_blank', 'noopener,noreferrer'); return; }
    try {
      const blob = await googleWorkspaceService.download(projectId, file.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Could not download file'); }
  }
  async function remove(file: DriveFile) {
    if (!window.confirm(`Delete "${file.name}" from the project folder?`)) return;
    try { await googleWorkspaceService.delete(projectId, file.id); setFiles(current => current.filter(item => item.id !== file.id)); toast.success('File deleted'); }
    catch { toast.error('Could not delete file'); }
  }

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><div><span className={styles.kicker}>ONE PLACE FOR EVERY FILE</span><h1>Project files, together.</h1><p>Choose a folder in My Drive for each project and share it with the project team.</p></div><span className={styles.heroIcon}><HardDrive size={32} /></span></div>
    <div className={styles.toolbar}><div><span className={styles.kicker}>PROJECT LIBRARY</span><h2>Files and documents</h2></div><div className={styles.controls}><select aria-label="Project" value={projectId} onChange={event => setProjectId(event.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{canUpload && !!folder && <label className={styles.upload}><Plus size={16} /> {busy ? 'Uploading…' : 'Upload file'}<input type="file" disabled={busy} onChange={upload} /></label>}</div></div>
    {loading ? <div className={styles.notice}>Loading storage…</div> : !projectId ? <div className={styles.notice}>No projects are available to you yet.</div> : <>
      {folder && <div className={styles.banner}><span><FolderOpen size={19} /></span><div><strong>{folder.folderName}</strong><small>My Drive folder for this project</small></div><a href={folder.folderUrl || `https://drive.google.com/drive/folders/${folder.folderId}`} target="_blank" rel="noreferrer">Open in Drive <ArrowUpRight size={13} /></a>{canManage && <button type="button" disabled={busy} onClick={syncSharing}>Update sharing</button>}{canManage && <button type="button" disabled={busy} onClick={() => { setFolderPath([]); setPicking(true); }}>Change folder</button>}</div>}
      {!folder && !picking && <section className={styles.setup}><span className={styles.setupIcon}><FolderOpen size={24} /></span><span className={styles.kicker}>CONNECT YOUR PROJECT</span><h2>Choose a folder in My Drive</h2><p>The selected folder and everything already inside it will be shared with this project&apos;s members. Use a dedicated folder for this project.</p>{canManage ? <button type="button" className={styles.action} onClick={() => setPicking(true)}>Browse My Drive</button> : <p>Ask a project manager or organization admin to choose the folder.</p>}</section>}
      {picking && <section className={styles.setup}><span className={styles.kicker}>MY DRIVE</span><h2>{folderPath.at(-1)?.name || 'Choose a project folder'}</h2><p>Browse folders from the Google account connected in <Link href="/settings">Settings <ArrowUpRight size={13} /></Link>. Select a dedicated folder to share its contents with the project team.</p>{folder && <p>Changing folders does not remove access to the previous folder. Review its sharing in Google Drive.</p>}<div className={styles.folderNav}><button type="button" disabled={!folderPath.length} onClick={() => setFolderPath(path => path.slice(0, -1))}><ArrowLeft size={15} /> Back</button><span>My Drive {folderPath.map(item => ` / ${item.name}`).join('')}</span></div>{folderError ? <p>Could not browse this account. <Link href="/settings">Connect Google Workspace <ArrowUpRight size={13} /></Link></p> : <div className={styles.folderList}>{folders.map(item => <button type="button" key={item.id} onClick={() => setFolderPath(path => [...path, item])}><FolderOpen size={17} /> {item.name} <ArrowUpRight size={14} /></button>)}{!folders.length && <p>No folders here. Create a folder in Google Drive, then reopen this browser.</p>}</div>}<div className={styles.folderActions}><button type="button" onClick={() => setPicking(false)}>Cancel</button><button type="button" className={styles.action} disabled={!folderPath.length || busy} onClick={selectFolder}>{busy ? 'Sharing…' : `Use ${folderPath.at(-1)?.name || 'this folder'}`}</button></div></section>}
      {folder && (files.length ? <div className={styles.fileList}>{files.map(file => <div key={file.id} className={styles.file}><span className={styles.fileIcon}>{isDocument(file) ? <FileText size={20} /> : <UploadCloud size={20} />}</span><div><strong>{file.name}</strong><small>{size(file.size)}</small></div><button type="button" onClick={() => download(file)} aria-label={isDocument(file) ? `Open ${file.name}` : `Download ${file.name}`}>{isDocument(file) ? <ArrowUpRight size={17} /> : <Download size={17} />}</button>{canManage && <button type="button" className={styles.delete} onClick={() => remove(file)} aria-label={`Delete ${file.name}`}><Trash2 size={16} /></button>}</div>)}</div> : <div className={styles.notice}><FolderOpen size={28} /><strong>No files in this project folder yet</strong><p>Upload a file or add one in Google Drive.</p></div>)}
    </>}
  </div></DashboardLayout>;
}
