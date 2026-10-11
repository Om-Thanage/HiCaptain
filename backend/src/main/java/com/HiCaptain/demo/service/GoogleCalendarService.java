package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.GoogleWorkspaceConnection;
import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.repository.GoogleWorkspaceConnectionRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.List;

@Service
public class GoogleCalendarService {
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = List.of(
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/tasks");
    private final GoogleWorkspaceConnectionRepository connections;
    private final JwtService jwtService;
    private final String clientId;
    private final String clientSecret;
    private final String tokenKey;
    private final String redirectUri;

    public GoogleCalendarService(GoogleWorkspaceConnectionRepository connections, JwtService jwtService,
            @Value("${google.workspace.client-id:}") String clientId,
            @Value("${google.workspace.client-secret:}") String clientSecret,
            @Value("${google.workspace.token-key:}") String tokenKey,
            @Value("${google.workspace.redirect-uri:http://localhost:8080/api/google-calendar/auth/callback}") String redirectUri) {
        this.connections = connections;
        this.jwtService = jwtService;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tokenKey = tokenKey;
        this.redirectUri = redirectUri;
    }

    private GoogleClientSecrets secrets() throws IOException {
        if (clientId.isBlank() || clientSecret.isBlank())
            throw new IOException("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured");
        return new GoogleClientSecrets().setWeb(new GoogleClientSecrets.Details()
                .setClientId(clientId).setClientSecret(clientSecret));
    }

    private NetHttpTransport transport() throws IOException {
        try { return GoogleNetHttpTransport.newTrustedTransport(); }
        catch (GeneralSecurityException error) { throw new IOException("Could not initialize Google transport", error); }
    }

    private GoogleAuthorizationCodeFlow flow() throws IOException {
        return new GoogleAuthorizationCodeFlow.Builder(transport(), JSON_FACTORY, secrets(), SCOPES)
                .setAccessType("offline").build();
    }

    private SecretKeySpec encryptionKey() throws IOException {
        try {
            byte[] raw = Base64.getDecoder().decode(tokenKey);
            if (raw.length != 32) throw new IllegalArgumentException("Expected a 32-byte key");
            return new SecretKeySpec(raw, "AES");
        } catch (IllegalArgumentException error) { throw new IOException("GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key", error); }
    }

    private String encrypt(String value) throws IOException {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] result = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(encrypted, 0, result, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException error) { throw new IOException("Could not encrypt Google token", error); }
    }

    private String decrypt(String value) throws IOException {
        try {
            byte[] bytes = Base64.getDecoder().decode(value);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Arrays.copyOfRange(bytes, 0, 12)));
            return new String(cipher.doFinal(bytes, 12, bytes.length - 12), java.nio.charset.StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) { throw new IOException("Could not decrypt Google token", error); }
    }

    public String getAuthorizationUrl(String userId) throws IOException {
        encryptionKey();
        return flow().newAuthorizationUrl().setRedirectUri(redirectUri)
                .setState(jwtService.generateOAuthState(userId, "google"))
                .set("prompt", "consent").build();
    }

    public void authorize(String code, String userId) throws IOException {
        GoogleTokenResponse response = flow().newTokenRequest(code).setRedirectUri(redirectUri).execute();
        String refreshToken = response.getRefreshToken();
        if (refreshToken == null) refreshToken = connections.findById(userId)
                .map(connection -> {
                    try { return decrypt(connection.encryptedRefreshToken()); }
                    catch (IOException error) { return null; }
                }).orElse(null);
        if (refreshToken == null) throw new IOException("Google did not return a refresh token. Reconnect and grant consent.");
        connections.save(new GoogleWorkspaceConnection(userId, encrypt(refreshToken)));
    }

    public String getAccessToken(String userId) throws IOException {
        GoogleWorkspaceConnection saved = connections.findById(userId)
                .orElseThrow(() -> new IOException("Connect Google Workspace in Settings first"));
        GoogleCredential credential = new GoogleCredential.Builder().setTransport(transport())
                .setJsonFactory(JSON_FACTORY).setClientSecrets(secrets()).build();
        credential.setRefreshToken(decrypt(saved.encryptedRefreshToken()));
        if (!credential.refreshToken() || credential.getAccessToken() == null) throw new IOException("Google authorization expired. Reconnect in Settings.");
        if (credential.getRefreshToken() != null && !credential.getRefreshToken().equals(decrypt(saved.encryptedRefreshToken())))
            connections.save(new GoogleWorkspaceConnection(userId, encrypt(credential.getRefreshToken())));
        return credential.getAccessToken();
    }

    public Calendar getCalendarService(String userId) throws IOException {
        GoogleCredential credential = new GoogleCredential();
        credential.setAccessToken(getAccessToken(userId));
        return new Calendar.Builder(transport(), JSON_FACTORY, credential).setApplicationName("HiCaptain").build();
    }

    public Event createMeetingEvent(Meeting meeting, String userId) throws IOException {
        Calendar service = getCalendarService(userId);
        
        Event event = new Event()
                .setSummary(meeting.getTitle())
                .setDescription(meeting.getDescription());

        // Set event time
        DateTime startDateTime = new DateTime(
                Date.from(meeting.getStartTime().atZone(zone(meeting)).toInstant())
        );
        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone(zone(meeting).getId());
        event.setStart(start);

        DateTime endDateTime = new DateTime(
                Date.from(meeting.getEndTime().atZone(zone(meeting)).toInstant())
        );
        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone(zone(meeting).getId());
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
                    .setRequestId(java.util.UUID.randomUUID().toString())
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
                Date.from(meeting.getStartTime().atZone(zone(meeting)).toInstant())
        );
        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone(zone(meeting).getId());
        event.setStart(start);

        DateTime endDateTime = new DateTime(
                Date.from(meeting.getEndTime().atZone(zone(meeting)).toInstant())
        );
        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone(zone(meeting).getId());
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

        if (meeting.isVirtual() && event.getConferenceData() == null) {
            event.setConferenceData(new ConferenceData().setCreateRequest(new CreateConferenceRequest()
                    .setRequestId(java.util.UUID.randomUUID().toString())
                    .setConferenceSolutionKey(new ConferenceSolutionKey().setType("hangoutsMeet"))));
        }
        Event updatedEvent = service.events().update("primary", meeting.getGoogleEventId(), event)
                .setConferenceDataVersion(1)
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

    public List<Event> getEvents(String userId, DateTime start, DateTime end) throws IOException {
        Events events = getCalendarService(userId).events().list("primary")
                .setTimeMin(start).setTimeMax(end).setMaxResults(250)
                .setOrderBy("startTime").setSingleEvents(true).execute();
        return events.getItems() == null ? List.of() : events.getItems();
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
        return event.getHangoutLink();
    }

    private ZoneId zone(Meeting meeting) {
        return ZoneId.of(meeting.getTimeZone() == null || meeting.getTimeZone().isBlank() ? "UTC" : meeting.getTimeZone());
    }

    public boolean isUserAuthorized(String userId) {
        return connections.existsById(userId);
    }

    public void revokeAuthorization(String userId) throws IOException {
        var saved = connections.findById(userId);
        connections.deleteById(userId);
        if (saved.isEmpty()) return;
        String token = decrypt(saved.get().encryptedRefreshToken());
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/revoke"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("token=" + java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8)))
                    .build();
            HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IOException("Google revocation was interrupted", error);
        }
    }
}
