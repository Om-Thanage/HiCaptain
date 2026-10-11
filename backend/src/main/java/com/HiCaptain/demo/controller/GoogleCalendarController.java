package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.GoogleCalendarService;
import com.google.api.services.calendar.model.CalendarListEntry;
import com.google.api.services.calendar.model.Event;
import com.google.api.client.util.DateTime;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/google-calendar")
@CrossOrigin(origins = "http://localhost:3000")
@ConditionalOnClass(name = "com.google.api.services.calendar.Calendar")
public class GoogleCalendarController {

    @Autowired
    private GoogleCalendarService googleCalendarService;
    @Autowired private com.HiCaptain.demo.service.JwtService jwtService;
    @Value("${app.frontend-url:http://localhost:3000}") private String frontendUrl;

    @GetMapping("/auth/url")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> getAuthorizationUrl(@RequestParam String userId) {
        requireCurrentUser(userId);
        try {
            String authUrl = googleCalendarService.getAuthorizationUrl(userId);
            return ResponseEntity.ok(authUrl);
        } catch (IOException e) {
            // Handle missing credentials gracefully
            return ResponseEntity.badRequest().body("Google Calendar integration not configured: " + e.getMessage());
        }
    }

    @GetMapping("/auth/callback")
    public void handleCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        
        try {
            String userId = jwtService.verifyOAuthState(state, "google");
            googleCalendarService.authorize(code, userId);
            
            // Redirect to frontend success page
            response.sendRedirect(frontendUrl + "/settings?google=connected");
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/settings?google=error");
        }
    }

    @GetMapping("/events/upcoming")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Event>> getUpcomingEvents(
            @RequestParam String userId,
            @RequestParam(defaultValue = "10") int maxResults) {
        requireCurrentUser(userId);
        
        try {
            List<Event> events = googleCalendarService.getUpcomingEvents(userId, maxResults);
            return ResponseEntity.ok(events);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/events")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Event>> getEvents(@RequestParam String userId, @RequestParam String from,
            @RequestParam String to) throws IOException {
        requireCurrentUser(userId);
        if (!googleCalendarService.isUserAuthorized(userId))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Connect Google Workspace in Settings first");
        Instant start = Instant.parse(from);
        Instant end = Instant.parse(to);
        if (!end.isAfter(start) || end.isAfter(start.plus(java.time.Duration.ofDays(62))))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Choose a date range within 62 days");
        return ResponseEntity.ok(googleCalendarService.getEvents(userId, new DateTime(start.toEpochMilli()), new DateTime(end.toEpochMilli())));
    }

    @GetMapping("/calendars")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<CalendarListEntry>> getUserCalendars(@RequestParam String userId) {
        requireCurrentUser(userId);
        try {
            List<CalendarListEntry> calendars = googleCalendarService.getUserCalendars(userId);
            return ResponseEntity.ok(calendars);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/auth/status")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Boolean> checkAuthStatus(@RequestParam String userId) {
        requireCurrentUser(userId);
        try {
            boolean isAuthorized = googleCalendarService.isUserAuthorized(userId);
            return ResponseEntity.ok(isAuthorized);
        } catch (Exception e) {
            // If Google Calendar is not configured, return false
            return ResponseEntity.ok(false);
        }
    }

    @GetMapping("/test")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Google Calendar controller is working and authenticated!");
    }

    @GetMapping("/debug")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> debugEndpoint(@RequestParam String userId) {
        requireCurrentUser(userId);
        try {
            boolean isAuthorized = googleCalendarService.isUserAuthorized(userId);
            return ResponseEntity.ok("User " + userId + " is authorized: " + isAuthorized);
        } catch (Exception e) {
            return ResponseEntity.ok("Error checking authorization for user " + userId + ": " + e.getMessage());
        }
    }

    @PostMapping("/auth/revoke")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> revokeAuthorization(@RequestParam String userId) {
        requireCurrentUser(userId);
        try {
            googleCalendarService.revokeAuthorization(userId);
            return ResponseEntity.ok("Authorization revoked successfully");
        } catch (IOException e) {
            return ResponseEntity.badRequest().body("Failed to revoke authorization");
        }
    }
    private void requireCurrentUser(String userId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !userId.equals(auth.getName())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        }
    }
}
