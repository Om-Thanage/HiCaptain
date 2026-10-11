'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, Plus, RefreshCw, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MeetingModal from '@/components/MeetingModal';
import { authService } from '@/services/auth';
import { calendarService, CalendarEvent, Meeting } from '@/services/calendar';
import { projectService } from '@/services/project';
import { taskService } from '@/services/task';
import { Project, Task } from '@/types';
import styles from './schedule.module.css';

const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthName = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const time = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

type ScheduleItem = { id: string; title: string; day: string; time?: string; kind: 'meeting' | 'calendar' | 'task'; project?: Project; meeting?: Meeting; url?: string };

export default function SchedulePage() {
  const user = authService.getUserFromToken();
  const canManage = user?.roles?.some(role => role === 'Admin' || role === 'ProjectManager');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => key(new Date()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    try {
      const [projectData, meetingData] = await Promise.all([projectService.getAll(), calendarService.meetings()]);
      setProjects(projectData);
      setMeetings(meetingData);
      const taskResults = await Promise.allSettled(projectData.map(project => taskService.getByProjectId(project.id)));
      setTasks(taskResults.flatMap(result => result.status === 'fulfilled' ? result.value : []));
      if (user?.id) {
        const active = await calendarService.connected(user.id).catch(() => false);
        setConnected(active);
        if (active) setGoogleEvents(await calendarService.events(user.id, start, end).catch(() => { toast.error('Could not load Google Calendar events'); return []; }));
        else setGoogleEvents([]);
      }
    } catch { toast.error('Could not load the schedule'); }
    finally { setLoading(false); }
  }, [month, user?.id]);
  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    const projectById = new Map(projects.map(project => [project.id, project]));
    const linkedEvents = new Set(meetings.map(meeting => meeting.googleEventId).filter(Boolean));
    const meetingItems: ScheduleItem[] = meetings.map(meeting => ({ id: `meeting-${meeting.id}`, title: meeting.title, day: meeting.startTime.slice(0, 10), time: time(meeting.startTime), kind: 'meeting', project: projectById.get(meeting.projectId), meeting, url: meeting.googleMeetLink || meeting.googleEventId && `https://calendar.google.com/calendar/u/0/r/eventedit/${meeting.googleEventId}` || undefined }));
    const taskItems: ScheduleItem[] = tasks.filter(task => task.deadline).map(task => ({ id: `task-${task.id}`, title: task.title, day: task.deadline.slice(0, 10), kind: 'task', project: projectById.get(task.projectId) }));
    const otherEvents: ScheduleItem[] = googleEvents.filter(event => !linkedEvents.has(event.id) && (event.start?.dateTime || event.start?.date)).map(event => {
      const start = event.start?.dateTime;
      return { id: `google-${event.id}`, title: event.summary || 'Untitled event', day: start ? key(new Date(start)) : event.start!.date!, time: start ? time(start) : undefined, kind: 'calendar', url: event.htmlLink || event.hangoutLink };
    });
    return [...meetingItems, ...taskItems, ...otherEvents].sort((a, b) => `${a.day}${a.time || ''}`.localeCompare(`${b.day}${b.time || ''}`));
  }, [projects, meetings, tasks, googleEvents]);
  const selectedItems = items.filter(item => item.day === selectedDay);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = new Date(first);
  calendarStart.setDate(first.getDate() - (first.getDay() + 6) % 7);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(calendarStart); day.setDate(calendarStart.getDate() + index); return day; });
  function changeMonth(offset: number) { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelectedDay(key(next)); }
  async function remove(meeting: Meeting) {
    if (!window.confirm(`Delete "${meeting.title}" from HiCaptain and Google Calendar?`)) return;
    try { await calendarService.deleteMeeting(meeting.id); toast.success('Meeting deleted'); load(); }
    catch (cause: any) { toast.error(cause.response?.data?.message || 'Could not delete meeting'); }
  }

  return <DashboardLayout><div className={styles.page}>
    <div className={styles.heading}><div><span className={styles.kicker}>STAY IN SYNC</span><h1>Keep every date in view.</h1><p>Meetings, Google Calendar events, and project task deadlines together.</p></div><div className={styles.headingActions}><button type="button" className={styles.refresh} onClick={load} aria-label="Refresh schedule"><RefreshCw size={17} /></button>{canManage && connected && <button type="button" className={styles.primary} onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={17} /> New meeting</button>}</div></div>
    <div className={`${styles.connection} ${connected ? styles.connected : ''}`}><span className={styles.connectionIcon}><CalendarDays size={18} /></span><div><strong>{connected ? 'Google Workspace connected' : 'Connect Google Workspace'}</strong><p>{connected ? 'Your Calendar events appear alongside project work.' : 'Connect your account to see Calendar events and create Google Meet meetings.'}</p></div>{!connected && <Link href="/settings">Open settings <ArrowUpRight size={15} /></Link>}</div>
    <div className={styles.layout}><section className={styles.calendar}><div className={styles.monthBar}><h2>{monthName(month)}</h2><div><button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(key(today)); }}>Today</button><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button></div></div>
      <div className={styles.weekdays}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span key={day}>{day}</span>)}</div><div className={styles.days}>{days.map(day => { const value = key(day); const dayItems = items.filter(item => item.day === value); return <button type="button" key={value} onClick={() => setSelectedDay(value)} className={`${styles.day} ${day.getMonth() !== month.getMonth() ? styles.outside : ''} ${value === selectedDay ? styles.selected : ''} ${value === key(new Date()) ? styles.today : ''}`} aria-label={`${day.toDateString()}, ${dayItems.length} events`}><span>{day.getDate()}</span><div>{dayItems.slice(0, 2).map(item => <i key={item.id} className={styles[item.kind === 'calendar' ? 'calendarDot' : item.kind]} />)}{dayItems.length > 2 && <small>+{dayItems.length - 2}</small>}</div></button>; })}</div>
    </section><aside className={styles.agenda}><div className={styles.agendaHeading}><span className={styles.kicker}>DAY AT A GLANCE</span><h2>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2><p>{selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} on your schedule</p></div>{loading ? <div className={styles.empty}>Loading schedule…</div> : selectedItems.length ? <div className={styles.itemList}>{selectedItems.map(item => <div key={item.id} className={styles.item}><span className={`${styles.itemMark} ${styles[item.kind === 'calendar' ? 'calendarDot' : item.kind]}`}>{item.kind === 'meeting' ? <Video size={15} /> : item.kind === 'task' ? <Clock3 size={15} /> : <CalendarDays size={15} />}</span><div><span className={styles.itemType}>{item.kind === 'task' ? 'Task deadline' : item.kind === 'meeting' ? 'Meeting' : 'Google Calendar'}</span><strong>{item.title}</strong><small>{[item.time, item.project?.name].filter(Boolean).join(' · ')}</small><div className={styles.itemActions}>{item.meeting?.googleMeetLink && <a href={item.meeting.googleMeetLink} target="_blank" rel="noreferrer">Join Meet <ExternalLink size={13} /></a>}{item.kind === 'calendar' && item.url && <a href={item.url} target="_blank" rel="noreferrer">Open event <ExternalLink size={13} /></a>}{item.kind === 'task' && item.project && <Link href={`/projects/${item.project.id}`}>Open project <ArrowUpRight size={13} /></Link>}{item.meeting && canManage && <><button type="button" onClick={() => { setEditing(item.meeting!); setModalOpen(true); }}>Edit</button><button type="button" onClick={() => remove(item.meeting!)} aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button></>}</div></div></div>)}</div> : <div className={styles.empty}><CalendarDays size={27} /><strong>Nothing planned yet</strong><p>Choose another day or plan a meeting.</p></div>}</aside></div>
    {modalOpen && <MeetingModal day={selectedDay} projects={projects} meeting={editing} onClose={() => setModalOpen(false)} onSaved={load} />}
  </div></DashboardLayout>;
}
