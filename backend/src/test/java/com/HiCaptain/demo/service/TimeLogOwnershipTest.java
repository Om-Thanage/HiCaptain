package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.util.Role;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TimeLogOwnershipTest {
    @Test void developerCannotRewriteAnotherMembersTimeLog() {
        var logs = mock(TimeLogRepository.class); var projects = mock(ProjectService.class); var orgs = mock(OrganizationService.class);
        var service = new TimeLogService(logs, mock(ProjectRepository.class));
        ReflectionTestUtils.setField(service, "projects", projects); ReflectionTestUtils.setField(service, "organizations", orgs);
        var existing = new TimeLog(); existing.setProjectId("shared"); existing.setUserId("other-member");
        when(logs.findById("log")).thenReturn(Optional.of(existing)); when(projects.getById("shared")).thenReturn(Optional.of(new Project()));
        when(orgs.currentOrgId()).thenReturn("org"); when(orgs.currentUserId()).thenReturn("developer");
        var membership = new Membership(); membership.setRoles(Set.of(Role.Developer));
        when(orgs.membership("org", "developer")).thenReturn(membership);
        assertThrows(Exception.class, () -> service.update("log", new TimeLog()));
        verify(logs, never()).save(any());
    }
}
