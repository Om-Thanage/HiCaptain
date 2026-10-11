'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, FileText, FolderOpen, HardDrive, Plus, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/auth';
import { googleWorkspaceService, DriveFile, SharedDrive, StorageConfiguration } from '@/services/googleWorkspace';
import { projectService } from '@/services/project';
import { Project } from '@/types';
import styles from './storage.module.css';

const size = (bytes: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : 'Google document';
const isDocument = (file: DriveFile) => file.mimeType.startsWith('application/vnd.google-apps.');

export default function StoragePage() {
  const user = authService.getUserFromToken();
  const admin = user?.roles?.includes('Admin');
  const canUpload = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager' || role === 'Developer');
  const canDelete = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [storage, setStorage] = useState<StorageConfiguration | null>(null);
  const [drives, setDrives] = useState<SharedDrive[]>([]);
  const [driveId, setDriveId] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.allSettled([projectService.getAll(), googleWorkspaceService.storage()]).then(([projectResult, storageResult]) => {
      if (projectResult.status === 'fulfilled') { setProjects(projectResult.value); setProjectId(projectResult.value[0]?.id || ''); }
      if (storageResult.status === 'fulfilled') setStorage(storageResult.value);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (admin && !storage) googleWorkspaceService.sharedDrives().then(setDrives).catch(() => {});
  }, [admin, storage]);
  useEffect(() => {
    if (!storage || !projectId) { setFiles([]); return; }
    googleWorkspaceService.files(projectId).then(setFiles).catch(() => toast.error('Could not load project files'));
  }, [storage, projectId]);

  async function selectDrive() {
    if (!driveId) return;
    setBusy(true);
    try { setStorage(await googleWorkspaceService.selectDrive(driveId)); toast.success('Shared Drive linked to this organization'); }
    catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not connect Shared Drive'); }
    finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;
    event.target.value = '';
    if (file.size > 10_000_000) { toast.error('Choose a file smaller than 10 MB'); return; }
    setBusy(true);
    try { const added = await googleWorkspaceService.upload(projectId, file); setFiles(current => [...current, added]); toast.success('File added to Shared Drive'); }
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
    if (!window.confirm(`Delete "${file.name}" from the Shared Drive?`)) return;
    try { await googleWorkspaceService.delete(projectId, file.id); setFiles(current => current.filter(item => item.id !== file.id)); toast.success('File deleted'); }
    catch { toast.error('Could not delete file'); }
  }

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><div><span className={styles.kicker}>ONE PLACE FOR EVERY FILE</span><h1>Project files, together.</h1><p>Keep work in your organization&apos;s Google Workspace Shared Drive.</p></div><span className={styles.heroIcon}><HardDrive size={32} /></span></div>
    {loading ? <div className={styles.notice}>Loading storage…</div> : !storage ? <section className={styles.setup}><span className={styles.setupIcon}><FolderOpen size={24} /></span><span className={styles.kicker}>CONNECT YOUR WORKSPACE</span><h2>Choose a Shared Drive</h2><p>An organization admin connects Google Workspace and selects the Shared Drive that will own project files.</p>{admin ? <><div className={styles.setupControls}><select value={driveId} onChange={event => setDriveId(event.target.value)}><option value="">Select a Shared Drive</option>{drives.map(drive => <option key={drive.id} value={drive.id}>{drive.name}</option>)}</select><button type="button" disabled={busy || !driveId} onClick={selectDrive}>{busy ? 'Connecting…' : 'Use this drive'}</button></div>{!drives.length && <p>No Shared Drives are available for your connected Google account. <Link href="/settings">Connect Google Workspace <ArrowUpRight size={13} /></Link></p>}</> : <p>Ask an organization admin to connect the Shared Drive.</p>}</section> : <>
      <div className={styles.banner}><span><HardDrive size={19} /></span><div><strong>{storage.driveName}</strong><small>Shared Drive connected to this organization</small></div>{admin && <button type="button" onClick={() => { setStorage(null); setDrives([]); }}>Change drive</button>}</div>
      <div className={styles.toolbar}><div><span className={styles.kicker}>PROJECT LIBRARY</span><h2>Files and documents</h2></div><div className={styles.controls}><select aria-label="Project" value={projectId} onChange={event => setProjectId(event.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{canUpload && !!projectId && <label className={styles.upload}><Plus size={16} /> {busy ? 'Uploading…' : 'Upload file'}<input type="file" disabled={busy} onChange={upload} /></label>}</div></div>
      {!projectId ? <div className={styles.notice}>No projects are available to you yet.</div> : files.length ? <div className={styles.fileList}>{files.map(file => <div key={file.id} className={styles.file}><span className={styles.fileIcon}>{isDocument(file) ? <FileText size={20} /> : <UploadCloud size={20} />}</span><div><strong>{file.name}</strong><small>{size(file.size)}</small></div><button type="button" onClick={() => download(file)} aria-label={isDocument(file) ? `Open ${file.name}` : `Download ${file.name}`}>{isDocument(file) ? <ArrowUpRight size={17} /> : <Download size={17} />}</button>{canDelete && <button type="button" className={styles.delete} onClick={() => remove(file)} aria-label={`Delete ${file.name}`}><Trash2 size={16} /></button>}</div>)}</div> : <div className={styles.notice}><FolderOpen size={28} /><strong>No files in this project yet</strong><p>Upload a file to create its project folder in the Shared Drive.</p></div>}
    </>}
  </div></DashboardLayout>;
}
