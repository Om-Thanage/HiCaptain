package com.HiCaptain.demo.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import com.HiCaptain.demo.model.Meeting;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

@Service
@ConditionalOnClass(name = "com.google.api.services.calendar.Calendar")
public class GoogleCalendarService {

    @Autowired(required = false)
    private GoogleAuthorizationCodeFlow flow;

    @Autowired(required = false)
    private NetHttpTransport httpTransport;

    @Autowired(required = false)
    private JsonFactory jsonFactory;

    private static final String APPLICATION_NAME = "HiCaptain";
    @Autowired private JwtService jwtService;

    public String getAuthorizationUrl(String userId) {
        if (flow == null) {
            throw new RuntimeException("Google Calendar integration is not available. Please configure credentials.json file.");
        }
        return flow.newAuthorizationUrl()
                .setRedirectUri("http://localhost:8080/api/google-calendar/auth/callback")
                .setState(jwtService.generateOAuthState(userId, "google"))
                .build();
    }

    public Credential authorize(String code, String userId) throws IOException {
        if (flow == null) {
            throw new RuntimeException("Google Calendar integration is not available. Please configure credentials.json file.");
        }
        GoogleTokenResponse response = flow.newTokenRequest(code)
                .setRedirectUri("http://localhost:8080/api/google-calendar/auth/callback")
                .execute();
        
        return flow.createAndStoreCredential(response, userId);
    }

    public Calendar getCalendarService(String userId) throws IOException {
        if (flow == null || httpTransport == null) {
            throw new RuntimeException("Google Calendar integration is not available. Please configure credentials.json file.");
        }
        Credential credential = flow.loadCredential(userId);
        if (credential == null) {
            throw new IOException("No stored credential found for user: " + userId);
        }
        
        return new Calendar.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    public Event createMeetingEvent(Meeting meeting, String userId) throws IOException {
        Calendar service = getCalendarService(userId);
        
        Event event = new Event()
                .setSummary(meeting.getTitle())
                .setDescription(meeting.getDescription());

        // Set event time
        DateTime startDateTime = new DateTime(
                Date.from(meeting.getStartTime().atZone(ZoneId.systemDefault()).toInstant())
        );
        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone("UTC");
        event.setStart(start);

        DateTime endDateTime = new DateTime(
                Date.from(meeting.getEndTime().atZone(ZoneId.systemDefault()).toInstant())
        );
        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone("UTC");
        event.setEnd(end);

        // Add attendees
        if (meeting.getAttendeeEmails() != null && !meeting.getAttendeeEmails().isEmpty()) {
            EventAttendee[] attendees = meeting.getAttendeeEmails().stream()
                    .map(email -> new EventAttendee().setEmail(email))
                    .toArray(EventAttendee[]::new);
            event.setAttendees(Arrays.asList(attendees));
        }

        // Set location if it's not virtual
        if (!meeting.isVirtual() && meeting.getLocation() != null) {
            event.setLocation(meeting.getLocation());
        }

        // Add Google Meet conference
        if (meeting.isVirtual()) {
            ConferenceSolutionKey conferenceSolutionKey = new ConferenceSolutionKey()
                    .setType("hangoutsMeet");
            CreateConferenceRequest createConferenceRequest = new CreateConferenceRequest()
                    .setRequestId(meeting.getId())
                    .setConferenceSolutionKey(conferenceSolutionKey);
            ConferenceData conferenceData = new ConferenceData()
                    .setCreateRequest(createConferenceRequest);
            event.setConferenceData(conferenceData);
        }

        // Set recurrence if applicable
        if (meeting.isRecurring() && meeting.getRecurrenceRule() != null) {
            event.setRecurrence(Arrays.asList(meeting.getRecurrenceRule()));
        }

        // Create the event
        event = service.events().insert("primary", event)
                .setConferenceDataVersion(1)
                .setSendUpdates("all")
                .execute();

        return event;
    }

    public Event updateMeetingEvent(Meeting meeting, String userId) throws IOException {
        Calendar service = getCalendarService(userId);
        
        Event event = service.events().get("primary", meeting.getGoogleEventId()).execute();
        
        event.setSummary(meeting.getTitle())
             .setDescription(meeting.getDescription());

        // Update event time
        DateTime startDateTime = new DateTime(
                Date.from(meeting.getStartTime().atZone(ZoneId.systemDefault()).toInstant())
        );
        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone("UTC");
        event.setStart(start);

        DateTime endDateTime = new DateTime(
                Date.from(meeting.getEndTime().atZone(ZoneId.systemDefault()).toInstant())
        );
        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone("UTC");
        event.setEnd(end);

        // Update attendees
        if (meeting.getAttendeeEmails() != null && !meeting.getAttendeeEmails().isEmpty()) {
            EventAttendee[] attendees = meeting.getAttendeeEmails().stream()
                    .map(email -> new EventAttendee().setEmail(email))
                    .toArray(EventAttendee[]::new);
            event.setAttendees(Arrays.asList(attendees));
        }

        // Update location
        if (!meeting.isVirtual() && meeting.getLocation() != null) {
            event.setLocation(meeting.getLocation());
        }

        Event updatedEvent = service.events().update("primary", meeting.getGoogleEventId(), event)
                .setSendUpdates("all")
                .execute();

        return updatedEvent;
    }

    public void deleteMeetingEvent(String eventId, String userId) throws IOException {
        Calendar service = getCalendarService(userId);
        service.events().delete("primary", eventId).execute();
    }

    public List<Event> getUpcomingEvents(String userId, int maxResults) throws IOException {
        Calendar service = getCalendarService(userId);
        
        DateTime now = new DateTime(System.currentTimeMillis());
        Events events = service.events().list("primary")
                .setMaxResults(maxResults)
                .setTimeMin(now)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();
        
        return events.getItems();
    }

    public List<CalendarListEntry> getUserCalendars(String userId) throws IOException {
        Calendar service = getCalendarService(userId);
        CalendarList calendarList = service.calendarList().list().execute();
        return calendarList.getItems();
    }

    public String extractMeetLinkFromEvent(Event event) {
        if (event.getConferenceData() != null && 
            event.getConferenceData().getEntryPoints() != null) {
            
            return event.getConferenceData().getEntryPoints().stream()
                    .filter(entryPoint -> "video".equals(entryPoint.getEntryPointType()))
                    .map(EntryPoint::getUri)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    public boolean isUserAuthorized(String userId) {
        try {
            if (flow == null) {
                return false; // Google Calendar integration not configured
            }
            Credential credential = flow.loadCredential(userId);
            return credential != null && credential.getAccessToken() != null;
        } catch (IOException e) {
            return false;
        }
    }

    public void revokeAuthorization(String userId) throws IOException {
        Credential credential = flow.loadCredential(userId);
        if (credential != null) {
            credential.getRefreshToken(); // This will revoke the token
        }
    }
}
