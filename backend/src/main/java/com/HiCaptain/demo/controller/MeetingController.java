package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.service.MeetingService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@CrossOrigin(origins = "http://localhost:3000")
public class MeetingController {
    private final MeetingService svc;

    public MeetingController(MeetingService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Meeting>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Meeting> getById(@PathVariable String id) {
        return svc.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Meeting>> getMeetingsByProject(@PathVariable String projectId) {
        return ResponseEntity.ok(svc.getMeetingsByProjectId(projectId));
    }

    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Meeting>> getUpcomingMeetings() {
        return ResponseEntity.ok(svc.getUpcomingMeetings());
    }

    @GetMapping("/organizer/{organizerId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Meeting>> getMeetingsByOrganizer(@PathVariable String organizerId) {
        return ResponseEntity.ok(svc.getMeetingsByOrganizer(organizerId));
    }

    @GetMapping("/attendee/{attendeeId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Meeting>> getMeetingsByAttendee(@PathVariable String attendeeId) {
        return ResponseEntity.ok(svc.getMeetingsByAttendee(attendeeId));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Meeting> create(@RequestBody Meeting m) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(m));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Meeting> update(@PathVariable String id, @RequestBody Meeting m) {
        return ResponseEntity.ok(svc.update(id, m));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
