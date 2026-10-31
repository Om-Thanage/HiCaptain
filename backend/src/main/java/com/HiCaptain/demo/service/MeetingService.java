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
    @org.springframework.beans.factory.annotation.Autowired private OrganizationService organizations;
    @org.springframework.beans.factory.annotation.Autowired private ProjectService projects;
    private final MeetingRepository repo;
    private final ProjectRepository projectRepo;
    
    @Autowired(required = false)
    private GoogleCalendarService googleCalendarService;

    public MeetingService(MeetingRepository repo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.projectRepo = projectRepo;
    }

    public List<Meeting> getAll() { return repo.findAll().stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList(); }

    public Optional<Meeting> getById(String id) { return repo.findById(id).filter(item -> projects.getById(item.getProjectId()).isPresent()); }

    public Meeting create(Meeting m) {
        requireProject(m.getProjectId());
        validate(m);
        m.setOrganizerId(organizations.currentUserId());
        requireMember(m.getOrganizerId());
        if (m.getAttendeeIds() != null) m.getAttendeeIds().forEach(this::requireMember);
        m.setId(null);
        // Set timestamps
        m.setCreatedAt(LocalDateTime.now());
        m.setUpdatedAt(LocalDateTime.now());
        
        Meeting saved = repo.save(m);
        
        // Keep local and Google events in step when Google sync was requested.
        if (saved.isSyncWithGoogleCalendar()) {
            try {
                Event event = googleCalendarService.createMeetingEvent(saved, saved.getOrganizerId());
                saved.setGoogleEventId(event.getId());
                saved.setGoogleMeetLink(googleCalendarService.extractMeetLinkFromEvent(event));
                saved = repo.save(saved);
            } catch (Exception e) {
                repo.deleteById(saved.getId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not create the Google Calendar meeting", e);
            }
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
        Meeting existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = m.getProjectId();
        requireProject(newProjectId);
        m.setOrganizerId(existing.getOrganizerId());
        validate(m);
        m.setGoogleEventId(existing.getGoogleEventId());
        m.setGoogleMeetLink(existing.getGoogleMeetLink());
        if (m.getAttendeeIds() != null) m.getAttendeeIds().forEach(this::requireMember);

        // Set timestamps
        m.setId(id);
        m.setCreatedAt(existing.getCreatedAt()); // Keep original creation time
        m.setUpdatedAt(LocalDateTime.now());
        
        if (m.isSyncWithGoogleCalendar()) {
            try {
                Event event = m.getGoogleEventId() == null
                        ? googleCalendarService.createMeetingEvent(m, m.getOrganizerId())
                        : googleCalendarService.updateMeetingEvent(m, m.getOrganizerId());
                m.setGoogleEventId(event.getId());
                m.setGoogleMeetLink(googleCalendarService.extractMeetLinkFromEvent(event));
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not update the Google Calendar meeting", e);
            }
        } else if (m.getGoogleEventId() != null) {
            try { googleCalendarService.deleteMeetingEvent(m.getGoogleEventId(), m.getOrganizerId()); }
            catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not remove the Google Calendar meeting", e); }
            m.setGoogleEventId(null);
            m.setGoogleMeetLink(null);
        }
        Meeting saved = repo.save(m);

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
        Meeting existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        // Delete Google Calendar event if exists
        if (existing.getGoogleEventId() != null && existing.getOrganizerId() != null) {
            try {
                googleCalendarService.deleteMeetingEvent(existing.getGoogleEventId(), existing.getOrganizerId());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not remove the Google Calendar meeting", e);
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
        requireProject(projectId);
        return repo.findByProjectId(projectId);
    }
    
    public List<Meeting> getUpcomingMeetings() {
        return repo.findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now()).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
    }
    
    public List<Meeting> getMeetingsByOrganizer(String organizerId) {
        return repo.findByOrganizerIdOrderByStartTimeDesc(organizerId).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
    }
    
    public List<Meeting> getMeetingsByAttendee(String attendeeId) {
        return repo.findByAttendeeIdsContaining(attendeeId).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
    }

    private void requireProject(String id) {
        projects.getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void requireMember(String id) {
        if (id != null && !id.isBlank()) organizations.membership(organizations.currentOrgId(), id);
    }

    private void validate(Meeting meeting) {
        if (meeting.getTitle() == null || meeting.getTitle().isBlank() || meeting.getStartTime() == null
                || meeting.getEndTime() == null || !meeting.getEndTime().isAfter(meeting.getStartTime()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a title and a valid meeting time");
        if (meeting.isVirtual() && !meeting.isSyncWithGoogleCalendar())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google Meet requires Calendar sync");
        if (meeting.isSyncWithGoogleCalendar() && !googleCalendarService.isUserAuthorized(
                meeting.getOrganizerId() == null ? organizations.currentUserId() : meeting.getOrganizerId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect Google Workspace in Settings first");
    }
}
