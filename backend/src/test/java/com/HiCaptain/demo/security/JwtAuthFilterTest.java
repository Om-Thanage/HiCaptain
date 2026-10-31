package com.HiCaptain.demo.security;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.service.UserService;
import com.HiCaptain.demo.util.Role;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {
    private final JwtService jwt = mock(JwtService.class);
    private final UserService users = mock(UserService.class);
    private final OrganizationService organizations = mock(OrganizationService.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwt, users, organizations);
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void authoritiesComeFromCurrentMembership() throws Exception {
        var request = new MockHttpServletRequest("GET", "/projects");
        request.addHeader("Authorization", "Bearer signed");
        var response = new MockHttpServletResponse();
        when(jwt.extractUserName("signed")).thenReturn("Alice");
        when(jwt.extractUserId("signed")).thenReturn("user-1");
        when(jwt.extractOrganizationId("signed")).thenReturn("org-1");
        Membership m = new Membership(); m.setRoles(Set.of(Role.Admin, Role.Developer));
        when(organizations.membership("org-1", "user-1")).thenReturn(m);
        when(users.getById("user-1")).thenReturn(Optional.of(new User()));
        filter.doFilter(request, response, (req, res) -> {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            assertEquals("user-1", auth.getName());
            assertEquals(2, auth.getAuthorities().size());
            assertEquals("org-1", auth.getDetails());
        });
        assertEquals(200, response.getStatus());
    }

    @Test void revokedMembershipRejectsOldToken() throws Exception {
        var request = new MockHttpServletRequest("GET", "/projects");
        request.addHeader("Authorization", "Bearer signed");
        var response = new MockHttpServletResponse();
        when(jwt.extractUserName("signed")).thenReturn("Alice");
        when(jwt.extractUserId("signed")).thenReturn("user-1");
        when(jwt.extractOrganizationId("signed")).thenReturn("org-1");
        when(organizations.membership("org-1", "user-1")).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN));
        filter.doFilter(request, response, (req, res) -> fail("Request reached controller"));
        assertEquals(401, response.getStatus());
    }

    @Test void passwordChangeRejectsPreviouslyIssuedTokens() throws Exception {
        var request = new MockHttpServletRequest("GET", "/projects"); request.addHeader("Authorization", "Bearer signed");
        var response = new MockHttpServletResponse();
        when(jwt.extractUserName("signed")).thenReturn("Alice"); when(jwt.extractUserId("signed")).thenReturn("user-1");
        when(jwt.extractOrganizationId("signed")).thenReturn("org-1");
        Membership membership = new Membership(); membership.setRoles(Set.of(Role.Developer));
        when(organizations.membership("org-1", "user-1")).thenReturn(membership);
        User user = new User(); user.setSessionVersion(1L);
        when(users.getById("user-1")).thenReturn(Optional.of(user));
        when(jwt.extractSessionVersion("signed")).thenReturn(0L);
        filter.doFilter(request, response, (req, res) -> fail("Revoked session reached controller"));
        assertEquals(401, response.getStatus());
    }
}
