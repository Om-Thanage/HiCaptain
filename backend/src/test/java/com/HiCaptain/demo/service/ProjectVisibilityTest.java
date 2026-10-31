package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.util.Role;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectVisibilityTest {
    @Test void projectReadsFollowAssignedAccess() {
        ProjectRepository projects = mock(ProjectRepository.class);
        OrganizationService organizations = mock(OrganizationService.class);
        ProjectService service = new ProjectService(projects, mock(TaskRepository.class), mock(UserRepository.class), organizations);
        Membership member = new Membership(); member.setRoles(Set.of(Role.Developer));
        Project assigned = new Project(); assigned.setId("assigned"); assigned.setOrganizationId("org-1"); assigned.setDeveloperIds(List.of("user-1"));
        Project other = new Project(); other.setId("other"); other.setOrganizationId("org-1"); other.setDeveloperIds(List.of("user-2"));
        when(organizations.currentOrgId()).thenReturn("org-1"); when(organizations.currentUserId()).thenReturn("user-1");
        when(organizations.membership("org-1", "user-1")).thenReturn(member);
        when(projects.findAll()).thenReturn(List.of(assigned, other));
        when(projects.findById("other")).thenReturn(Optional.of(other));

        assertEquals(List.of(assigned), service.getAll());
        assertTrue(service.getById("other").isEmpty());
    }
}
