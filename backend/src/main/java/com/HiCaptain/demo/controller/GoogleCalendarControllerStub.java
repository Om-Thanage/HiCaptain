package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.GoogleCalendarServiceStub;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calendar")
@CrossOrigin(origins = "http://localhost:3000")
@ConditionalOnMissingClass("com.google.api.services.calendar.Calendar")
public class GoogleCalendarControllerStub {

    @Autowired
    private GoogleCalendarServiceStub googleCalendarServiceStub;

    @GetMapping("/status")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok("Google Calendar integration is not available. Please configure Google Calendar API dependencies.");
    }

    @GetMapping("/events")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> getEvents(@RequestParam String userId, @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.badRequest().body("Google Calendar integration is not available. Please configure Google Calendar API dependencies.");
    }

    @GetMapping("/auth")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<String> getAuthUrl(@RequestParam String userId) {
        return ResponseEntity.badRequest().body("Google Calendar integration is not available. Please configure Google Calendar API dependencies.");
    }
}