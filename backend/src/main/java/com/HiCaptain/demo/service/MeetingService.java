package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.repository.MeetingRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.google.api.services.calendar.model.Event;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class MeetingService {
    private final MeetingRepository repo;
    private final ProjectRepository projectRepo;
    
    @Autowired(required = false)
    private GoogleCalendarService googleCalendarService;

    public MeetingService(MeetingRepository repo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.projectRepo = projectRepo;
    }

    public List<Meeting> getAll() { return repo.findAll(); }

    public Optional<Meeting> getById(String id) { return repo.findById(id); }

    public Meeting create(Meeting m) {
        // Set timestamps
        m.setCreatedAt(LocalDateTime.now());
        m.setUpdatedAt(LocalDateTime.now());
        
        Meeting saved = repo.save(m);
        
        // Create Google Calendar event if user wants sync
        if (saved.isSyncWithGoogleCalendar() && saved.getOrganizerId() != null && googleCalendarService != null) {
            try {
                Event event = googleCalendarService.createMeetingEvent(saved, saved.getOrganizerId());
                saved.setGoogleEventId(event.getId());
                saved.setGoogleMeetLink(googleCalendarService.extractMeetLinkFromEvent(event));
                saved = repo.save(saved);
            } catch (Exception e) {
                // Log error but don't fail the meeting creation
                System.err.println("Failed to create Google Calendar event: " + e.getMessage());
            }
        } else if (saved.isSyncWithGoogleCalendar() && googleCalendarService == null) {
            System.err.println("Warning: Google Calendar sync requested but service is not available");
        }
        
        final Meeting finalSaved = saved;
        if (finalSaved.getProjectId() != null) {
            projectRepo.findById(finalSaved.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(finalSaved.getId())) {
                    ids.add(finalSaved.getId());
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }
        return saved;
    }

    public Meeting update(String id, Meeting m) {
        Meeting existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = m.getProjectId();

        // Set timestamps
        m.setId(id);
        m.setCreatedAt(existing.getCreatedAt()); // Keep original creation time
        m.setUpdatedAt(LocalDateTime.now());
        
        Meeting saved = repo.save(m);
        
        // Update Google Calendar event if exists and sync is enabled
        if (saved.isSyncWithGoogleCalendar() && saved.getGoogleEventId() != null && saved.getOrganizerId() != null && googleCalendarService != null) {
            try {
                googleCalendarService.updateMeetingEvent(saved, saved.getOrganizerId());
            } catch (Exception e) {
                // Log error but don't fail the meeting update
                System.err.println("Failed to update Google Calendar event: " + e.getMessage());
            }
        }

        if (!Objects.equals(oldProjectId, newProjectId)) {
            if (oldProjectId != null) {
                projectRepo.findById(oldProjectId).ifPresent(p -> {
                    List<String> ids = p.getMeetingIds();
                    if (ids != null && ids.remove(id)) {
                        p.setMeetingIds(ids);
                        projectRepo.save(p);
                    }
                });
            }
        }
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(id)) {
                    ids.add(id);
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        Meeting existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        // Delete Google Calendar event if exists
        if (existing.getGoogleEventId() != null && existing.getOrganizerId() != null && googleCalendarService != null) {
            try {
                googleCalendarService.deleteMeetingEvent(existing.getGoogleEventId(), existing.getOrganizerId());
            } catch (Exception e) {
                // Log error but don't fail the meeting deletion
                System.err.println("Failed to delete Google Calendar event: " + e.getMessage());
            }
        }

        repo.deleteById(id);

        if (existing.getProjectId() != null) {
            projectRepo.findById(existing.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids != null && ids.remove(id)) {
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }
    }
    
    public List<Meeting> getMeetingsByProjectId(String projectId) {
        return repo.findByProjectId(projectId);
    }
    
    public List<Meeting> getUpcomingMeetings() {
        return repo.findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now());
    }
    
    public List<Meeting> getMeetingsByOrganizer(String organizerId) {
        return repo.findByOrganizerIdOrderByStartTimeDesc(organizerId);
    }
    
    public List<Meeting> getMeetingsByAttendee(String attendeeId) {
        return repo.findByAttendeeIdsContaining(attendeeId);
    }
}
