'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { calendarService, Meeting } from '@/services/calendar';
import { Project } from '@/types';
import styles from './MeetingModal.module.css';

interface Props { day: string; projects: Project[]; meeting?: Meeting | null; onClose: () => void; onSaved: () => void }
const localDay = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function MeetingModal({ day, projects, meeting, onClose, onSaved }: Props) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(day || localDay());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [attendees, setAttendees] = useState('');
  const [virtual, setVirtual] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProjectId(meeting?.projectId || projects[0]?.id || '');
    setTitle(meeting?.title || '');
    setDescription(meeting?.description || '');
    setDate(meeting?.startTime?.slice(0, 10) || day || localDay());
    setStart(meeting?.startTime?.slice(11, 16) || '09:00');
    setEnd(meeting?.endTime?.slice(11, 16) || '10:00');
    setAttendees(meeting?.attendeeEmails?.join(', ') || '');
    setVirtual(meeting?.isVirtual ?? true);
  }, [meeting, day, projects]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (`${date}T${end}` <= `${date}T${start}`) { toast.error('End time must be after start time'); return; }
    const emails = attendees.split(',').map(value => value.trim()).filter(Boolean);
    if (emails.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) { toast.error('Check attendee email addresses'); return; }
    setSaving(true);
    try {
      const payload = { projectId, title: title.trim(), description: description.trim(), startTime: `${date}T${start}:00`, endTime: `${date}T${end}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, attendeeEmails: emails, isVirtual: virtual, syncWithGoogleCalendar: true, status: 'scheduled' };
      if (meeting) await calendarService.updateMeeting(meeting.id, payload);
      else await calendarService.createMeeting(payload);
      toast.success(meeting ? 'Meeting updated in Google Calendar' : 'Meeting added to Google Calendar');
      onSaved(); onClose();
    } catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not save the meeting in Google Calendar'); }
    finally { setSaving(false); }
  }

  return <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="meeting-title">
    <div className={styles.heading}><div><span>WORK BETTER TOGETHER</span><h2 id="meeting-title">{meeting ? 'Edit meeting' : 'Plan a meeting'}</h2><p>Calendar will invite attendees and create a Meet link when selected.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <form onSubmit={submit}><label>Project<select required value={projectId} onChange={event => setProjectId(event.target.value)}><option value="" disabled>Select a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Meeting title<input required maxLength={120} autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Sprint planning" /></label>
      <label>Agenda<textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="What will you cover?" /></label>
      <div className={styles.row}><label>Date<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Starts<input required type="time" value={start} onChange={event => setStart(event.target.value)} /></label><label>Ends<input required type="time" value={end} onChange={event => setEnd(event.target.value)} /></label></div>
      <p className={styles.hint}>Times use your browser timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
      <label>Attendee emails <small>Separate addresses with commas</small><input value={attendees} onChange={event => setAttendees(event.target.value)} placeholder="alex@example.com, sam@example.com" /></label>
      <label className={styles.switch}><input type="checkbox" checked={virtual} onChange={event => setVirtual(event.target.checked)} /><span><strong>Create Google Meet link</strong><small>Join link appears on the event after Google creates it.</small></span></label>
      <div className={styles.actions}><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={saving || !projectId}>{saving ? 'Saving…' : meeting ? 'Save changes' : 'Create meeting'}</button></div>
    </form>
  </div></div>;
}
