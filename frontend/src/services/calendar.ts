import api from '@/lib/api';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
  attendeeEmails?: string[];
  projectId: string;
  organizerId: string;
  isVirtual: boolean;
  syncWithGoogleCalendar: boolean;
  googleEventId?: string;
  googleMeetLink?: string;
  status?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
}

export const calendarService = {
  async connected(userId: string): Promise<boolean> {
    return (await api.get('/api/google-calendar/auth/status', { params: { userId } })).data;
  },
  async events(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    return (await api.get('/api/google-calendar/events', { params: { userId, from: from.toISOString(), to: to.toISOString() } })).data;
  },
  async meetings(): Promise<Meeting[]> { return (await api.get('/api/meetings')).data; },
  async createMeeting(meeting: Omit<Meeting, 'id' | 'organizerId' | 'googleEventId' | 'googleMeetLink'>): Promise<Meeting> {
    return (await api.post('/api/meetings', meeting)).data;
  },
  async updateMeeting(id: string, meeting: Omit<Meeting, 'id' | 'organizerId' | 'googleEventId' | 'googleMeetLink'>): Promise<Meeting> {
    return (await api.put(`/api/meetings/${id}`, meeting)).data;
  },
  async deleteMeeting(id: string): Promise<void> { await api.delete(`/api/meetings/${id}`); },
};
