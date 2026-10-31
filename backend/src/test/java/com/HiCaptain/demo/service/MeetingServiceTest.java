package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.MeetingRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MeetingServiceTest {
    @Test void failedGoogleEventDoesNotLeaveLocalMeeting() throws IOException {
        MeetingRepository meetings = mock(MeetingRepository.class);
        ProjectRepository projectRepo = mock(ProjectRepository.class);
        ProjectService projects = mock(ProjectService.class);
        OrganizationService organizations = mock(OrganizationService.class);
        GoogleCalendarService google = mock(GoogleCalendarService.class);
        MeetingService service = new MeetingService(meetings, projectRepo);
        ReflectionTestUtils.setField(service, "projects", projects);
        ReflectionTestUtils.setField(service, "organizations", organizations);
        ReflectionTestUtils.setField(service, "googleCalendarService", google);

        when(projects.getById("project-1")).thenReturn(Optional.of(new Project()));
        when(organizations.currentUserId()).thenReturn("user-1");
        when(organizations.currentOrgId()).thenReturn("org-1");
        when(google.isUserAuthorized("user-1")).thenReturn(true);
        when(meetings.save(any(Meeting.class))).thenAnswer(invocation -> {
            Meeting meeting = invocation.getArgument(0);
            meeting.setId("meeting-1");
            return meeting;
        });
        when(google.createMeetingEvent(any(Meeting.class), eq("user-1"))).thenThrow(new IOException("Calendar unavailable"));

        Meeting meeting = new Meeting();
        meeting.setProjectId("project-1");
        meeting.setTitle("Planning");
        meeting.setStartTime(LocalDateTime.of(2026, 10, 12, 9, 0));
        meeting.setEndTime(LocalDateTime.of(2026, 10, 12, 10, 0));
        meeting.setSyncWithGoogleCalendar(true);

        assertThrows(ResponseStatusException.class, () -> service.create(meeting));
        verify(meetings).deleteById("meeting-1");
        verify(projectRepo, never()).save(any(Project.class));
    }
}
