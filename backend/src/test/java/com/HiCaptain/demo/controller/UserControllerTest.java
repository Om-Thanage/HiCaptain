package com.HiCaptain.demo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Role;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class UserControllerTest {
    @Test
    void profileEditUpdatesOnlyTheSignedInUserAndReturnsAFreshSession() {
        OrganizationService organizations = mock(OrganizationService.class);
        UserRepository users = mock(UserRepository.class);
        AuthController auth = mock(AuthController.class);
        UserController controller = new UserController(organizations, users, auth);
        User user = new User();
        user.setId("signed-in-user");
        user.setName("member_123456");
        Membership membership = new Membership();
        membership.setOrganizationId("org-1");
        membership.setRoles(Set.of(Role.Admin));
        when(organizations.currentUserId()).thenReturn("signed-in-user");
        when(organizations.currentOrgId()).thenReturn("org-1");
        when(organizations.membership("org-1", "signed-in-user")).thenReturn(membership);
        when(users.findById("signed-in-user")).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        when(auth.session(user, membership)).thenReturn(new AuthController.Session("new-jwt", "signed-in-user",
                "Om Thanage", "om@example.com", "Admin", "org-1", Set.of(Role.Admin)));

        var session = controller.updateProfile(new UserController.ProfileRequest("  Om Thanage  "));

        assertEquals("Om Thanage", user.getName());
        assertEquals("new-jwt", session.token());
        verify(users).findById("signed-in-user");
        verify(users).save(user);
    }
}
