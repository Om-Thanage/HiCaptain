package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.util.Role;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProjectDriveFolderTest {
    @Test void ordinaryProjectUpdatePreservesConfiguredFolderAndManagedShares() {
        ProjectRepository repository = mock(ProjectRepository.class);
        OrganizationService organizations = mock(OrganizationService.class);
        ProjectService service = new ProjectService(repository, mock(TaskRepository.class), mock(UserRepository.class), organizations);
        Membership admin = new Membership(); admin.setRoles(Set.of(Role.Admin));
        when(organizations.currentOrgId()).thenReturn("org-1");
        when(organizations.currentUserId()).thenReturn("admin-1");
        when(organizations.membership("org-1", "admin-1")).thenReturn(admin);
        Project existing = new Project(); existing.setId("project-1"); existing.setOrganizationId("org-1");
        existing.setGoogleDriveFolderId("folder-1"); existing.setGoogleDriveOwnerUserId("admin-1");
        existing.setGoogleDrivePermissionIds(Map.of("member@example.com", "permission-1"));
        when(repository.findById("project-1")).thenReturn(Optional.of(existing));
        when(repository.save(any(Project.class))).thenAnswer(call -> call.getArgument(0));

        Project edited = new Project(); edited.setName("Renamed project");
        Project saved = service.update("project-1", edited);

        assertEquals("folder-1", saved.getGoogleDriveFolderId());
        assertEquals("admin-1", saved.getGoogleDriveOwnerUserId());
        assertEquals(Map.of("member@example.com", "permission-1"), saved.getGoogleDrivePermissionIds());
    }
}
