package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TaskAssignmentSecurityTest {
    @Test void assigningAnOrganizationMemberCannotExpandProjectMembership() {
        var tasks = mock(TaskRepository.class); var projectRepo = mock(ProjectRepository.class);
        var users = mock(UserRepository.class); var projects = mock(ProjectService.class); var orgs = mock(OrganizationService.class);
        var service = new TaskService(tasks, projectRepo, users, projects, orgs);
        var project = new Project(); project.setId("project"); project.setDeveloperIds(List.of("existing"));
        when(projects.getById("project")).thenReturn(Optional.of(project));
        var task = new Task(); task.setProjectId("project"); task.setAssignedDeveloperIds(List.of("unassigned-member"));
        assertThrows(Exception.class, () -> service.create(task));
        verifyNoInteractions(tasks, projectRepo, users);
        assertEquals(List.of("existing"), project.getDeveloperIds());
    }
    @Test void inaccessibleTasksCannotBeEdited() {
        var tasks = mock(TaskRepository.class); var projects = mock(ProjectService.class);
        var task = new Task(); task.setProjectId("private-project");
        when(tasks.findById("task")).thenReturn(Optional.of(task));
        when(projects.getById("private-project")).thenReturn(Optional.empty());
        var service = new TaskService(tasks, mock(ProjectRepository.class), mock(UserRepository.class), projects, mock(OrganizationService.class));
        assertThrows(Exception.class, () -> service.update("task", new Task()));
        verify(tasks, never()).save(any());
    }
}
