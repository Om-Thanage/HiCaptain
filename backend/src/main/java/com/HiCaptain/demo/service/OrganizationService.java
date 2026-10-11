package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.util.Role;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganizationService {
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final InvitationRepository invitations;
    private final UserRepository users;
    private final JavaMailSender mail;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.mail.from}") private String mailFrom;
    @Value("${app.frontend-url}") private String frontendUrl;

    public OrganizationService(OrganizationRepository organizations, MembershipRepository memberships,
            InvitationRepository invitations, UserRepository users, JavaMailSender mail) {
        this.organizations = organizations;
        this.memberships = memberships;
        this.invitations = invitations;
        this.users = users;
        this.mail = mail;
    }

    public Membership createOrganization(User user, String name) {
        if (name == null || name.isBlank()) throw badRequest("Organization name is required");
        Organization org = new Organization();
        org.setName(name.trim());
        org.setOwnerUserId(user.getId());
        org = organizations.save(org);
        Membership membership = new Membership();
        membership.setOrganizationId(org.getId());
        membership.setUserId(user.getId());
        membership.setRoles(Set.of(Role.Admin));
        try {
            return memberships.save(membership);
        } catch (RuntimeException failure) {
            organizations.deleteById(org.getId());
            throw failure;
        }
    }

    public List<Membership> membershipsFor(String userId) { return memberships.findByUserId(userId); }

    public Membership membership(String orgId, String userId) {
        return memberships.findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this organization"));
    }

    public String currentUserId() { return SecurityContextHolder.getContext().getAuthentication().getName(); }

    public String currentOrgId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken token)
                || !(token.getDetails() instanceof String id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return id;
    }

    public Organization organization(String id) {
        return organizations.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
    }

    public List<MemberView> members(String orgId) {
        membership(orgId, currentUserId());
        return memberships.findByOrganizationId(orgId).stream().map(m -> {
            User u = users.findById(m.getUserId()).orElse(null);
            return u == null ? null : new MemberView(u.getId(), u.getName(), u.getEmail(),
                    m.getRoles().stream().min(Comparator.comparingInt(Enum::ordinal)).orElseThrow(), m.getRoles(),
                    u.getTaskIds() == null ? List.of() : u.getTaskIds());
        }).filter(Objects::nonNull).toList();
    }

    public InvitationView invite(String orgId, String email, Set<Role> roles) {
        Membership actor = membership(orgId, currentUserId());
        if (!actor.getRoles().contains(Role.Admin)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (email == null || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw badRequest("Valid email is required");
        if (roles == null || roles.isEmpty()) throw badRequest("Choose at least one role");
        email = email.trim().toLowerCase(Locale.ROOT);
        Organization org = organization(orgId);
        Optional<User> existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            Membership target = memberships.findByOrganizationIdAndUserId(orgId, existing.get().getId()).orElseGet(() -> {
                Membership m = new Membership();
                m.setOrganizationId(orgId);
                m.setUserId(existing.get().getId());
                m.setRoles(new HashSet<>());
                return m;
            });
            Set<Role> combined = new HashSet<>(target.getRoles());
            combined.addAll(roles);
            send(email, "You have joined " + org.getName(), "You have been added to " + org.getName() + " on HiCaptain. Sign in at " + frontendUrl + "/auth?mode=login");
            target.setRoles(combined);
            memberships.save(target);
            return new InvitationView(email, org.getName(), combined, true);
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Invitation invite = new Invitation();
        invite.setOrganizationId(orgId);
        invite.setEmail(email);
        invite.setRoles(new HashSet<>(roles));
        invite.setTokenHash(hash(token));
        invite.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        invitations.save(invite);
        try {
            send(email, "Join " + org.getName() + " on HiCaptain", "You have been invited to " + org.getName() + ". Accept your invitation: " + frontendUrl + "/invite?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));
        } catch (RuntimeException ex) {
            invitations.delete(invite);
            throw ex;
        }
        return new InvitationView(email, org.getName(), roles, false);
    }

    public InvitationView preview(String token) {
        Invitation i = validInvitation(token);
        return new InvitationView(i.getEmail(), organization(i.getOrganizationId()).getName(), i.getRoles(), false);
    }

    public Membership accept(String token, User user) {
        Invitation i = validInvitation(token);
        if (!i.getEmail().equalsIgnoreCase(user.getEmail())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invitation email does not match");
        Membership m = memberships.findByOrganizationIdAndUserId(i.getOrganizationId(), user.getId()).orElseGet(() -> {
            Membership value = new Membership();
            value.setOrganizationId(i.getOrganizationId());
            value.setUserId(user.getId());
            value.setRoles(new HashSet<>());
            return value;
        });
        Set<Role> combined = new HashSet<>(m.getRoles());
        combined.addAll(i.getRoles());
        m.setRoles(combined);
        m = memberships.save(m);
        i.setAcceptedAt(Instant.now());
        invitations.save(i);
        return m;
    }

    public Membership setRoles(String orgId, String userId, Set<Role> roles) {
        Membership actor = membership(orgId, currentUserId());
        if (!actor.getRoles().contains(Role.Admin)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (roles == null || roles.isEmpty()) throw badRequest("Choose at least one role");
        if (organization(orgId).getOwnerUserId().equals(userId) && !roles.contains(Role.Admin)) throw badRequest("The organization owner must remain an Admin");
        Membership target = membership(orgId, userId);
        target.setRoles(new HashSet<>(roles));
        return memberships.save(target);
    }

    public void removeMember(String orgId, String userId) {
        Membership actor = membership(orgId, currentUserId());
        if (!actor.getRoles().contains(Role.Admin)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (organization(orgId).getOwnerUserId().equals(userId)) throw badRequest("The organization owner cannot be removed");
        memberships.delete(membership(orgId, userId));
    }

    private Invitation validInvitation(String token) {
        if (token == null || token.isBlank()) throw badRequest("Invitation token is required");
        Invitation i = invitations.findByTokenHash(hash(token)).orElseThrow(() -> badRequest("Invitation is invalid"));
        if (i.getAcceptedAt() != null || i.getExpiresAt().isBefore(Instant.now())) throw badRequest("Invitation has expired or was used");
        return i;
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private void send(String to, String subject, String body) {
        if (mailFrom.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP_FROM is not configured");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mail.send(message);
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    public record MemberView(String id, String name, String email, Role role, Set<Role> roles, List<String> taskIds) {}
    public record InvitationView(String email, String organizationName, Set<Role> roles, boolean added) {}
}
