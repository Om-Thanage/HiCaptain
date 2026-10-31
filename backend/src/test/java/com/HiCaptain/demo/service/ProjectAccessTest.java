package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Invitation;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Organization;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.util.Role;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectAccessTest {
    private final OrganizationRepository orgs = mock(OrganizationRepository.class);
    private final MembershipRepository memberships = mock(MembershipRepository.class);
    private final InvitationRepository invitations = mock(InvitationRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final OrganizationService service = new OrganizationService(orgs, memberships, invitations, users, projects, mock(JavaMailSender.class));

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    private void actor(Role role, String projectManagerId) {
        var auth = new UsernamePasswordAuthenticationToken("actor", "", List.of());
        auth.setDetails("org-1");
        SecurityContextHolder.getContext().setAuthentication(auth);
        Membership actor = new Membership(); actor.setRoles(Set.of(role));
        Membership developer = new Membership(); developer.setRoles(Set.of(Role.Developer, Role.Client));
        when(memberships.findByOrganizationIdAndUserId("org-1", "actor")).thenReturn(Optional.of(actor));
        when(memberships.findByOrganizationIdAndUserId("org-1", "target")).thenReturn(Optional.of(developer));
        Project project = new Project(); project.setId("project-1"); project.setName("Website"); project.setOrganizationId("org-1"); project.setProjectManagerId(projectManagerId); project.setDeveloperIds(List.of());
        when(projects.findById("project-1")).thenReturn(Optional.of(project));
        when(projects.save(any(Project.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test void managerCanChangeDevelopersOnOwnProjectOnly() {
        actor(Role.ProjectManager, "actor");
        assertEquals(List.of("target"), service.setProjectAccess("project-1", "target", Role.Developer, true).getDeveloperIds());
        assertThrows(ResponseStatusException.class, () -> service.setProjectAccess("project-1", "target", Role.Client, true));
    }

    @Test void managerCannotChangeAnotherManagersProject() {
        actor(Role.ProjectManager, "someone-else");
        assertThrows(ResponseStatusException.class, () -> service.setProjectAccess("project-1", "target", Role.Developer, true));
        verify(projects, never()).save(any(Project.class));
    }

    @Test void managerCannotInviteNonDeveloperOrToAnotherProject() {
        actor(Role.ProjectManager, "someone-else");
        assertThrows(ResponseStatusException.class, () -> service.invite("org-1", "new@example.com", Set.of(Role.Client), Set.of("project-1"), Role.Client));
        assertThrows(ResponseStatusException.class, () -> service.invite("org-1", "new@example.com", Set.of(Role.Developer), Set.of("project-1"), Role.Developer));
        verifyNoInteractions(invitations);
    }

    @Test void managerCanInviteDeveloperToOwnProject() {
        actor(Role.ProjectManager, "actor");
        Organization org = new Organization(); org.setName("Acme");
        when(orgs.findById("org-1")).thenReturn(Optional.of(org));
        when(invitations.save(any(Invitation.class))).thenAnswer(call -> call.getArgument(0));
        ReflectionTestUtils.setField(service, "mailFrom", "team@example.com");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com");

        var invitation = service.invite("org-1", "new@example.com", Set.of(Role.Developer), Set.of("project-1"), Role.Developer);

        assertEquals(Set.of("project-1"), invitation.projectIds());
        verify(invitations).save(argThat(value -> value.getProjectRole() == Role.Developer && value.getProjectIds().contains("project-1")));
    }

    @Test void adminCanAssignClientButCannotAssignMissingRole() {
        actor(Role.Admin, "someone-else");
        assertEquals("target", service.setProjectAccess("project-1", "target", Role.Client, true).getClientId());
        assertThrows(ResponseStatusException.class, () -> service.setProjectAccess("project-1", "target", Role.ProjectManager, true));
    }

    @Test void acceptingProjectInvitationGrantsOnlySelectedProject() {
        actor(Role.Admin, "actor");
        Invitation invitation = new Invitation();
        invitation.setEmail("target@example.com"); invitation.setOrganizationId("org-1");
        invitation.setRoles(Set.of(Role.Developer)); invitation.setProjectIds(Set.of("project-1"));
        invitation.setProjectRole(Role.Developer); invitation.setExpiresAt(Instant.now().plusSeconds(3600));
        when(invitations.findByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        when(memberships.findByOrganizationIdAndUserId("org-1", "target")).thenReturn(Optional.empty());
        when(memberships.save(any(Membership.class))).thenAnswer(call -> call.getArgument(0));
        User target = new User(); target.setId("target"); target.setEmail("target@example.com");

        Membership joined = service.accept("valid-token", target);

        assertTrue(joined.getRoles().contains(Role.Developer));
        verify(projects).save(argThat(project -> project.getDeveloperIds().contains("target")));
        assertNotNull(invitation.getAcceptedAt());
    }

    @Test void removingOrganizationRoleRevokesMatchingProjectAccess() {
        actor(Role.Admin, "actor");
        Organization org = new Organization(); org.setOwnerUserId("actor");
        when(orgs.findById("org-1")).thenReturn(Optional.of(org));
        Project project = projects.findById("project-1").orElseThrow();
        project.setDeveloperIds(List.of("target"));
        when(projects.findAll()).thenReturn(List.of(project));
        when(memberships.save(any(Membership.class))).thenAnswer(call -> call.getArgument(0));

        service.setRoles("org-1", "target", Set.of(Role.Client));

        verify(projects).save(argThat(value -> !value.getDeveloperIds().contains("target")));
    }
}
