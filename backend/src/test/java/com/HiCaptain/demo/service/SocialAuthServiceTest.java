package com.HiCaptain.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.HiCaptain.demo.controller.AuthController;
import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.SocialLoginTicket;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.SocialIdentityRepository;
import com.HiCaptain.demo.repository.SocialLoginTicketRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class SocialAuthServiceTest {
    @Mock UserRepository users;
    @Mock SocialIdentityRepository identities;
    @Mock SocialLoginTicketRepository tickets;
    @Mock MongoTemplate mongo;
    @Mock OrganizationService organizations;
    @Mock PasswordEncoder passwords;
    @Mock AuthController auth;
    @Mock ObjectMapper json;
    @InjectMocks SocialAuthService social;

    @Test
    void newVerifiedIdentityMustCreateAnAdminOrganizationBeforeSigningIn() {
        SocialLoginTicket ticket = new SocialLoginTicket();
        ticket.setProvider("google");
        ticket.setSubject("google-user-1");
        ticket.setEmail("member@example.com");
        ticket.setExpiresAt(Instant.now().plusSeconds(300));
        when(tickets.findByTokenHash(any())).thenReturn(Optional.of(ticket));
        when(identities.findByProviderSubject(any())).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("member@example.com")).thenReturn(Optional.empty());

        assertTrue(social.preview("temporary-ticket").needsOrganization());
        assertThrows(ResponseStatusException.class, () -> social.exchange("temporary-ticket", ""));

        when(mongo.findAndRemove(any(), any(Class.class))).thenReturn(ticket);
        when(passwords.encode(any())).thenReturn("unusable-password-hash");
        when(users.save(any())).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId("user-1");
            return user;
        });
        Membership membership = new Membership();
        membership.setOrganizationId("org-1");
        membership.setUserId("user-1");
        membership.setRoles(Set.of(Role.Admin));
        when(organizations.createOrganization(any(), any())).thenReturn(membership);
        AuthController.Session session = new AuthController.Session("jwt", "user-1", "New Member",
                "member@example.com", "Admin", "org-1", Set.of(Role.Admin));
        when(auth.session(any(), any())).thenReturn(session);

        assertEquals("org-1", social.exchange("temporary-ticket", "My team").organizationId());
        verify(organizations).createOrganization(any(), org.mockito.Mockito.eq("My team"));
        verify(identities).save(any());
        var saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertTrue(saved.getValue().getName().matches("member_[0-9a-f]{6}"));
    }

    @Test
    void verifiedEmailSignsIntoExistingOrganizationWithoutCreatingAnother() {
        SocialLoginTicket ticket = new SocialLoginTicket();
        ticket.setProvider("github");
        ticket.setSubject("12345");
        ticket.setEmail("member@example.com");
        ticket.setExpiresAt(Instant.now().plusSeconds(300));
        User user = new User();
        user.setId("user-1");
        Membership membership = new Membership();
        membership.setOrganizationId("org-1");
        membership.setRoles(Set.of(Role.Developer));
        when(tickets.findByTokenHash(any())).thenReturn(Optional.of(ticket));
        when(identities.findByProviderSubject(any())).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(ticket.getEmail())).thenReturn(Optional.of(user));
        when(organizations.membershipsFor(user.getId())).thenReturn(java.util.List.of(membership));
        when(mongo.findAndRemove(any(), any(Class.class))).thenReturn(ticket);
        when(auth.session(user, membership)).thenReturn(new AuthController.Session("jwt", user.getId(),
                "Member", ticket.getEmail(), "Developer", "org-1", Set.of(Role.Developer)));

        assertEquals("org-1", social.exchange("temporary-ticket", null).organizationId());
        verify(organizations, never()).createOrganization(any(), any());
        verify(identities).save(any());
    }

    @Test
    void invitationRequiresTheProvidersVerifiedEmailToMatch() {
        SocialLoginTicket ticket = new SocialLoginTicket();
        ticket.setProvider("google");
        ticket.setSubject("google-user-1");
        ticket.setEmail("wrong@example.com");
        ticket.setInvitationToken("invite-token");
        ticket.setExpiresAt(Instant.now().plusSeconds(300));
        when(tickets.findByTokenHash(any())).thenReturn(Optional.of(ticket));
        when(organizations.preview("invite-token")).thenReturn(new OrganizationService.InvitationView(
                "invited@example.com", "Invited team", Set.of(Role.Developer), false, Set.of(), null));

        assertThrows(ResponseStatusException.class, () -> social.exchange("temporary-ticket", null));
        verify(mongo, never()).findAndRemove(any(), any(Class.class));
    }
}
