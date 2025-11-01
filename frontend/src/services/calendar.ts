import api from '@/lib/api';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus: string;
  }[];
  meetLink?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  organizerId: string;
  participants: string[];
  projectId?: string;
  syncWithGoogleCalendar: boolean;
  googleEventId?: string;
  googleMeetLink?: string;
  meetingLink?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export const calendarService = {
  // Check Google Calendar integration status
  getStatus: async (): Promise<string> => {
    try {
      const response = await api.get('/api/calendar/status');
      return response.data;
    } catch (error) {
      console.warn('Google Calendar integration not available');
      return 'Google Calendar integration is not available';
    }
  },

  // Get Google Calendar authorization URL
  getAuthUrl: async (userId: string): Promise<string> => {
    try {
      const response = await api.get('/api/google-calendar/auth/url', {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not get Google Calendar auth URL:', error);
      throw new Error('Google Calendar integration is not available');
    }
  },

  // Get calendar events
  getEvents: async (userId: string, days: number = 7): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get('/api/google-calendar/events', {
        params: { userId, days }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn('Access forbidden - user may not be authorized for Google Calendar or Google Calendar may not be configured');
        return [];
      } else if (error.response?.status === 401) {
        console.warn('Authentication required for Google Calendar access');
        throw new Error('Authentication required');
      } else if (error.response?.status === 400) {
        console.warn('Bad request - Google Calendar may not be properly configured');
        return [];
      } else {
        console.warn('Could not fetch calendar events:', error);
        return [];
      }
    }
  },

  // Get user's calendars
  getCalendars: async (userId: string): Promise<any[]> => {
    try {
      const response = await api.get('/api/google-calendar/calendars', {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch calendars:', error);
      return [];
    }
  },

  // Create a calendar event with Google Meet
  createEvent: async (userId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await api.post('/api/google-calendar/events', event, {
      params: { userId }
    });
    return response.data;
  },

  // Update a calendar event
  updateEvent: async (userId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await api.put(`/api/google-calendar/events/${eventId}`, event, {
      params: { userId }
    });
    return response.data;
  },

  // Delete a calendar event
  deleteEvent: async (userId: string, eventId: string): Promise<void> => {
    await api.delete(`/api/google-calendar/events/${eventId}`, {
      params: { userId }
    });
  },

  // Create a meeting with Google Calendar integration
  createMeeting: async (meeting: Partial<Meeting>): Promise<Meeting> => {
    const response = await api.post('/api/meetings', meeting);
    return response.data;
  },

  // Get meetings
  getMeetings: async (): Promise<Meeting[]> => {
    const response = await api.get('/api/meetings');
    return response.data;
  },

  // Get meeting by ID
  getMeeting: async (id: string): Promise<Meeting> => {
    const response = await api.get(`/api/meetings/${id}`);
    return response.data;
  },

  // Update meeting
  updateMeeting: async (id: string, meeting: Partial<Meeting>): Promise<Meeting> => {
    const response = await api.put(`/api/meetings/${id}`, meeting);
    return response.data;
  },

  // Delete meeting
  deleteMeeting: async (id: string): Promise<void> => {
    await api.delete(`/api/meetings/${id}`);
  },

  // Get meetings for a project
  getProjectMeetings: async (projectId: string): Promise<Meeting[]> => {
    const response = await api.get(`/api/meetings/project/${projectId}`);
    return response.data;
  },

  // Get meetings for a user
  getUserMeetings: async (userId: string): Promise<Meeting[]> => {
    const response = await api.get(`/api/meetings/user/${userId}`);
    return response.data;
  },

  // Get upcoming meetings
  getUpcomingMeetings: async (days: number = 7): Promise<Meeting[]> => {
    const response = await api.get('/api/meetings/upcoming', {
      params: { days }
    });
    return response.data;
  },

  // Join a meeting
  joinMeeting: async (meetingId: string): Promise<{ meetingLink: string }> => {
    const response = await api.post(`/api/meetings/${meetingId}/join`);
    return response.data;
  }
};