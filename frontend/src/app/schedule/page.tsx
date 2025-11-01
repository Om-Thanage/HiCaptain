'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Calendar, Plus, Clock, Users, Video, MapPin, ChevronLeft, ChevronRight, Edit, Trash2, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { calendarService, Meeting, CalendarEvent } from '@/services/calendar';
import EventModal from '@/components/EventModal';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'meeting' | 'deadline' | 'task' | 'review';
  attendees?: string[];
  location?: string;
  isVirtual?: boolean;
  priority: 'low' | 'medium' | 'high';
  googleEventId?: string;
  googleMeetLink?: string;
  meetingLink?: string;
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadScheduleData();
  }, []);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      // Load meetings from backend
      const meetingsData = await calendarService.getMeetings();
      setMeetings(meetingsData);

      // Try to load Google Calendar events if available
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id) {
          const googleEvents = await calendarService.getEvents(currentUser.id, 30);
          setCalendarEvents(googleEvents);
          setGoogleCalendarConnected(true);
        }
      } catch (error) {
        console.log('Google Calendar not connected or available');
        setGoogleCalendarConnected(false);
      }

      // Convert meetings and events to unified Event format
      const combinedEvents = [
        ...meetingsData.map(meeting => ({
          id: meeting.id,
          title: meeting.title,
          description: meeting.description || '',
          startTime: new Date(meeting.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          endTime: new Date(meeting.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          date: new Date(meeting.startTime).toISOString().split('T')[0],
          type: 'meeting' as const,
          attendees: meeting.participants,
          isVirtual: !!meeting.googleMeetLink || !!meeting.meetingLink,
          priority: (meeting as any).priority || 'medium' as const,
          googleEventId: meeting.googleEventId,
          googleMeetLink: meeting.googleMeetLink,
          meetingLink: meeting.meetingLink || meeting.googleMeetLink
        })),
        ...calendarEvents.map(event => ({
          id: event.id,
          title: event.summary,
          description: event.description || '',
          startTime: new Date(event.start.dateTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          endTime: new Date(event.end.dateTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          date: new Date(event.start.dateTime).toISOString().split('T')[0],
          type: 'meeting' as const,
          attendees: event.attendees?.map(a => a.displayName || a.email) || [],
          isVirtual: !!event.meetLink,
          priority: 'medium' as const,
          googleEventId: event.id,
          meetingLink: event.meetLink
        }))
      ];

      setEvents(combinedEvents);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      toast.error('Failed to load schedule data');
      
      // Fallback to mock data
      setEvents([
        {
          id: '1',
          title: 'Sprint Planning Meeting',
          description: 'Plan tasks for the upcoming sprint',
          startTime: '09:00',
          endTime: '10:30',
          date: new Date().toISOString().split('T')[0],
          type: 'meeting',
          attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
          location: 'Conference Room A',
          isVirtual: false,
          priority: 'high'
        },
        {
          id: '2',
          title: 'Client Review Session',
          description: 'Review project progress with client',
          startTime: '14:00',
          endTime: '15:00',
          date: new Date().toISOString().split('T')[0],
          type: 'review',
          attendees: ['Client Team'],
          isVirtual: true,
          priority: 'high'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const syncWithGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        toast.error('Please log in to sync with Google Calendar');
        return;
      }

      // Check if user is authorized
      const authUrl = await calendarService.getAuthUrl(currentUser.id);
      if (authUrl) {
        // Open authorization URL in new window
        window.open(authUrl, '_blank');
        toast.success('Please complete Google Calendar authorization');
      } else {
        // Already authorized, sync events
        await loadScheduleData();
        toast.success('Schedule synced with Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      toast.error('Failed to sync with Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-900/20 text-blue-300 border border-blue-800';
      case 'deadline':
        return 'bg-red-900/20 text-red-300 border border-red-800';
      case 'task':
        return 'bg-green-900/20 text-green-300 border border-green-800';
      case 'review':
        return 'bg-purple-900/20 text-purple-300 border border-purple-800';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-slate-500';
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 bg-slate-800/50 border border-slate-700"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = date.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateString);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-24 p-2 border border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors ${
            isToday ? 'bg-blue-900/20 border-blue-700' : 'bg-slate-800'
          } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-300' : 'text-slate-300'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event, index) => (
              <div
                key={index}
                className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.type)}`}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-slate-400">+{dayEvents.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = getEventsForDate(selectedDate.toISOString().split('T')[0]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-slate-800 rounded-lg p-6">
                <div className="h-6 bg-slate-700 rounded mb-2"></div>
                <div className="h-8 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 animate-pulse bg-slate-800 rounded-lg h-96"></div>
            <div className="animate-pulse bg-slate-800 rounded-lg h-96"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Schedule</h1>
            <div className="flex items-center space-x-4 mt-2">
              <p className="text-slate-400">Manage meetings, deadlines, and events</p>
              {googleCalendarConnected && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/20 text-green-300 rounded-full border border-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Google Calendar Connected</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={syncWithGoogleCalendar}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </button>
            <button 
              onClick={() => setShowEventModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Event
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Today's Events</p>
                <p className="text-2xl font-bold text-slate-100">
                  {getEventsForDate(new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">This Week</p>
                <p className="text-2xl font-bold text-slate-100">
                  {events.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Deadlines</p>
                <p className="text-2xl font-bold text-slate-100">
                  {events.filter(e => e.type === 'deadline').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Virtual Meetings</p>
                <p className="text-2xl font-bold text-slate-100">
                  {events.filter(e => e.isVirtual).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">{formatDate(currentDate)}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={getPreviousMonth}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </button>
                  <button
                    onClick={getNextMonth}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-0 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-slate-400">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0">
                {renderCalendar()}
              </div>
            </div>
          </div>

          {/* Selected Date Events */}
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>
            <div className="p-6">
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className={`bg-slate-700 rounded-lg p-4 border-l-4 ${getPriorityColor(event.priority)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-slate-100">{event.title}</h4>
                            {event.googleEventId && (
                              <div className="px-2 py-1 bg-blue-900/20 text-blue-300 text-xs rounded-full border border-blue-800">
                                Google
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-2 mt-1">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-400">{event.location}</span>
                            </div>
                          )}
                          {event.isVirtual && (
                            <div className="flex items-center space-x-2 mt-1">
                              <Video className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-400">Virtual Meeting</span>
                              {event.meetingLink && (
                                <button
                                  onClick={() => window.open(event.meetingLink, '_blank')}
                                  className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="text-xs">Join</span>
                                </button>
                              )}
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center space-x-2 mt-1">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-400">
                                {event.attendees.length} attendees
                              </span>
                              <div className="flex items-center space-x-1">
                                {event.attendees.slice(0, 3).map((attendee, index) => (
                                  <div
                                    key={index}
                                    className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-medium"
                                    title={attendee}
                                  >
                                    {attendee.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {event.attendees.length > 3 && (
                                  <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs text-slate-300">
                                    +{event.attendees.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            {event.googleMeetLink && (
                              <button
                                onClick={() => window.open(event.googleMeetLink, '_blank')}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-green-900/20 text-green-300 rounded-full text-xs hover:bg-green-900/30 transition-colors border border-green-800"
                              >
                                <Video className="w-3 h-3" />
                                <span>Google Meet</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => {
                              setEditingEvent(event);
                              setShowEventModal(true);
                            }}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this event?')) {
                                try {
                                  await calendarService.deleteMeeting(event.id);
                                  toast.success('Event deleted successfully!');
                                  loadScheduleData();
                                } catch (error) {
                                  console.error('Error deleting event:', error);
                                  toast.error('Failed to delete event');
                                }
                              }
                            }}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="text-slate-400 mt-2">No events scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onEventCreated={loadScheduleData}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
      />
    </DashboardLayout>
  );
}