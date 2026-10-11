package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Role;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {
    private final UserRepository users = mock(UserRepository.class);
    private final OrganizationService organizations = mock(OrganizationService.class);
    private final JwtService jwt = mock(JwtService.class);
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final AuthController controller = new AuthController(users, organizations, jwt, passwords);

    @Test void signupCreatesAdminMembershipAndHashesPassword() {
        when(users.save(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId("user-1");
            return user;
        });
        Membership membership = member(Set.of(Role.Admin));
        when(organizations.createOrganization(any(User.class), eq("Acme"))).thenReturn(membership);
        when(jwt.generateToken(any(User.class), eq(membership))).thenReturn("signed");

        var session = controller.register(new AuthController.Registration(" Alice ", " Alice@Example.com ", "password123", "Acme"));

        var saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertEquals("alice@example.com", saved.getValue().getEmail());
        assertNull(saved.getValue().getRole());
        assertTrue(passwords.matches("password123", saved.getValue().getPassword()));
        assertEquals("Admin", session.role());
        assertEquals("org-1", session.organizationId());
    }

    @Test void loginUsesMembershipRolesInsteadOfLegacyGlobalRole() {
        User user = new User();
        user.setId("user-1"); user.setName("Alice"); user.setEmail("alice@example.com");
        user.setPassword(passwords.encode("password123")); user.setRole(Role.Client);
        when(users.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(organizations.membershipsFor("user-1")).thenReturn(java.util.List.of(member(Set.of(Role.Admin, Role.Developer))));
        when(jwt.generateToken(any(), any())).thenReturn("signed");

        var session = controller.login(new AuthController.Login("alice@example.com", "password123"));
        assertEquals(Set.of(Role.Admin, Role.Developer), session.roles());
        assertEquals("Admin", session.role());
    }

    @Test void loginRejectsWrongPassword() {
        User user = new User(); user.setPassword(passwords.encode("rightpass"));
        when(users.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        assertThrows(ResponseStatusException.class, () -> controller.login(new AuthController.Login("alice@example.com", "wrongpass")));
        verifyNoInteractions(organizations);
    }

    private Membership member(Set<Role> roles) {
        Membership m = new Membership(); m.setUserId("user-1"); m.setOrganizationId("org-1"); m.setRoles(roles); return m;
    }
}
